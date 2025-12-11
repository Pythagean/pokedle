#!/usr/bin/env python3
"""
Export unique location names from a Pokémon data JSON file.

Usage:
  python scripts/export_locations_list.py --input-json public/data/pokemon_data.json --output-file public/data/locations_list.txt

This script reads the input JSON (an array of Pokémon objects), extracts
`location_area_encounters` entries (each entry may be an object with a
`name` field or a simple string), and writes a deduplicated newline-separated
list of names to the output file, preserving first-seen order.
"""

import argparse
import json
import sys
import os


def parse_args():
    p = argparse.ArgumentParser(description='Export unique location names from pokemon JSON')
    p.add_argument('--input-json', required=True, help='Path to input JSON file containing Pokémon data')
    p.add_argument('--output-file', required=True, help='Path to write newline-separated unique location names')
    p.add_argument('--maps-dir', required=False, default=r'D:\Github\pokedle_assets\maps', help='Local directory containing map PNGs (checked by slug)')
    return p.parse_args()


def main():
    args = parse_args()
    try:
        with open(args.input_json, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
    except Exception as e:
        print(f'Error reading input JSON "{args.input_json}": {e}', file=sys.stderr)
        sys.exit(2)

    seen_lower = set()
    ordered = []

    if not isinstance(data, list):
        print('Input JSON does not contain an array of Pokémon objects', file=sys.stderr)
        sys.exit(3)

    for p in data:
        if not isinstance(p, dict):
            continue
        locs = p.get('location_area_encounters') or []
        if not isinstance(locs, list):
            continue
        for loc in locs:
            name = ''
            if isinstance(loc, dict):
                # new structured format
                name = loc.get('name') or ''
            else:
                # legacy string format
                name = loc or ''
            if not isinstance(name, str):
                try:
                    name = str(name)
                except Exception:
                    continue
            name = name.strip()
            if not name:
                continue
            key = name.lower()
            if key in seen_lower:
                continue
            seen_lower.add(key)
            ordered.append(name)

    # If a maps directory is provided, only include locations which are missing a corresponding PNG
    maps_dir = args.maps_dir
    missing = []
    if maps_dir:
        for n in ordered:
            slug = n.replace(' ', '_')
            png_path = os.path.join(maps_dir, f"{slug}.png")
            if not os.path.exists(png_path):
                missing.append(n)
    else:
        missing = ordered

    try:
        with open(args.output_file, 'w', encoding='utf-8') as outfh:
            for n in missing:
                outfh.write(n + '\n')
    except Exception as e:
        print(f'Error writing output file "{args.output_file}": {e}', file=sys.stderr)
        sys.exit(4)

    print(f'Wrote {len(missing)} missing locations to {args.output_file} (maps-dir={maps_dir})')


if __name__ == '__main__':
    main()
