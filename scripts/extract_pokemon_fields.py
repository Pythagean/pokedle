import json
import argparse

def extract_fields(input_json, output_json):
    """
    Extract specific fields from Pokemon data and write to a new JSON file.
    
    Args:
        input_json: Path to input JSON file
        output_json: Path to output JSON file
    """
    # Fields to extract
    fields_to_extract = ['id', 'name', 'generation', 'habitat', 'height', 'weight', 'types']
    
    # Read input file
    with open(input_json, 'r', encoding='utf-8') as f:
        pokemon_data = json.load(f)
    
    # Extract specified fields
    filtered_data = []
    for pokemon in pokemon_data:
        filtered_pokemon = {}
        for field in fields_to_extract:
            if field in pokemon:
                filtered_pokemon[field] = pokemon[field]
            else:
                # Handle missing fields (optional - set to None or skip)
                filtered_pokemon[field] = None
        filtered_data.append(filtered_pokemon)
    
    # Write output file
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(filtered_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Extracted {len(filtered_data)} Pokemon with {len(fields_to_extract)} fields")
    print(f"✓ Written to {output_json}")

def main():
    parser = argparse.ArgumentParser(description='Extract specific fields from Pokemon data JSON')
    parser.add_argument('--input-json', required=True, help='Path to input JSON file')
    parser.add_argument('--output-json', required=True, help='Path to output JSON file')
    
    args = parser.parse_args()
    
    extract_fields(args.input_json, args.output_json)

if __name__ == '__main__':
    main()
