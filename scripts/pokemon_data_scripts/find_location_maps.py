#!/usr/bin/env python3
"""
Script to find matching map files for location names.

This script:
1. Reads location names from a text file (one per line)
2. Converts spaces to underscores
3. Searches for matching .png files in the specified directory
"""

import argparse
import os
import sys
import csv
import json

def main():
    parser = argparse.ArgumentParser(
        description='Find matching map files for location names'
    )
    parser.add_argument(
        '--input-file',
        required=True,
        help='Path to input text file with location names (one per line)'
    )
    parser.add_argument(
        '--map-dir',
        required=True,
        help='Directory containing map PNG files'
    )
    parser.add_argument(
        '--mapping-file',
        help='Optional JSON mapping file (location -> filename) to consult before heuristics'
    )
    parser.add_argument(
        '--output-csv',
        help='Path to output CSV file for missing locations'
    )
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.exists(args.input_file):
        print(f"Error: Input file not found: {args.input_file}")
        sys.exit(1)
    
    # Check if map directory exists
    if not os.path.isdir(args.map_dir):
        print(f"Error: Map directory not found: {args.map_dir}")
        sys.exit(1)
    
    # Read location names from input file
    print(f"Reading locations from: {args.input_file}")
    with open(args.input_file, 'r', encoding='utf-8') as f:
        locations = [line.strip() for line in f if line.strip()]
    
    print(f"Found {len(locations)} locations to process")
    print(f"Searching in: {args.map_dir}\n")

    # Load optional mapping file (location name -> filename) if provided
    mapping = {}
    if args.mapping_file:
        if not os.path.exists(args.mapping_file):
            print(f"Warning: mapping file not found: {args.mapping_file} (continuing without it)")
        else:
            try:
                with open(args.mapping_file, 'r', encoding='utf-8') as mf:
                    mapping = json.load(mf)
                print(f"Loaded mapping file: {args.mapping_file} ({len(mapping)} entries)")
            except Exception as e:
                print(f"Warning: error loading mapping file: {e} (continuing without it)")
    # Build a normalized mapping: normalized_key -> filename
    normalized_mapping = {}
    if mapping:
        for k, v in mapping.items():
            nk = str(k).lower().replace('-', ' ').replace('_', ' ').strip()
            nk = ' '.join(nk.split())
            if nk not in normalized_mapping:
                normalized_mapping[nk] = v
    
    found = []
    not_found = []
    for location in locations:
        loc_raw = location.strip()

        # 1) If mapping provided, try mapping keys similar to LocationsPage.jsx
        mapped_filename = None
        if mapping:
            # try normalized lookup first
            nk = loc_raw.lower().replace('-', ' ').replace('_', ' ').strip()
            nk = ' '.join(nk.split())
            if nk in normalized_mapping:
                candidate = normalized_mapping[nk]
                candidate_path = os.path.join(args.map_dir, candidate)
                if os.path.exists(candidate_path):
                    found.append((location, candidate))
                    print(f"✓ Found via normalized mapping: {location} -> {candidate} (key: '{nk}')")
                    mapped_filename = candidate
                else:
                    print(f"Mapping maps '{nk}' -> '{candidate}', but file not found in map-dir")
                    mapped_filename = candidate
            else:
                # Try some direct variants as a fallback
                keys_to_try = []
                slug = "_".join(loc_raw.split())
                keys_to_try.extend([slug, loc_raw, loc_raw.replace('-', ' '), loc_raw.lower(), slug.lower()])
                keys_to_try.append(loc_raw.replace('_', ' '))
                seenk = set()
                uniq_keys = []
                for k in keys_to_try:
                    if not k:
                        continue
                    if k not in seenk:
                        seenk.add(k)
                        uniq_keys.append(k)
                for key in uniq_keys:
                    if key in mapping:
                        candidate = mapping[key]
                        candidate_path = os.path.join(args.map_dir, candidate)
                        if os.path.exists(candidate_path):
                            found.append((location, candidate))
                            print(f"✓ Found via mapping: {location} -> {candidate} (key: '{key}')")
                            mapped_filename = candidate
                            break
                        else:
                            print(f"Mapping maps '{key}' -> '{candidate}', but file not found in map-dir")
                            mapped_filename = candidate
                            break

        if mapped_filename:
            # if mapped_filename was found (exists) we've already appended to found; if mapping pointed to file that doesn't exist,
            # treat as missing below using the mapped filename
            if os.path.exists(os.path.join(args.map_dir, mapped_filename)):
                continue
            else:
                not_found.append((location, mapped_filename))
                continue

        # 2) No mapping match — fall back to heuristics (slug/raw/lowercase variants)
        # Generate candidate filename bases to match LocationsPage.jsx lookup logic
        candidates = []
        slug = "_".join(loc_raw.split())
        candidates.append(slug)
        candidates.append(loc_raw)
        candidates.append(loc_raw.lower())
        candidates.append(slug.lower())
        candidates.append(loc_raw.replace('-', ' '))
        candidates.append(loc_raw.replace('-', '_'))
        candidates.append(loc_raw.replace('_', ' '))

        # normalize and dedupe while preserving order
        seen = set()
        unique_candidates = []
        for c in candidates:
            if not c:
                continue
            if c not in seen:
                seen.add(c)
                unique_candidates.append(c)

        matched = False
        for base in unique_candidates:
            for ext in ('.png', '.PNG'):
                filename = base + ext
                filepath = os.path.join(args.map_dir, filename)
                if os.path.exists(filepath):
                    found.append((location, filename))
                    print(f"✓ Found: {location} -> {filename} (via '{base}')")
                    matched = True
                    break
            if matched:
                break

        if not matched:
            # Fallback: try simple slug with underscores for any remaining variants
            fallback = slug + '.png'
            filepath = os.path.join(args.map_dir, fallback)
            if os.path.exists(filepath):
                found.append((location, os.path.basename(fallback)))
                print(f"✓ Found (fallback): {location} -> {os.path.basename(fallback)}")
            else:
                # If still not found, record the primary expected filename (slug.png)
                expected = slug + '.png'
                not_found.append((location, expected))
                print(f"✗ Missing: {location} -> {expected}")
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total locations: {len(locations)}")
    print(f"Found: {len(found)}")
    print(f"Not found: {len(not_found)}")
    
    if not_found:
        print("\nMissing files:")
        for location, filename in not_found:
            print(f"  - {filename}")
    
    # Write missing locations to CSV if requested
    if args.output_csv and not_found:
        print(f"\nWriting missing locations to: {args.output_csv}")
        try:
            with open(args.output_csv, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['missing_location', 'location_override'])
                for location, filename in not_found:
                    writer.writerow([location, 'XXX'])
            print(f"Successfully wrote {len(not_found)} missing locations to CSV")
        except IOError as e:
            print(f"Error writing CSV file: {e}")
            sys.exit(1)

if __name__ == '__main__':
    main()
