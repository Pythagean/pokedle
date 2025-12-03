#!/usr/bin/env python3
"""Fetch level-up moves from PokeAPI and add them to pokemon_data.json entries.

Usage:
  python scripts/get_moves_from_pokeapi.py --input-json public/data/pokemon_data.json --output-json scripts/pokemon_with_moves.json

The script queries `https://pokeapi.co/api/v2/pokemon/{id}` for each Pokemon id
found in the input JSON and extracts moves whose `version_group_details`
include a `version_group` of one of: "firered-leafgreen", "emerald", "ruby-sapphire"
and whose `move_learn_method` is "level-up".

Output: writes the same array of pokemon objects to `--output-json` but with a
new `moves` key for each entry, e.g.
  "moves": [ {"name": "Vine Whip", "level_learned_at": 4}, ... ]

Requires: `requests` (pip install requests)
"""

from __future__ import annotations
import argparse
import json
import time
import requests
import os
import sys
import tempfile
from typing import List, Dict


ALLOWED_VERSION_GROUPS = {"firered-leafgreen", "emerald", "ruby-sapphire"}
ALLOWED_LEARN_METHOD = "level-up"


def prettify_move_name(raw: str) -> str:
    # Replace hyphens with spaces and title-case words, but keep special cases
    return raw.replace('-', ' ').replace('_', ' ').title()


def fetch_pokemon(api_id: int, session: requests.Session, retries: int = 3, timeout: float = 10.0):
    url = f"https://pokeapi.co/api/v2/pokemon/{api_id}"
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt == retries:
                raise
            time.sleep(1.0 * attempt)


def write_output_atomic(data, path: str, verbose: bool = False):
    # Ensure parent dir exists
    parent = os.path.dirname(os.path.abspath(path))
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)
    # Write to a temp file then atomically replace
    fd, tmp = tempfile.mkstemp(prefix='tmp_moves_', dir=parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
        os.replace(tmp, path)
        if verbose:
            print(f"Wrote (atomic) {path}")
    except Exception:
        # cleanup temp file if something went wrong
        try:
            os.unlink(tmp)
        except Exception:
            pass
        raise


def extract_level_up_moves(poke_json: Dict) -> List[Dict]:
    out = {}
    moves = poke_json.get('moves') or []
    for m in moves:
        move_info = m.get('move') or {}
        move_name_raw = move_info.get('name')
        if not move_name_raw:
            continue
        # Examine version_group_details to find matching entries
        for vgd in (m.get('version_group_details') or []):
            vg = vgd.get('version_group') or {}
            vg_name = vg.get('name')
            method = (vgd.get('move_learn_method') or {}).get('name')
            level = vgd.get('level_learned_at', 0)
            if vg_name in ALLOWED_VERSION_GROUPS and method == ALLOWED_LEARN_METHOD:
                # keep the minimum non-negative level (0 allowed)
                key = move_name_raw
                prev = out.get(key)
                if prev is None or (isinstance(level, int) and (prev.get('level_learned_at', 9999) > level)):
                    out[key] = {'name': prettify_move_name(move_name_raw), 'level_learned_at': int(level)}
    # Return as sorted list by level then name
    res = sorted(out.values(), key=lambda x: (x.get('level_learned_at', 9999), x.get('name', '')))
    return res


def main(argv=None):
    p = argparse.ArgumentParser(description='Add level-up moves from PokeAPI to pokemon data')
    p.add_argument('--input-json', default='public/data/pokemon_data.json')
    p.add_argument('--output-json', required=True)
    p.add_argument('--start-id', type=int, help='Optional start id to process (inclusive)')
    p.add_argument('--end-id', type=int, help='Optional end id to process (inclusive)')
    p.add_argument('--save-every', type=int, default=0, help='Save intermediate output every N entries (0 disables)')
    p.add_argument('--delay', type=float, default=0.5, help='Delay between API requests (seconds)')
    p.add_argument('--verbose', action='store_true')
    args = p.parse_args(argv)

    with open(args.input_json, encoding='utf-8') as fh:
        data = json.load(fh)

    session = requests.Session()

    total = len(data)
    try:
        for idx, entry in enumerate(data, start=1):
            try:
                poke_id = entry.get('id')
                if poke_id is None:
                    if args.verbose:
                        print(f"Skipping entry without id at index {idx}")
                    entry['moves'] = []
                    continue
                if args.start_id and poke_id < args.start_id:
                    entry['moves'] = []
                    continue
                if args.end_id and poke_id > args.end_id:
                    entry['moves'] = []
                    continue

                if args.verbose:
                    print(f"[{idx}/{total}] Fetching moves for id={poke_id}...")
                pj = fetch_pokemon(int(poke_id), session)
                moves = extract_level_up_moves(pj)
                entry['moves'] = moves
            except Exception as e:
                # On error, set empty moves and continue
                entry['moves'] = []
                if args.verbose:
                    print(f"  Error fetching id={entry.get('id')}: {e}")
            finally:
                # polite delay to avoid hammering the API
                time.sleep(max(0.0, float(args.delay)))

            # optional periodic save
            if args.save_every and (idx % args.save_every == 0):
                if args.verbose:
                    print(f"Saving intermediate output after {idx} entries...")
                write_output_atomic(data, args.output_json, verbose=args.verbose)
    except KeyboardInterrupt:
        # Write partial progress on interrupt
        if args.verbose:
            print('\nInterrupted by user; writing partial output...')
        try:
            write_output_atomic(data, args.output_json, verbose=args.verbose)
            if args.verbose:
                print(f"Partial output written to {args.output_json}")
        except Exception as e:
            print(f"Failed to write partial output: {e}", file=sys.stderr)
        sys.exit(1)

    # Final write output JSON (atomic)
    write_output_atomic(data, args.output_json, verbose=args.verbose)
    print(f"Wrote augmented data with moves to {args.output_json}")


if __name__ == '__main__':
    main()
