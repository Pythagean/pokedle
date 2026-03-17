import json
import argparse
import unicodedata
from typing import List


def normalize_text(text: str) -> str:
    """Normalize text by removing accents and converting to a canonical form."""
    # Normalize unicode characters (NFD = decompose accented chars)
    normalized = unicodedata.normalize('NFD', text)
    # Remove accent marks (category 'Mn' = Nonspacing Mark)
    without_accents = ''.join(char for char in normalized if unicodedata.category(char) != 'Mn')
    # Convert back to NFC form and lowercase for comparison
    return unicodedata.normalize('NFC', without_accents).lower()


def remove_duplicates(entries: List[str]) -> List[str]:
    """Remove duplicates from a list while preserving order.
    
    Duplicates are detected by normalizing text (removing accents, case-insensitive).
    The first occurrence of each unique entry is kept.
    """
    seen = set()
    result = []
    for entry in entries:
        normalized = normalize_text(entry)
        if normalized not in seen:
            seen.add(normalized)
            result.append(entry)
    return result


def deduplicate_flavor_text(input_file: str, output_file: str = None):
    """
    Remove duplicate flavor text entries from Pokemon data.
    
    Args:
        input_file: Path to the input JSON file
        output_file: Path to the output JSON file (defaults to input_file)
    """
    if output_file is None:
        output_file = input_file
    
    # Load the Pokemon data
    print(f"Loading Pokemon data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        pokemon_data = json.load(f)
    
    # Track statistics
    total_pokemon = len(pokemon_data)
    pokemon_modified = 0
    total_duplicates_removed = 0
    
    # Process each Pokemon
    for pokemon in pokemon_data:
        original_count = 0
        modified = False
        
        # Deduplicate flavor_text_entries
        if 'flavor_text_entries' in pokemon and isinstance(pokemon['flavor_text_entries'], list):
            original_len = len(pokemon['flavor_text_entries'])
            pokemon['flavor_text_entries'] = remove_duplicates(pokemon['flavor_text_entries'])
            new_len = len(pokemon['flavor_text_entries'])
            
            if original_len != new_len:
                duplicates = original_len - new_len
                original_count += duplicates
                modified = True
                print(f"  - {pokemon['name']} (#{pokemon['id']}): Removed {duplicates} duplicate(s) from flavor_text_entries")
        
        # Deduplicate flavor_text_entries_original
        if 'flavor_text_entries_original' in pokemon and isinstance(pokemon['flavor_text_entries_original'], list):
            original_len = len(pokemon['flavor_text_entries_original'])
            pokemon['flavor_text_entries_original'] = remove_duplicates(pokemon['flavor_text_entries_original'])
            new_len = len(pokemon['flavor_text_entries_original'])
            
            if original_len != new_len:
                duplicates = original_len - new_len
                original_count += duplicates
                modified = True
                print(f"  - {pokemon['name']} (#{pokemon['id']}): Removed {duplicates} duplicate(s) from flavor_text_entries_original")
        
        if modified:
            pokemon_modified += 1
            total_duplicates_removed += original_count
    
    # Save the modified data
    print(f"\nSaving modified data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(pokemon_data, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total Pokemon processed: {total_pokemon}")
    print(f"  Pokemon modified: {pokemon_modified}")
    print(f"  Total duplicates removed: {total_duplicates_removed}")
    print(f"{'='*60}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Remove duplicate flavor text entries from Pokemon data JSON file.'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to the input Pokemon data JSON file'
    )
    parser.add_argument(
        '--output-json',
        default=None,
        help='Path to the output JSON file (defaults to overwriting input file)'
    )
    
    args = parser.parse_args()
    
    deduplicate_flavor_text(args.input_json, args.output_json)
