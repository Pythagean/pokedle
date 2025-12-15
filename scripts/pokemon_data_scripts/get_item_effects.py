#!/usr/bin/env python3
"""Fetch items and their English short_effect/flavor text from PokeAPI for items referenced
in a local JSON of pokemon data.

This mirrors `scripts/get_ability_effects.py` but collects unique items referenced by
the input JSON (common place is a `held_items` array). For each item discovered the script:
 - Fetches the item JSON from PokeAPI (via URL if present or by name/id)
 - Extracts an English short description (prefer `flavor_text_entries`, fall back to
   `effect_entries.short_effect`)
 - Caches item fetches to avoid duplicate requests
 - Writes per-item JSON files into `--output-dir/items/` and a combined
   `items_by_name.json` mapping

Usage:
  python scripts/get_item_effects.py --input-json public/data/pokemon_data.json --output-dir ./out --partial 20 --verbose

Flags:
  --input-json  Path to input pokemon JSON (default: public/data/pokemon_data.json)
  --output-dir  Directory to write results (required)
  --partial     Process only the first N pokemon (others ignored)
  --verbose     Print progress

Requires: requests
"""

from __future__ import annotations
import argparse
import json
import os
import time
from typing import Dict, Any, Set, Tuple
import re
import requests


def fetch_json(session: requests.Session, url: str, retries: int = 3, timeout: float = 10.0):
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception:
            if attempt == retries:
                raise
            time.sleep(0.5 * attempt)


def get_english_item_text(item_json: Dict[str, Any]) -> str | None:
    # Prefer the English flavor_text from flavor_text_entries
    for entry in item_json.get('flavor_text_entries', []):
        lang = entry.get('language') or {}
        if lang.get('name') == 'en':
            return entry.get('text') or entry.get('flavor_text')
    # Fallback: try effect_entries.short_effect if flavor_text isn't present
    for entry in item_json.get('effect_entries', []):
        lang = entry.get('language') or {}
        if lang.get('name') == 'en':
            return entry.get('short_effect') or entry.get('effect')
    return None


def extract_items_from_entry(entry: Dict[str, Any]) -> Set[Tuple[str, str]]:
    """Return a set of (name_or_url, source_type) tuples discovered in a pokemon entry.
    source_type is 'url' or 'name' to indicate how to fetch the item later.
    The function is conservative: it looks for common structures but will accept simple strings.
    """
    items: Set[Tuple[str, str]] = set()
    hi = entry.get('held_items') or entry.get('held_item') or []
    if isinstance(hi, dict):
        hi = [hi]
    if isinstance(hi, list):
        for h in hi:
            # Common PokeAPI structure: { item: { name, url }, version_details: [...] }
            if isinstance(h, dict):
                it = h.get('item') or h.get('held_item') or None
                if isinstance(it, dict):
                    name = it.get('name')
                    url = it.get('url')
                    if url:
                        items.add((url, 'url'))
                    elif name:
                        items.add((name, 'name'))
                    continue
                # Sometimes entry may directly be an item name or slug
                name_field = h.get('name') if 'name' in h else None
                if isinstance(name_field, str):
                    items.add((name_field, 'name'))
                    continue
            # If element is just a string, treat as name
            if isinstance(h, str) and h:
                items.add((h, 'name'))
    return items


