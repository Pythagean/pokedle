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
    
    found = []
    not_found = []
    
    for location in locations:
        # Convert spaces to underscores
        filename = location.replace(' ', '_') + '.png'
        filepath = os.path.join(args.map_dir, filename)
        
        if os.path.exists(filepath):
            found.append((location, filename))
            print(f"✓ Found: {location} -> {filename}")
        else:
            not_found.append((location, filename))
            print(f"✗ Missing: {location} -> {filename}")
    
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
