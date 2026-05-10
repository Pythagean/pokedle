#!/usr/bin/env python3
"""
Summarize card_manifest.json into a CSV with per-Pokemon file counts.

Usage:
    python summarize_card_manifest.py --input-json ./card_manifest.json --output-csv ./card_summary.csv
    python summarize_card_manifest.py --input-json ./card_manifest.json --output-csv ./card_summary.csv --pokemon-data ./pokemon_data.json
"""

import argparse
import csv
import json
from pathlib import Path


def load_name_map(pokemon_data_path):
    """Build a dict of id -> name from pokemon_data.json"""
    with open(pokemon_data_path, encoding='utf-8') as f:
        data = json.load(f)
    return {str(entry['id']): entry['name'] for entry in data}


def main():
    parser = argparse.ArgumentParser(
        description='Summarize card manifest into a CSV with file counts per Pokemon'
    )
    parser.add_argument('--input-json', required=True, help='Path to card_manifest.json')
    parser.add_argument('--output-csv', required=True, help='Path for the output CSV file')
    parser.add_argument('--pokemon-data', help='Optional path to pokemon_data.json for name lookup')

    args = parser.parse_args()

    with open(args.input_json, encoding='utf-8') as f:
        manifest = json.load(f)

    name_map = {}
    if args.pokemon_data:
        name_map = load_name_map(args.pokemon_data)

    # Collect all pokemon IDs across all categories
    all_ids = set()
    for category_data in manifest.values():
        all_ids.update(category_data.keys())

    # Sort numerically where possible
    all_ids = sorted(all_ids, key=lambda x: (0, int(x)) if x.isdigit() else (1, x))

    columns = ['pokemon_id', 'pokemon_name', 'normal', 'shiny_regular', 'shiny_full', 'full_art', 'special']

    output_path = Path(args.output_csv)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()

        for pokemon_id in all_ids:
            row = {
                'pokemon_id': pokemon_id,
                'pokemon_name': name_map.get(pokemon_id, ''),
                'normal': len(manifest.get('normal', {}).get(pokemon_id, [])),
                'shiny_regular': len(manifest.get('shiny', {}).get(pokemon_id, {}).get('regular', [])),
                'shiny_full': len(manifest.get('shiny', {}).get(pokemon_id, {}).get('full', [])),
                'full_art': len(manifest.get('full_art', {}).get(pokemon_id, [])),
                'special': len(manifest.get('special', {}).get(pokemon_id, [])),
            }
            writer.writerow(row)

    print(f"CSV written to: {output_path}")
    print(f"Total Pokemon IDs: {len(all_ids)}")
    return 0


if __name__ == '__main__':
    exit(main())
