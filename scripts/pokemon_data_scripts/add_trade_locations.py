#!/usr/bin/env python3
"""
Script to add trade locations to Pokemon data from a CSV file.

This script:
1. Reads Pokemon trade locations from a CSV file
2. Adds them to the Pokemon's location_area_encounters
3. Aggregates games by Pokemon+Location combination
"""

import json
import csv
import argparse
import sys
from collections import defaultdict

def main():
    parser = argparse.ArgumentParser(
        description='Add trade locations to Pokemon data from CSV'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to input Pokemon data JSON file'
    )
    parser.add_argument(
        '--input-csv',
        required=True,
        help='Path to input CSV file with trade locations'
    )
    parser.add_argument(
        '--output-json',
        required=True,
        help='Path to output Pokemon data JSON file'
    )
    
    args = parser.parse_args()
    
    # Load Pokemon data JSON
    print(f"Loading Pokemon data from: {args.input_json}")
    try:
        with open(args.input_json, 'r', encoding='utf-8') as f:
            pokemon_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input JSON file not found: {args.input_json}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file: {e}")
        sys.exit(1)
    
    if not isinstance(pokemon_data, list):
        print("Error: Input JSON must be an array of Pokemon")
        sys.exit(1)
    
    print(f"Loaded {len(pokemon_data)} Pokemon")
    
    # Create a lookup dictionary for Pokemon by name (case-insensitive)
    pokemon_lookup = {}
    for pokemon in pokemon_data:
        name = pokemon.get('name', '').lower()
        if name:
            pokemon_lookup[name] = pokemon
    
    # Read CSV and aggregate trades by Pokemon + Location
    print(f"\nReading trade data from: {args.input_csv}")
    trade_data = defaultdict(lambda: defaultdict(list))
    
    try:
        with open(args.input_csv, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            row_count = 0
            for row in reader:
                pokemon_name = row.get('Pokemon', '').strip()
                location = row.get('Location', '').strip()
                game = row.get('Game', '').strip().lower()
                
                if not pokemon_name or not location or not game:
                    print(f"Warning: Skipping incomplete row: {row}")
                    continue
                
                # Aggregate games by Pokemon + Location
                trade_data[pokemon_name.lower()][location].append(game)
                row_count += 1
    except FileNotFoundError:
        print(f"Error: Input CSV file not found: {args.input_csv}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        sys.exit(1)
    
    print(f"Read {row_count} rows from CSV")
    print(f"Found {len(trade_data)} unique Pokemon with trades")
    
    # Add trade locations to Pokemon data
    print("\nAdding trade locations...")
    added_count = 0
    missing_pokemon = []
    
    for pokemon_name, locations in trade_data.items():
        if pokemon_name not in pokemon_lookup:
            missing_pokemon.append(pokemon_name)
            print(f"Warning: Pokemon not found in JSON: {pokemon_name}")
            continue
        
        pokemon = pokemon_lookup[pokemon_name]
        
        # Ensure location_area_encounters exists
        if 'location_area_encounters' not in pokemon:
            pokemon['location_area_encounters'] = []
        
        for location, games in locations.items():
            # Extract region (first word of location)
            region = location.split(' ')[0] if ' ' in location else location
            
            # Create trade location object
            trade_location = {
                "name": location,
                "region": region,
                "games": sorted(list(set(games))),  # Remove duplicates and sort
                "method": "Trade"
            }
            
            # Check if this location already exists (by name)
            existing_location = None
            for loc in pokemon['location_area_encounters']:
                if loc.get('name') == location:
                    existing_location = loc
                    break
            
            if existing_location:
                # If method is already Trade, merge games
                if existing_location.get('method') == 'Trade':
                    existing_games = set(existing_location.get('games', []))
                    new_games = set(trade_location['games'])
                    existing_location['games'] = sorted(list(existing_games | new_games))
                    print(f"  Updated trade location for {pokemon['name']}: {location} ({len(existing_location['games'])} games)")
                else:
                    # Different method, add as new entry
                    pokemon['location_area_encounters'].append(trade_location)
                    print(f"  Added trade location for {pokemon['name']}: {location} ({len(trade_location['games'])} games)")
                    added_count += 1
            else:
                # Add new trade location
                pokemon['location_area_encounters'].append(trade_location)
                print(f"  Added trade location for {pokemon['name']}: {location} ({len(trade_location['games'])} games)")
                added_count += 1
    
    # Save output JSON
    print(f"\nSaving results to: {args.output_json}")
    try:
        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(pokemon_data, f, indent=2, ensure_ascii=False)
        print("Successfully saved output file!")
    except IOError as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Trade locations added: {added_count}")
    if missing_pokemon:
        print(f"Pokemon not found in JSON: {len(missing_pokemon)}")
        for name in missing_pokemon:
            print(f"  - {name}")
    print("\nProcessing complete!")

if __name__ == '__main__':
    main()
