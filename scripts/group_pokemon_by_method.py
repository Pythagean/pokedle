import json
import argparse
from collections import defaultdict


def group_pokemon_by_method(input_file, output_file):
    """
    Group Pokemon by their encounter methods from location_area_encounters.
    
    Args:
        input_file: Path to the input JSON file (pokemon_data.json)
        output_file: Path to the output JSON file
    """
    # Dictionary to store methods and their associated Pokemon
    methods_dict = defaultdict(list)
    
    # Read the input JSON file
    with open(input_file, 'r', encoding='utf-8') as f:
        pokemon_data = json.load(f)
    
    # Process each Pokemon
    for pokemon in pokemon_data:
        pokemon_name = pokemon.get('name', 'Unknown')
        location_encounters = pokemon.get('location_area_encounters', [])
        
        # Track methods we've already added this Pokemon to (to avoid duplicates)
        methods_for_this_pokemon = set()
        
        # Process each location encounter
        for encounter in location_encounters:
            method_string = encounter.get('method', 'Unknown')
            
            # Split comma-separated methods and process each individually
            methods = [m.strip() for m in method_string.split(',')]
            
            for method in methods:
                # Only add the Pokemon once per method
                if method not in methods_for_this_pokemon:
                    methods_dict[method].append(pokemon_name)
                    methods_for_this_pokemon.add(method)
    
    # Sort the Pokemon lists alphabetically for each method
    for method in methods_dict:
        methods_dict[method] = sorted(set(methods_dict[method]))
    
    # Convert to regular dict and sort by method name
    output_data = {method: methods_dict[method] for method in sorted(methods_dict.keys())}
    
    # Write to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print(f"Processed {len(pokemon_data)} Pokemon")
    print(f"Found {len(output_data)} unique encounter methods")
    print(f"\nMethods found:")
    for method, pokemon_list in output_data.items():
        print(f"  {method}: {len(pokemon_list)} Pokemon")
    print(f"\nOutput written to: {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Group Pokemon by their encounter methods'
    )
    parser.add_argument(
        '--input',
        default='./public/data/pokemon_data.json',
        help='Path to input JSON file (default: ./public/data/pokemon_data.json)'
    )
    parser.add_argument(
        '--output',
        default='./public/data/pokemon_by_method.json',
        help='Path to output JSON file (default: ./public/data/pokemon_by_method.json)'
    )
    
    args = parser.parse_args()
    
    group_pokemon_by_method(args.input, args.output)
