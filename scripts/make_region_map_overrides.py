#!/usr/bin/env python3
"""
Create a region map overrides template from `region_map_failed.json`.

Usage:
  python scripts/make_region_map_overrides.py --failed ./scripts/region_map_failed.json --out ./scripts/region_map_overrides.json

This script will read the failed JSON file (mapping location -> reason) and
produce an overrides file containing the same location keys with empty string
values ready for you to fill with either a Region name (e.g. "Kanto") or a
full Bulbapedia prefix (e.g. "Kanto_Pewter_City_Map") depending on how you
prefer to specify the mapping. The downloader will treat a value without an
underscored "_" as a Region name (same behavior as before).

After you fill the overrides file you can either merge keys into your
`region_map.json` or pass the overrides file to the downloader using
`--region-map`.

"""
import argparse
import json
import os
import sys


def main():
    p = argparse.ArgumentParser(description='Create region_map_overrides.json from region_map_failed.json')
    p.add_argument('--failed', default=os.path.join(os.path.dirname(__file__), 'region_map_failed.json'), help='Path to region_map_failed.json')
    p.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'region_map_overrides.json'), help='Output overrides JSON path')
    args = p.parse_args()

    if not os.path.exists(args.failed):
        print('Failed file not found:', args.failed)
        sys.exit(2)

    with open(args.failed, 'r', encoding='utf-8') as fh:
        failed = json.load(fh) or {}

    # Load existing overrides if any
    existing = {}
    if os.path.exists(args.out):
        try:
            with open(args.out, 'r', encoding='utf-8') as of:
                existing = json.load(of) or {}
        except Exception:
            existing = {}

    # Prepare overrides: keep existing values, otherwise set to empty string
    overrides = {}
    for k in sorted(failed.keys()):
        if k in existing:
            overrides[k] = existing[k]
        else:
            overrides[k] = ""

    with open(args.out, 'w', encoding='utf-8') as of:
        json.dump(overrides, of, indent=2, ensure_ascii=False)

    print(f'Wrote {len(overrides)} override entries to {args.out}')
    print('Fill the values with a Region name (e.g. "Kanto") or a page prefix (e.g. "Kanto_Pewter_City_Map").')


if __name__ == '__main__':
    main()
