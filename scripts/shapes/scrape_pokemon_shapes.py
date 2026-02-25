"""
Script to scrape Pokemon shapes from Bulbapedia and add them to pokemon_data.json.
Extracts shape descriptions and matches Pokemon to their shapes.
"""

import argparse
import json
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def load_pokemon_data(json_path):
    """Load pokemon data from JSON file."""
    with open(json_path, 'r', encoding='utf-8') as f:
        pokemon_data = json.load(f)
    return pokemon_data


def save_pokemon_data(json_path, pokemon_data, indent=2):
    """Save pokemon data to JSON file."""
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(pokemon_data, f, indent=indent, ensure_ascii=False)


def normalize_pokemon_name(name):
    """Normalize Pokemon name for matching."""
    # Remove special characters and convert to lowercase
    name = name.lower().strip()
    # Remove content in parentheses
    name = re.sub(r'\([^)]*\)', '', name)
    # Remove special characters but keep spaces and hyphens initially
    name = re.sub(r'[^a-z0-9\s\-]', '', name)
    name = name.strip()
    return name


def extract_shape_descriptions(soup):
    """Extract shape descriptions from the 'List of shapes' table."""
    shapes = []
    
    # Find the "List of shapes" heading
    list_heading = None
    for heading in soup.find_all(['h2', 'h3']):
        if 'List of shapes' in heading.get_text():
            list_heading = heading
            break
    
    if not list_heading:
        print("Could not find 'List of shapes' heading!")
        return shapes
    
    # Find the table after this heading
    current = list_heading.find_next_sibling()
    shape_table = None
    
    while current:
        if current.name == 'table':
            shape_table = current
            break
        if current.name in ['h2', 'h3']:  # Hit another heading
            break
        current = current.find_next_sibling()
    
    if not shape_table:
        print("Could not find shape descriptions table!")
        return shapes
    
    print("Found shape descriptions table")
    
    # Parse the table rows
    # Skip first 2 rows (headers)
    rows = shape_table.find_all('tr')[2:]
    
    for row in rows:
        cells = row.find_all(['td', 'th'])
        # The description is in the last cell
        if len(cells) >= 2:
            description = cells[-1].get_text(strip=True)
            
            # Skip if description is empty or too short
            if description and len(description) > 5:
                shapes.append({
                    'description': description
                })
                print(f"Found shape: {description[:60]}...")
    
    return shapes


def find_pokemon_for_shape(soup, shape_description):
    """Find all Pokemon associated with a shape description."""
    pokemon_names = []
    
    # Find h3 heading that contains this shape description
    target_heading = None
    
    for heading in soup.find_all('h3'):
        heading_text = heading.get_text(strip=True)
        # Look for headings that match the shape description closely
        if shape_description.lower() == heading_text.lower():
            target_heading = heading
            break
        # Also try partial match if description is in the heading
        if shape_description.lower() in heading_text.lower():
            target_heading = heading
            break
    
    if not target_heading:
        print(f"  Could not find heading for shape: {shape_description[:50]}...")
        return pokemon_names
    
    print(f"  Found section: {target_heading.get_text(strip=True)}")
    
    # Find the div or table containing Pokemon after this heading
    current = target_heading.find_next_sibling()
    pokemon_container = None
    
    while current:
        # Look for divs first (more common for Pokemon grids)
        if current.name == 'div':
            # Check if this div contains Pokemon links
            links = current.find_all('a', limit=5)
            for link in links:
                if link.get('title') and 'Pokémon' in link.get('title', ''):
                    pokemon_container = current
                    break
            if pokemon_container:
                break
        
        # Also check tables
        if current.name == 'table':
            links = current.find_all('a', limit=5)
            for link in links:
                if link.get('title') and 'Pokémon' in link.get('title', ''):
                    pokemon_container = current
                    break
            if pokemon_container:
                break
        
        # Stop if we hit another h2 or h3 heading
        if current.name in ['h2', 'h3']:
            break
        
        current = current.find_next_sibling()
    
    if not pokemon_container:
        print(f"  Could not find Pokemon container for this shape")
        return pokemon_names
    
    # Extract Pokemon names from links
    links = pokemon_container.find_all('a')
    
    for link in links:
        title = link.get('title', '')
        # Look for links to Pokemon pages (format: "PokemonName (Pokémon)")
        if '(Pokémon)' in title or '(Pokemon)' in title:
            pokemon_name = title.replace('(Pokémon)', '').replace('(Pokemon)', '').strip()
            if pokemon_name and pokemon_name not in pokemon_names:
                pokemon_names.append(pokemon_name)
    
    print(f"  Found {len(pokemon_names)} Pokemon for this shape")
    
    return pokemon_names


