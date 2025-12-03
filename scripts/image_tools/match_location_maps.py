#!/usr/bin/env python3
"""
Match location names from `pokemon_data.json` to existing map files in a folder.

Usage:
  python scripts/match_location_maps.py --input-json public/data/pokemon_data.json --map-dir output/maps --output-json scripts/location_to_file_map.json

What it does:
- Reads `--input-json` and extracts unique location names (same heuristics as the downloader)
- Scans `--map-dir` for files with common image extensions (png, jpg, jpeg)
- Uses fuzzy matching (difflib.SequenceMatcher) to find the best filename for each location
- Writes an output JSON mapping: { "Location Name": "relative/path/to/file.png" }
- Prints a short summary listing locations that had no good match

Options:
  --threshold FLOAT   Minimum similarity (0..1) to accept a match (default 0.55)
  --recursive         Search `--map-dir` recursively (default off)
  --extensions LIST   Comma-separated extensions to consider (default: png,jpg,jpeg)

This script uses only Python standard library.
"""
import argparse
import json
import os
import re
import sys
from difflib import SequenceMatcher


def clean_name_for_compare(name: str) -> str:
    if not name:
        return ''
    s = name.strip().lower()
    # replace hyphens/underscores/spaces with single space
    s = re.sub(r"[-_]+", ' ', s)
    s = re.sub(r"\s+", ' ', s)
    # remove punctuation
    s = re.sub(r"[\/:#?%\\<>\|\"\.,()']", '', s)
    return s


def extract_location_name(item):
    if item is None:
        return None
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        la = item.get('location_area')
        if isinstance(la, dict) and la.get('name'):
            return la.get('name')
        if item.get('name'):
            return item.get('name')
        if item.get('location') and isinstance(item['location'], dict) and item['location'].get('name'):
            return item['location']['name']
    try:
        return str(item)
    except Exception:
        return None


def collect_locations_from_json(data):
    locations = set()
    for entry in data:
        locs = entry.get('location_area_encounters') or entry.get('location_area') or entry.get('encounters') or []
        if not isinstance(locs, list):
            if isinstance(locs, str) and locs.strip():
                locations.add(locs.strip())
            continue
        for item in locs:
            name = extract_location_name(item)
            if not name:
                continue
            # convert slug-like 'viridian-city' to 'Viridian City' for readability
            if re.match(r'^[a-z0-9\-]+$', name):
                pretty = name.replace('-', ' ').replace('_', ' ')
                pretty = ' '.join([w.capitalize() for w in pretty.split()])
                locations.add(pretty)
            else:
                locations.add(name)
    return locations


def scan_map_files(map_dir, extensions, recursive=False):
    files = []
    exts = set('.' + e.lower().lstrip('.') for e in extensions)
    if recursive:
        for root, dirs, filenames in os.walk(map_dir):
            for fn in filenames:
                if os.path.splitext(fn)[1].lower() in exts:
                    rel = os.path.relpath(os.path.join(root, fn), map_dir)
                    files.append(rel)
    else:
        for fn in os.listdir(map_dir):
            p = os.path.join(map_dir, fn)
            if os.path.isfile(p) and os.path.splitext(fn)[1].lower() in exts:
                files.append(fn)
    return sorted(files)


def best_match_for_location(loc, candidates, threshold=0.55):
    if not candidates:
        return None, 0.0
    key = clean_name_for_compare(loc)
    best = None
    best_score = 0.0
    for c in candidates:
        # compare the filename (without extension) and also the full path
        base = os.path.splitext(os.path.basename(c))[0]
        cand_key = clean_name_for_compare(base)
        score = SequenceMatcher(None, key, cand_key).ratio()
        if score > best_score:
            best_score = score
            best = c
    if best_score >= threshold:
        return best, best_score
    return None, best_score


def main():
    p = argparse.ArgumentParser(description='Match locations to existing map files')
    p.add_argument('--input-json', required=True, help='pokemon_data.json path')
    p.add_argument('--map-dir', required=True, help='Directory containing map image files')
    p.add_argument('--output-json', required=True, help='Output JSON mapping file')
    p.add_argument('--threshold', type=float, default=0.55, help='Minimum similarity (0..1) to accept a match')
    p.add_argument('--recursive', action='store_true', help='Search map-dir recursively')
    p.add_argument('--extensions', default='png,jpg,jpeg', help='Comma-separated extensions to consider')
    args = p.parse_args()

    if not os.path.exists(args.input_json):
        print('input-json not found:', args.input_json)
        sys.exit(2)
    if not os.path.isdir(args.map_dir):
        print('map-dir not found or not a directory:', args.map_dir)
        sys.exit(2)

    exts = [e.strip().lower() for e in args.extensions.split(',') if e.strip()]

    with open(args.input_json, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    locations = sorted(collect_locations_from_json(data))
    print(f'Found {len(locations)} unique locations to match')

    candidates = scan_map_files(args.map_dir, exts, recursive=args.recursive)
    print(f'Scanned {len(candidates)} map files in {args.map_dir}')

    mapping = {}
    unmatched = []
    for loc in locations:
        match, score = best_match_for_location(loc, candidates, threshold=args.threshold)
        if match:
            mapping[loc] = match
        else:
            mapping[loc] = None
            unmatched.append((loc, score))

    # Write mapping json
    os.makedirs(os.path.dirname(args.output_json), exist_ok=True)
    with open(args.output_json, 'w', encoding='utf-8') as of:
        json.dump(mapping, of, indent=2, ensure_ascii=False)

    print(f'Wrote mapping for {len(mapping)} locations to {args.output_json}')
    if unmatched:
        print('\nLocations with no confident match (below threshold):')
        for loc, score in sorted(unmatched, key=lambda x: x[1], reverse=True):
            print(f'  - {loc} (best score: {score:.3f})')
    else:
        print('All locations matched successfully')


if __name__ == '__main__':
    main()
