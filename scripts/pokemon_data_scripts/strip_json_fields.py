#!/usr/bin/env python3
"""
Script to remove specified fields from Pokemon data JSON.
"""

import json
import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        description='Remove specified fields from Pokemon data JSON'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to input Pokemon data JSON file'
    )
    parser.add_argument(
        '--output-json',
        required=True,
        help='Path to output Pokemon data JSON file'
    )
    
    args = parser.parse_args()
    
    # Fields to remove
    fields_to_remove = ['shape', 'abilities', 'held_items', 'moves', 'stats', 'egg_groups']
    
    # Desired field order
    field_order = [
        'id',
        'name',
        'generation',
        'evolution_stage',
        'genus',
        'habitat',
        'height',
        'weight',
        'types',
        'location_area_encounters',
        'preevolution_location_area_encounters',
        'flavor_text_entries',
        'flavor_text_entries_original'
    ]
    
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
    
    # Remove specified fields and reorder remaining fields
    total_removed = 0
    for i, pokemon in enumerate(pokemon_data):
        # Remove fields
        for field in fields_to_remove:
            if field in pokemon:
                del pokemon[field]
                total_removed += 1
        
        # Reorder fields
        ordered_pokemon = {}
        
        # Add fields in specified order
        for field in field_order:
            if field in pokemon:
                ordered_pokemon[field] = pokemon[field]
        
        # Add any remaining fields not in the order list
        for field, value in pokemon.items():
            if field not in ordered_pokemon:
                ordered_pokemon[field] = value
        
        pokemon_data[i] = ordered_pokemon
    
    print(f"Removed {total_removed} field occurrences")
    print(f"Reordered fields for all Pokemon")
    
    # Write output JSON
    print(f"\nSaving results to: {args.output_json}")
    try:
        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(pokemon_data, f, indent=2, ensure_ascii=False)
        print("Successfully saved output file!")
    except IOError as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)
    
    print(f"\nComplete! Stripped {len(fields_to_remove)} field types from {len(pokemon_data)} Pokemon.")


if __name__ == '__main__':
    main()
