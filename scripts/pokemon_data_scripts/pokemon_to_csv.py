#!/usr/bin/env python3
"""
Extract specified fields from pokemon_data.json and export to CSV.

Usage:
    python pokemon_to_csv.py -i pokemon_data.json -o output.csv -f generation,habitat,height,weight
    python pokemon_to_csv.py -o output.csv -f types,genus
"""

import json
import csv
import argparse
import sys
from pathlib import Path


def extract_pokemon_data(input_file, output_file, fields):
    """
    Extract pokemon data with specified fields and save to CSV.
    
    Args:
        input_file: Path to pokemon_data.json
        output_file: Path to output CSV file
        fields: List of field names to extract
    """
    try:
        # Read the JSON file
        with open(input_file, 'r', encoding='utf-8') as f:
            pokemon_data = json.load(f)
        
        if not isinstance(pokemon_data, list):
            print(f"Error: Expected JSON array but got {type(pokemon_data).__name__}", file=sys.stderr)
            return False
        
        if not pokemon_data:
            print("Error: JSON array is empty", file=sys.stderr)
            return False
        
        # Prepare CSV header and rows
        csv_headers = ['id', 'name'] + fields
        rows = []
        
        for pokemon in pokemon_data:
            if not isinstance(pokemon, dict):
                continue
            
            # Extract id and name
            if 'id' not in pokemon or 'name' not in pokemon:
                print(f"Warning: Skipping pokemon without id or name", file=sys.stderr)
                continue
            
            row = [pokemon['id'], pokemon['name']]
            
            # Extract requested fields (use empty string if field doesn't exist)
            for field in fields:
                value = pokemon.get(field, '')
                
                # Convert lists and dicts to JSON strings for CSV compatibility
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                
                row.append(value)
            
            rows.append(row)
        
        # Write to CSV file
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(csv_headers)
            writer.writerows(rows)
        
        print(f"✓ Successfully exported {len(rows)} pokemon to {output_file}")
        print(f"  Columns: {', '.join(csv_headers)}")
        return True
    
    except FileNotFoundError:
        print(f"Error: File not found: {input_file}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {input_file}: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Extract specified fields from pokemon_data.json and export to CSV'
    )
    
    parser.add_argument(
        '-i', '--input',
        default='public/data/pokemon_data.json',
        help='Input JSON file (default: public/data/pokemon_data.json)'
    )
    
    parser.add_argument(
        '-o', '--output',
        required=True,
        help='Output CSV file (required)'
    )
    
    parser.add_argument(
        '-f', '--fields',
        required=True,
        help='Comma-separated list of field names to extract'
    )
    
    args = parser.parse_args()
    
    # Parse field names
    fields = [f.strip() for f in args.fields.split(',')]
    
    if not fields:
        print("Error: No fields specified", file=sys.stderr)
        sys.exit(1)
    
    # Extract and export
    success = extract_pokemon_data(args.input, args.output, fields)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
