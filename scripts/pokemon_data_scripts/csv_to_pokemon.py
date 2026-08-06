#!/usr/bin/env python3
"""
Update pokemon_data.json with values from a modified CSV file.

The CSV should have 'id' and 'name' columns plus any other fields to update.
Matches pokemon by id and updates the specified fields.

Usage:
    python csv_to_pokemon.py -i pokemon_data.json -c pokedataoutput.csv -o pokemon_data_updated.json
    python csv_to_pokemon.py -c pokedataoutput.csv  # Uses defaults
"""

import json
import csv
import argparse
import sys
from pathlib import Path


def update_pokemon_data(json_file, csv_file, output_file):
    """
    Update pokemon_data.json with values from CSV file.
    
    Args:
        json_file: Path to pokemon_data.json
        csv_file: Path to modified CSV file
        output_file: Path to output JSON file (can be same as json_file to overwrite)
    """
    try:
        # Read the JSON file
        with open(json_file, 'r', encoding='utf-8') as f:
            pokemon_data = json.load(f)
        
        if not isinstance(pokemon_data, list):
            print(f"Error: Expected JSON array but got {type(pokemon_data).__name__}", file=sys.stderr)
            return False
        
        # Create a map of pokemon by id for fast lookup
        pokemon_by_id = {}
        for pokemon in pokemon_data:
            if isinstance(pokemon, dict) and 'id' in pokemon:
                pokemon_by_id[pokemon['id']] = pokemon
        
        # Read the CSV file
        updated_count = 0
        with open(csv_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            if not reader.fieldnames:
                print("Error: CSV file is empty", file=sys.stderr)
                return False
            
            # Always skip 'id' and 'name' as they're just identifiers
            fields_to_update = [field for field in reader.fieldnames if field not in ('id', 'name')]
            
            for row in reader:
                # Get the pokemon id
                try:
                    pokemon_id = int(row['id'])
                except (ValueError, KeyError):
                    print(f"Warning: Skipping row with invalid id: {row}", file=sys.stderr)
                    continue
                
                # Find the pokemon in our data
                if pokemon_id not in pokemon_by_id:
                    print(f"Warning: Pokemon with id {pokemon_id} not found in JSON", file=sys.stderr)
                    continue
                
                pokemon = pokemon_by_id[pokemon_id]
                
                # Update fields
                for field in fields_to_update:
                    value = row[field]
                    
                    if value == '':
                        # Keep original value if CSV is empty
                        continue
                    
                    # Try to parse as JSON (for lists/dicts)
                    try:
                        parsed_value = json.loads(value)
                        pokemon[field] = parsed_value
                    except json.JSONDecodeError:
                        # If not valid JSON, try to convert to appropriate type
                        # Check if it looks like a number
                        try:
                            if '.' in value:
                                pokemon[field] = float(value)
                            else:
                                pokemon[field] = int(value)
                        except ValueError:
                            # Keep as string
                            pokemon[field] = value
                
                updated_count += 1
        
        # Write the updated JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(pokemon_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Successfully updated {updated_count} pokemon")
        print(f"✓ Written to {output_file}")
        return True
    
    except FileNotFoundError as e:
        print(f"Error: File not found: {e}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {json_file}: {e}", file=sys.stderr)
        return False
    except csv.Error as e:
        print(f"Error: CSV parsing error: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Update pokemon_data.json with values from a modified CSV file'
    )
    
    parser.add_argument(
        '-i', '--input',
        default='../../public/data/pokemon_data.json',
        help='Input JSON file (default: ../../public/data/pokemon_data.json)'
    )
    
    parser.add_argument(
        '-c', '--csv',
        required=True,
        help='Input CSV file (required)'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='Output JSON file (default: overwrites input file)'
    )
    
    args = parser.parse_args()
    
    # If no output file specified, use the input file
    output_file = args.output or args.input
    
    # Confirm if overwriting
    if output_file == args.input:
        response = input(f"This will overwrite {args.input}. Continue? (y/n): ").strip().lower()
        if response != 'y':
            print("Cancelled.")
            sys.exit(0)
    
    # Update and export
    success = update_pokemon_data(args.input, args.csv, output_file)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
