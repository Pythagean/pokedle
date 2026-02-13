#!/usr/bin/env python3
"""
Script to extract all unique location names from Pokemon data JSON.
"""

import json
import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        description='Extract unique location names from Pokemon data'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to input Pokemon data JSON file'
    )
    parser.add_argument(
        '--output-txt',
        required=True,
        help='Path to output text file for location names'
    )
    
    args = parser.parse_args()
    
    # Load input JSON
    print(f"Loading Pokemon data from: {args.input_json}")
    try:
        with open(args.input_json, 'r', encoding='utf-8') as f:
            pokemon_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input_json}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file: {e}")
        sys.exit(1)
    
    if not isinstance(pokemon_data, list):
        print("Error: Input JSON must be an array of Pokemon")
        sys.exit(1)
    
    print(f"Loaded {len(pokemon_data)} Pokemon")
    
    # Collect unique location names
    location_names = set()
    
    for pokemon in pokemon_data:
        encounters = pokemon.get('location_area_encounters', [])
        if encounters:
            for encounter in encounters:
                if isinstance(encounter, dict):
                    name = encounter.get('name')
                else:
                    name = encounter
                
                if name:
                    location_names.add(name)
    
    # Sort alphabetically
    sorted_locations = sorted(location_names)
    
    # Write to output file
    print(f"\nWriting {len(sorted_locations)} unique locations to: {args.output_txt}")
    try:
        with open(args.output_txt, 'w', encoding='utf-8') as f:
            for location in sorted_locations:
                f.write(location + '\n')
        print("Successfully saved output file!")
    except IOError as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)
    
    print(f"\nComplete! Found {len(sorted_locations)} unique locations.")


if __name__ == '__main__':
    main()
