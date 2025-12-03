#!/usr/bin/env python3
"""Filter `location_area_encounters` for each Pokemon by its generation.

Reads a Pokemon JSON array (like `public/data/pokemon_data.json`), and for each
entry inspects the `location_area_encounters` list. Only locations that match
the Pokemon's `generation` (by simple substring keyword matching) are kept.

This is heuristic-based; provide a `--location-to-region` JSON file to supply
explicit substring->region mappings for edge cases.

Usage:
  python scripts/filter_locations_by_generation.py --input-json public/data/pokemon_data.json --output-json public/data/pokemon_data_filtered.json --allow-unknown

Options:
  --input-json         Path to input JSON (required)
  --output-json        Path to write filtered JSON (required)
  --location-to-region Optional JSON mapping file with keys being substrings
                       to match (case-insensitive) and values being region names
                       e.g. {"lake of rage": "johto"}
  --allow-unknown      If set, locations that don't map to any region are kept
                       (default: dropped)
  --verbose            Print progress and summary
  --report-json        Optional path to write a summary report JSON

"""

import argparse
import json
import os
import sys
from collections import defaultdict


DEFAULT_GEN_REGIONS = {
    1: ["kanto"],
    2: ["johto", "kanto"],
    3: ["hoenn"],
    4: ["sinnoh"],
    5: ["unova"],
    6: ["kalos"],
    7: ["alola"],
    8: ["galar"],
    9: ["paldea", "scarlet", "violet"],
}


def load_location_map(path):
    if not path:
        return {}
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
            # normalize keys to lowercase
            return {k.lower(): v.lower() for k, v in data.items()}
    except Exception as e:
        print(f"Failed to load location-to-region map {path}: {e}", file=sys.stderr)
        return {}


def detect_region_for_location(loc_str, explicit_map):
    s = loc_str.lower()
    # explicit map has substrings -> region
    for sub, region in explicit_map.items():
        if sub in s:
            return region
    # no explicit mapping found
    return None


def location_matches_generation(loc_str, gen, explicit_map):
    # Check explicit map first
    region = detect_region_for_location(loc_str, explicit_map)
    if region:
        return region in DEFAULT_GEN_REGIONS.get(gen, [])

    # Fallback heuristic: check for generation region keywords in the string
    s = loc_str.lower()
    gen_keywords = DEFAULT_GEN_REGIONS.get(gen, [])
    for kw in gen_keywords:
        if kw in s:
            return True

    # Not matched
    return False


def parse_args():
    p = argparse.ArgumentParser(description='Filter pokemon location entries by generation')
    p.add_argument('--input-json', required=True)
    p.add_argument('--output-json', required=True)
    p.add_argument('--location-to-region', help='Optional JSON mapping substr->region')
    p.add_argument('--missing-map-output', help='Optional path to write missing location->region map (keys -> empty string)')
    p.add_argument('--allow-unknown', action='store_true', help='Keep locations that do not map to any region')
    p.add_argument('--verbose', action='store_true')
    p.add_argument('--report-json', help='Optional path to write a summary report')
    return p.parse_args()


def main():
    args = parse_args()
    try:
        with open(args.input_json, encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to read input JSON {args.input_json}: {e}", file=sys.stderr)
        sys.exit(1)

    explicit_map = load_location_map(args.location_to_region)

    report = {
        'total_pokemon': len(data),
        'filtered': 0,
        'kept_locations_total': 0,
        'removed_locations_total': 0,
        'per_pokemon': {}
    }

    out_list = []
    missing_locs = set()
    for p in data:
        gen = p.get('generation')
        name = p.get('name')
        locs = p.get('location_area_encounters') or []
        kept = []
        removed = []
        for loc in locs:
            # Check explicit map first so we can record truly-unknown locations
            mapped_region = detect_region_for_location(loc, explicit_map)
            matched = False
            if mapped_region:
                matched = mapped_region in DEFAULT_GEN_REGIONS.get(gen, [])
            else:
                # Fallback heuristic
                s = loc.lower()
                for kw in DEFAULT_GEN_REGIONS.get(gen, []):
                    if kw in s:
                        matched = True
                        break
                if not matched:
                    # Record this location for potential mapping by the user
                    missing_locs.add(s)

            if matched:
                kept.append(loc)
            else:
                # if unknown but allow_unknown True, keep
                if args.allow_unknown:
                    kept.append(loc)
                else:
                    removed.append(loc)

        # save counts
        report['per_pokemon'][name] = {'id': p.get('id'), 'original': len(locs), 'kept': len(kept), 'removed': len(removed)}
        report['kept_locations_total'] += len(kept)
        report['removed_locations_total'] += len(removed)

        # replace the locations with filtered ones
        new_p = dict(p)
        new_p['location_area_encounters'] = kept
        out_list.append(new_p)

    # write output
    try:
        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(out_list, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Failed to write output JSON {args.output_json}: {e}", file=sys.stderr)
        sys.exit(1)

    if args.report_json:
        try:
            with open(args.report_json, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Failed to write report JSON {args.report_json}: {e}", file=sys.stderr)

    # Write missing-location map so user can fill in regions for unknown locations
    if args.missing_map_output:
        # Exclude any locations already present in explicit_map
        to_write = {loc: "" for loc in sorted(missing_locs) if loc not in explicit_map}
        try:
            with open(args.missing_map_output, 'w', encoding='utf-8') as f:
                json.dump(to_write, f, ensure_ascii=False, indent=2)
            if args.verbose:
                print(f"Wrote {len(to_write)} missing locations to {args.missing_map_output}")
        except Exception as e:
            print(f"Failed to write missing map {args.missing_map_output}: {e}", file=sys.stderr)

    if args.verbose:
        kept_total = report['kept_locations_total']
        removed_total = report['removed_locations_total']
        print(f"Done. Kept {kept_total} locations; removed {removed_total} locations across {report['total_pokemon']} pokemon.")


if __name__ == '__main__':
    main()
