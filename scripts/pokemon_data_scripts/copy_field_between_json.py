"""
Script to copy a field from one Pokemon JSON file to another.
Matches Pokemon by ID to ensure data is copied to the correct entry.
"""

import argparse
import json
import sys
from pathlib import Path


def load_json(file_path):
    """Load JSON file and return the data."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}")
        sys.exit(1)


def save_json(file_path, data, indent=2):
    """Save data to JSON file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def copy_field(from_data, to_data, field_name):
    """
    Copy a field from from_data to to_data, matching by ID.
    
    Args:
        from_data: List of Pokemon objects (source)
        to_data: List of Pokemon objects (destination)
        field_name: Name of the field to copy
    
    Returns:
        tuple: (updated_to_data, stats_dict)
    """
    # Create a mapping of ID to the field value from source data
    field_map = {}
    missing_field_source = []
    
    for pokemon in from_data:
        pokemon_id = pokemon.get('id')
        if pokemon_id is None:
            continue
        
        if field_name in pokemon:
            field_map[pokemon_id] = pokemon[field_name]
        else:
            missing_field_source.append(f"{pokemon.get('name', 'Unknown')} (ID: {pokemon_id})")
    
    # Update the destination data
    copied_count = 0
    not_found_count = 0
    missing_field_dest = []
    not_found_ids = []
    
    for pokemon in to_data:
        pokemon_id = pokemon.get('id')
        if pokemon_id is None:
            continue
        
        if pokemon_id in field_map:
            pokemon[field_name] = field_map[pokemon_id]
            copied_count += 1
        else:
            not_found_ids.append(pokemon_id)
            not_found_count += 1
    
    stats = {
        'copied': copied_count,
        'not_found': not_found_count,
        'not_found_ids': not_found_ids,
        'missing_in_source': missing_field_source
    }
    
    return to_data, stats


def main():
    parser = argparse.ArgumentParser(
        description='Copy a field from one Pokemon JSON file to another, matching by ID'
    )
    parser.add_argument(
        '--from-json',
        required=True,
        help='Source JSON file to copy from'
    )
    parser.add_argument(
        '--to-json',
        required=True,
        help='Destination JSON file to copy to (will be modified)'
    )
    parser.add_argument(
        '--field',
        required=True,
        help='Name of the field to copy'
    )
    parser.add_argument(
        '--backup',
        action='store_true',
        help='Create a backup of the destination file before modifying'
    )
    parser.add_argument(
        '--indent',
        type=int,
        default=2,
        help='JSON indentation (default: 2)'
    )
    
    args = parser.parse_args()
    
    # Load both JSON files
    print(f"Loading source: {args.from_json}")
    from_data = load_json(args.from_json)
    
    print(f"Loading destination: {args.to_json}")
    to_data = load_json(args.to_json)
    
    # Validate that both are lists
    if not isinstance(from_data, list) or not isinstance(to_data, list):
        print("Error: Both JSON files must contain arrays of Pokemon objects")
        sys.exit(1)
    
    print(f"\nSource file contains {len(from_data)} Pokemon")
    print(f"Destination file contains {len(to_data)} Pokemon")
    print(f"Copying field: '{args.field}'")
    
    # Create backup if requested
    if args.backup:
        backup_path = Path(args.to_json).with_suffix('.backup.json')
        print(f"\nCreating backup: {backup_path}")
        save_json(backup_path, to_data, args.indent)
    
    # Copy the field
    print(f"\nCopying field '{args.field}'...")
    updated_data, stats = copy_field(from_data, to_data, args.field)
    
    # Save the updated destination file
    print(f"Saving updated file: {args.to_json}")
    save_json(args.to_json, updated_data, args.indent)
    
    # Print statistics
    print("\n" + "=" * 50)
    print("COPY SUMMARY")
    print("=" * 50)
    print(f"Successfully copied: {stats['copied']} Pokemon")
    print(f"Not found in source: {stats['not_found']} Pokemon")
    
    if stats['missing_in_source']:
        print(f"\nPokemon in source missing the field '{args.field}':")
        for name in stats['missing_in_source'][:10]:  # Show first 10
            print(f"  - {name}")
        if len(stats['missing_in_source']) > 10:
            print(f"  ... and {len(stats['missing_in_source']) - 10} more")
    
    if stats['not_found_ids']:
        print(f"\nPokemon IDs in destination not found in source:")
        ids_preview = stats['not_found_ids'][:20]
        print(f"  {', '.join(map(str, ids_preview))}")
        if len(stats['not_found_ids']) > 20:
            print(f"  ... and {len(stats['not_found_ids']) - 20} more")
    
    print("\nDone!")


if __name__ == '__main__':
    main()
