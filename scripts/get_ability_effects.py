#!/usr/bin/env python3
"""Fetch abilities and their English short_effect from PokeAPI for Pokemon in a local JSON.

For each Pokemon in the input JSON (expects entries with an `id` and optionally `name` and `generation`),
this script will:
 - Optionally check the Pokemon's generation (local `generation` field or by fetching species) is generation-i/ii/iii
 - Call `https://pokeapi.co/api/v2/pokemon/{id}` to get the list of abilities
 - For each ability, call the ability URL once (cached) and extract the English `short_effect` from `effect_entries`
 - Write per-pokemon JSON files into `--output-dir` and a combined `abilities_by_pokemon.json`

Usage:
  python scripts/get_ability_effects.py --input-json public/data/pokemon_data.json --output-dir ./out --partial 20 --verbose

Flags:
  --input-json  Path to input pokemon JSON (default: public/data/pokemon_data.json)
  --output-dir  Directory to write results (required)
  --partial     Process only the first N Pokemon (optional)
  --verbose     Print progress

Requires: requests
"""

from __future__ import annotations
import argparse
import json
import os
import time
from typing import Dict, Any
import requests


ALLOWED_GENERATIONS = {"generation-i", "generation-ii", "generation-iii"}


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


def get_english_flavor_text(ability_json: Dict[str, Any]) -> str | None:
    # Prefer the English flavor_text from flavor_text_entries
    for entry in ability_json.get('flavor_text_entries', []):
        lang = entry.get('language') or {}
        if lang.get('name') == 'en':
            # flavor_text often contains newlines or form feeds; return as-is
            return entry.get('flavor_text')
    # Fallback: try effect_entries.short_effect if flavor_text isn't present
    for entry in ability_json.get('effect_entries', []):
        lang = entry.get('language') or {}
        if lang.get('name') == 'en':
            return entry.get('short_effect')
    return None


def ensure_generation_allowed(pokemon_entry: Dict[str, Any], poke_id: int, session: requests.Session, verbose: bool) -> bool:
    # First try local data
    gen = pokemon_entry.get('generation')
    if isinstance(gen, dict) and gen.get('name') in ALLOWED_GENERATIONS:
        return True
    # Fallback: fetch species endpoint to determine generation
    species_url = f"https://pokeapi.co/api/v2/pokemon-species/{poke_id}"
    try:
        j = fetch_json(session, species_url)
        gen2 = j.get('generation') or {}
        name = gen2.get('name')
        if verbose:
            print(f"  species generation for id={poke_id}: {name}")
        return name in ALLOWED_GENERATIONS
    except Exception as e:
        if verbose:
            print(f"  Warning: failed to fetch species for id={poke_id}: {e}")
        # Be conservative: treat as not allowed
        return False


def main(argv=None):
    p = argparse.ArgumentParser(description='Fetch ability short_effects from PokeAPI for local pokemon data')
    p.add_argument('--input-json', default='public/data/pokemon_data.json')
    p.add_argument('--output-json', required=True, help='Path to write augmented JSON (replaces abilities in-place)')
    p.add_argument('--partial', type=int, help='Process only the first N pokemon (others copied unchanged)')
    p.add_argument('--verbose', action='store_true')
    args = p.parse_args(argv)

    with open(args.input_json, encoding='utf-8') as fh:
        data = json.load(fh)

    session = requests.Session()
    ability_cache: Dict[str, str | None] = {}

    total = len(data)
    limit = args.partial if args.partial and args.partial > 0 else total

    new_data = []
    for idx, entry in enumerate(data, start=1):
        # If partial is set and we've processed limit already, copy remaining entries unchanged
        if idx > limit:
            new_data.append(entry)
            continue

        poke_id = entry.get('id')
        poke_name = entry.get('name') or str(poke_id)
        if poke_id is None:
            if args.verbose:
                print(f"Skipping entry at index {idx} - no id")
            new_data.append(entry)
            continue

        if args.verbose:
            print(f"[{idx}/{limit}] Processing id={poke_id} name={poke_name}")

        # Ensure generation is within allowed set (local data or species endpoint)
        allowed = ensure_generation_allowed(entry, poke_id, session, args.verbose)
        if not allowed:
            if args.verbose:
                print(f"  Skipping id={poke_id} (generation not in first three)")
            new_entry = dict(entry)
            new_entry['abilities'] = []
            new_data.append(new_entry)
            continue

        # Fetch pokemon endpoint to get ability urls
        poke_url = f"https://pokeapi.co/api/v2/pokemon/{poke_id}"
        try:
            pj = fetch_json(session, poke_url)
        except Exception as e:
            if args.verbose:
                print(f"  Error fetching pokemon/{poke_id}: {e}")
            new_entry = dict(entry)
            new_entry['abilities'] = []
            new_data.append(new_entry)
            continue

        abilities = []
        for a in pj.get('abilities', []):
            abil = a.get('ability') or {}
            abil_name = abil.get('name')
            abil_url = abil.get('url')
            if not abil_url:
                continue
            if abil_url in ability_cache:
                effect = ability_cache[abil_url]
            else:
                try:
                    if args.verbose:
                        print(f"    Fetching ability {abil_name} -> {abil_url}")
                    aj = fetch_json(session, abil_url)
                    effect = get_english_flavor_text(aj)
                except Exception as e:
                    effect = None
                    if args.verbose:
                        print(f"    Error fetching ability url {abil_url}: {e}")
                ability_cache[abil_url] = effect
                time.sleep(0.2)

            abilities.append({'name': abil_name, 'effect': effect})

        new_entry = dict(entry)
        new_entry['abilities'] = abilities
        new_data.append(new_entry)

    # write augmented JSON (same structure as input, but with abilities normalized)
    out_path = args.output_json
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as cf:
        json.dump(new_data, cf, indent=2, ensure_ascii=False)

    if args.verbose:
        print(f"Wrote augmented data for {min(limit, total)} entries to {out_path}")


if __name__ == '__main__':
    main()