def main(argv=None):
    p = argparse.ArgumentParser(description='Fetch item texts from PokeAPI for local pokemon data')
    p.add_argument('--input-json', default='public/data/pokemon_data.json')
    p.add_argument('--output-dir', required=True, help='Directory to write results')
    p.add_argument('--output-json', help='Path to write augmented pokemon JSON (held_items replaced)')
    p.add_argument('--partial', type=int, help='Process only the first N pokemon (others ignored)')
    p.add_argument('--verbose', action='store_true')
    args = p.parse_args(argv)

    with open(args.input_json, encoding='utf-8') as fh:
        data = json.load(fh)

    session = requests.Session()
    item_cache: Dict[str, Dict[str, Any] | None] = {}

    total = len(data)
    limit = args.partial if args.partial and args.partial > 0 else total

    # First pass: for each pokemon we will process, fetch the pokemon endpoint
    # to retrieve canonical held-item URLs. Fall back to local held_items if
    # the pokemon fetch fails or the entry lacks an id.
    unique_items: Set[Tuple[str, str]] = set()
    for idx, entry in enumerate(data, start=1):
        if idx > limit:
            break
        poke_id = entry.get('id')
        fetched = False
        if poke_id is not None:
            poke_url = f"https://pokeapi.co/api/v2/pokemon/{poke_id}"
            try:
                if args.verbose:
                    print(f"[{idx}/{min(limit, total)}] Fetching pokemon -> {poke_url}")
                pj = fetch_json(session, poke_url)
                # pj.held_items is usually an array of { item: {name,url}, version_details: [...] }
                for h in pj.get('held_items', []) or []:
                    if isinstance(h, dict):
                        it = h.get('item') or None
                        if isinstance(it, dict):
                            url = it.get('url')
                            name = it.get('name')
                            if url:
                                unique_items.add((url, 'url'))
                            elif name:
                                unique_items.add((name, 'name'))
                            continue
                        # If structure unexpected, try to extract name field
                        name_field = h.get('name') if isinstance(h, dict) and 'name' in h else None
                        if isinstance(name_field, str):
                            unique_items.add((name_field, 'name'))
                    elif isinstance(h, str):
                        unique_items.add((h, 'name'))
                fetched = True
            except Exception as e:
                if args.verbose:
                    print(f"  Warning: failed to fetch pokemon/{poke_id}: {e}")
            finally:
                # polite pause between pokemon requests
                time.sleep(0.15)

        if not fetched:
            # fallback to local data parsing
            found = extract_items_from_entry(entry)
            unique_items.update(found)

    if args.verbose:
        print(f"Discovered {len(unique_items)} unique item references from {min(limit, total)} pokemon entries")

    # Prepare output dirs
    out_dir = args.output_dir
    item_dir = os.path.join(out_dir, 'items')
    os.makedirs(item_dir, exist_ok=True)

    items_by_name: Dict[str, Dict[str, Any]] = {}

    for idx, (identifier, id_type) in enumerate(sorted(unique_items), start=1):
        try:
            if id_type == 'url':
                url = identifier
            else:
                # treat identifier as name or numeric id; use item endpoint by name/id
                url = f"https://pokeapi.co/api/v2/item/{identifier}"

            if url in item_cache:
                item_json = item_cache[url]
            else:
                if args.verbose:
                    print(f"[{idx}/{len(unique_items)}] Fetching item -> {url}")
                try:
                    item_json = fetch_json(session, url)
                except Exception as e:
                    if args.verbose:
                        print(f"  Error fetching {url}: {e}")
                    item_json = None
                item_cache[url] = item_json
                # Be polite
                time.sleep(0.15)

            if not item_json:
                continue

            # Extract a human-friendly English text for the item
            text = get_english_item_text(item_json)
            # Clean effect text: replace newlines with spaces and collapse whitespace
            if isinstance(text, str):
                cleaned_text = re.sub(r"\s+", " ", text.replace('\r', ' ').replace('\n', ' ')).strip()
            else:
                cleaned_text = None

            # Determine canonical name and a human-friendly display name
            name = item_json.get('name') or identifier
            display_name = re.sub(r"[-_]+", " ", str(name)).strip().title()

            # Write per-item JSON (include cleaned effect text and display name)
            safe_name = name.replace('/', '_')
            per_path = os.path.join(item_dir, f"{safe_name}.json")
            to_write = dict(item_json)
            to_write['_fetched_effect_text'] = cleaned_text
            to_write['_display_name'] = display_name
            with open(per_path, 'w', encoding='utf-8') as pf:
                json.dump(to_write, pf, indent=2, ensure_ascii=False)

            # Use the original slug as the map key, but set the stored 'name' to a human-friendly form
            items_by_name[name] = {
                'name': display_name,
                'effect': cleaned_text,
            }

        except Exception as e:
            if args.verbose:
                print(f"  Unexpected error processing {identifier}: {e}")
            continue

    # Write combined mapping
    out_path = os.path.join(out_dir, 'items_by_name.json')
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as of:
        json.dump(items_by_name, of, indent=2, ensure_ascii=False)

    if args.verbose:
        print(f"Wrote {len(items_by_name)} items to {out_path}")

    # If requested, produce an augmented copy of the input pokemon JSON
    if args.output_json:
        new_data = []
        for idx, entry in enumerate(data, start=1):
            # If partial specified and we've passed the limit, copy entries unchanged
            if idx > limit:
                new_data.append(entry)
                continue

            poke_id = entry.get('id')
            held_list = []
            fetched = False
            # Try to fetch pokemon endpoint to get canonical held_items
            if poke_id is not None:
                poke_url = f"https://pokeapi.co/api/v2/pokemon/{poke_id}"
                try:
                    if args.verbose:
                        print(f"[{idx}/{min(limit, total)}] Fetching pokemon for output -> {poke_url}")
                    pj = fetch_json(session, poke_url)
                    for h in pj.get('held_items', []) or []:
                        slug = None
                        if isinstance(h, dict):
                            it = h.get('item')
                            if isinstance(it, dict):
                                slug = it.get('name')
                            elif isinstance(it, str):
                                slug = it
                        elif isinstance(h, str):
                            slug = h
                        if slug:
                            info = items_by_name.get(slug) or {}
                            held_list.append({
                                'name': slug,
                                'display_name': info.get('name') or re.sub(r"[-_]+", " ", slug).title(),
                                'effect': info.get('effect') if isinstance(info.get('effect'), str) else None,
                            })
                    fetched = True
                except Exception as e:
                    if args.verbose:
                        print(f"  Warning: failed to fetch pokemon/{poke_id} for output: {e}")
                finally:
                    time.sleep(0.12)

            if not fetched:
                # fallback to local held_items parsing
                found = extract_items_from_entry(entry)
                for identifier, id_type in sorted(found):
                    # Resolve item slug via cache or by constructing URL
                    try:
                        if id_type == 'url':
                            item_json = item_cache.get(identifier)
                            if not item_json:
                                item_json = fetch_json(session, identifier)
                                item_cache[identifier] = item_json
                        else:
                            url = f"https://pokeapi.co/api/v2/item/{identifier}"
                            item_json = item_cache.get(url)
                            if not item_json:
                                try:
                                    item_json = fetch_json(session, url)
                                except Exception:
                                    item_json = None
                                item_cache[url] = item_json
                        slug = item_json.get('name') if item_json else identifier
                    except Exception:
                        slug = identifier
                    info = items_by_name.get(slug) or {}
                    held_list.append({
                        'name': slug,
                        'display_name': info.get('name') or re.sub(r"[-_]+", " ", str(slug)).title(),
                        'effect': info.get('effect') if isinstance(info.get('effect'), str) else None,
                    })

            new_entry = dict(entry)
            new_entry['held_items'] = held_list
            new_data.append(new_entry)

        # write augmented output JSON
        out_json_path = args.output_json
        out_json_dir = os.path.dirname(out_json_path)
        if out_json_dir:
            os.makedirs(out_json_dir, exist_ok=True)
        with open(out_json_path, 'w', encoding='utf-8') as outf:
            json.dump(new_data, outf, indent=2, ensure_ascii=False)
        if args.verbose:
            print(f"Wrote augmented pokemon JSON with replaced held_items to {out_json_path}")


if __name__ == '__main__':
    main()