def match_pokemon_by_name(pokemon_name, pokemon_data):
    """Find a Pokemon in the data by name."""
    normalized_search = normalize_pokemon_name(pokemon_name)
    
    # Try exact match first (case insensitive)
    for pokemon in pokemon_data:
        if pokemon['name'].lower() == pokemon_name.lower():
            return pokemon
    
    # Try normalized match
    for pokemon in pokemon_data:
        if normalize_pokemon_name(pokemon['name']) == normalized_search:
            return pokemon
    
    # Try substring match
    for pokemon in pokemon_data:
        if normalized_search in normalize_pokemon_name(pokemon['name']):
            return pokemon
        if normalize_pokemon_name(pokemon['name']) in normalized_search:
            return pokemon
    
    return None


def scrape_and_update_shapes(url, pokemon_data):
    """Scrape Pokemon shapes from Bulbapedia and update the data."""
    print(f"Fetching page: {url}")
    response = requests.get(url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Extract shape descriptions
    print("\nExtracting shape descriptions...")
    shapes = extract_shape_descriptions(soup)
    
    if not shapes:
        print("No shapes found!")
        return pokemon_data, {'updated': 0, 'not_found': 0}
    
    print(f"\nFound {len(shapes)} shapes")
    
    # For each shape, find Pokemon and update the data
    updated_count = 0
    not_found_count = 0
    not_found_list = []
    
    for shape in shapes:
        print(f"\nProcessing shape: {shape['description']}")
        
        # Find Pokemon for this shape
        pokemon_names = find_pokemon_for_shape(soup, shape['description'])
        
        # Update each Pokemon
        for pokemon_name in pokemon_names:
            matched = match_pokemon_by_name(pokemon_name, pokemon_data)
            
            if matched:
                matched['bulbapedia_shape'] = shape['description']
                updated_count += 1
            else:
                print(f"    Could not match: {pokemon_name}")
                not_found_list.append(pokemon_name)
                not_found_count += 1
    
    stats = {
        'updated': updated_count,
        'not_found': not_found_count,
        'not_found_list': not_found_list
    }
    
    return pokemon_data, stats


def main():
    parser = argparse.ArgumentParser(
        description='Scrape Pokemon shapes from Bulbapedia and add to JSON'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to pokemon_data.json file'
    )
    parser.add_argument(
        '--output-json',
        help='Path to output JSON file (default: overwrites input file)'
    )
    parser.add_argument(
        '--url',
        default='https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_shape',
        help='URL to scrape (default: Bulbapedia shapes page)'
    )
    parser.add_argument(
        '--indent',
        type=int,
        default=2,
        help='JSON indentation (default: 2)'
    )
    
    args = parser.parse_args()
    
    # Load Pokemon data
    print(f"Loading Pokemon data from: {args.input_json}")
    pokemon_data = load_pokemon_data(args.input_json)
    print(f"Loaded {len(pokemon_data)} Pokemon")
    
    # Scrape and update
    updated_data, stats = scrape_and_update_shapes(args.url, pokemon_data)
    
    # Save the updated data
    output_path = args.output_json or args.input_json
    print(f"\nSaving updated data to: {output_path}")
    save_pokemon_data(output_path, updated_data, args.indent)
    
    # Print statistics
    print("\n" + "=" * 50)
    print("UPDATE SUMMARY")
    print("=" * 50)
    print(f"Successfully updated: {stats['updated']} Pokemon")
    print(f"Not found in JSON: {stats['not_found']} Pokemon")
    
    if stats['not_found_list']:
        print("\nPokemon not found in JSON:")
        for name in stats['not_found_list'][:20]:
            print(f"  - {name}")
        if len(stats['not_found_list']) > 20:
            print(f"  ... and {len(stats['not_found_list']) - 20} more")
    
    print("\nDone!")


if __name__ == '__main__':
    main()
