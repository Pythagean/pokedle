#!/usr/bin/env python3
"""
Simple script to deduplicate location entries inside each Pokemon object.

Usage:
  python scripts/dedupe_location_entries.py --input-json <in> --output-json <out>

This will load the input JSON (array of Pokemon objects), and for each Pokemon
it will deduplicate the `location_area_encounters` and
`preevolution_location_area_encounters` arrays by `name` (case-insensitive),
keeping the first occurrence and preserving order. The full JSON is written to
the output path.
"""
import argparse
import json
import sys
from typing import Dict, List, Any


def dedupe_by_name(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return a new list with duplicates (by name, case-insensitive) removed.
    Keeps the first occurrence and preserves order.
    """
    if not isinstance(items, list):
        return items
    seen = set()
    out = []
    for it in items:
        if not isinstance(it, dict):
            # preserve non-dict entries as-is
            out.append(it)
            continue
        name = it.get('name')
        if not name:
            # keep items without name
            out.append(it)
            continue
        key = name.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


def main():
    parser = argparse.ArgumentParser(description='Dedupe pokemon location entries')
    parser.add_argument('--input-json', required=True, help='Input JSON file (array of pokemon)')
    parser.add_argument('--output-json', required=True, help='Output JSON file to write')
    args = parser.parse_args()

    try:
        with open(args.input_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f'Error: input file not found: {args.input_json}', file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f'Error: invalid JSON in input file: {e}', file=sys.stderr)
        sys.exit(1)

    if not isinstance(data, list):
        print('Error: input JSON must be an array of pokemon objects', file=sys.stderr)
        sys.exit(1)

    for i, p in enumerate(data):
        if not isinstance(p, dict):
            continue
        # Deduplicate location_area_encounters
        if 'location_area_encounters' in p:
            try:
                p['location_area_encounters'] = dedupe_by_name(p.get('location_area_encounters') or [])
            except Exception:
                # leave as-is on error
                pass
        # Deduplicate preevolution_location_area_encounters
        if 'preevolution_location_area_encounters' in p:
            try:
                p['preevolution_location_area_encounters'] = dedupe_by_name(p.get('preevolution_location_area_encounters') or [])
            except Exception:
                pass

    try:
        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except IOError as e:
        print(f'Error writing output file: {e}', file=sys.stderr)
        sys.exit(1)

    print(f'Wrote deduped output to: {args.output_json}')


if __name__ == '__main__':
    main()
