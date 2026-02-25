"""
Script to download Pokemon footprint images from Bulbapedia.
Scrapes the Gen VIII column from the footprints page and saves images by Pokemon ID.
"""

import argparse
import json
import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def load_pokemon_data(json_path):
    """Load pokemon data from JSON file and create name-to-id mapping."""
    with open(json_path, 'r', encoding='utf-8') as f:
        pokemon_data = json.load(f)
    
    # Create mapping of Pokemon name to ID
    name_to_id = {}
    for pokemon in pokemon_data:
        name = pokemon['name'].lower()
        name_to_id[name] = pokemon['id']
    
    return name_to_id


def normalize_pokemon_name(name):
    """Normalize Pokemon name for matching."""
    # Remove special characters and convert to lowercase
    name = name.lower().strip()
    # Handle special cases
    name = re.sub(r'[^a-z0-9\s\-]', '', name)
    name = name.replace(' ', '').replace('-', '')
    return name


def get_full_image_url(thumbnail_url):
    """Convert thumbnail URL to full resolution URL."""
    # Remove thumbnail size suffixes like /40px-F0001BDSP.png
    # Example: .../thumb/a/aa/F0001BDSP.png/40px-F0001BDSP.png -> .../a/aa/F0001BDSP.png
    if '/thumb/' in thumbnail_url:
        parts = thumbnail_url.split('/thumb/')
        if len(parts) == 2:
            # Get the path after /thumb/ and remove the size suffix
            after_thumb = parts[1]
            # Split by / and remove the last part (the sized filename)
            path_parts = after_thumb.split('/')
            if len(path_parts) >= 2:
                # Reconstruct the full URL without /thumb/ and without the size
                full_url = parts[0] + '/' + '/'.join(path_parts[:-1])
                return full_url
    return thumbnail_url


def scrape_footprints(url, name_to_id, output_dir):
    """Scrape footprint images from Bulbapedia page."""
    print(f"Fetching page: {url}")
    response = requests.get(url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the main content table
    # The page has a table with columns: Ndex, MS, Pokémon, and generation columns
    table = soup.find('table', class_='roundtable')
    
    if not table:
        print("Could not find the footprints table!")
        return
    
    # Find the header row to identify which column is Gen VIII
    header_row = table.find('tr')
    headers = header_row.find_all('th')
    
    # Find the index of the Gen VIII column
    gen_viii_index = None
    for i, header in enumerate(headers):
        header_text = header.get_text(strip=True)
        if 'VIII' in header_text or 'Gen VIII' in header_text:
            gen_viii_index = i
            break
    
    if gen_viii_index is None:
        print("Could not find Gen VIII column!")
        # Let's print the headers to help debug
        print("Found headers:", [h.get_text(strip=True) for h in headers])
        return
    
    print(f"Found Gen VIII at column index: {gen_viii_index}")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Process each row
    rows = table.find_all('tr')[1:]  # Skip header row
    downloaded_count = 0
    skipped_count = 0
    
    for row in rows:
        cells = row.find_all('td')
        
        if len(cells) <= gen_viii_index:
            continue
        
        # Get Pokemon name (usually in the 3rd column)
        name_cell = None
        for cell in cells[:4]:  # Check first few cells for the name
            # Look for a cell with a link to a Pokemon page
            link = cell.find('a')
            if link and link.get('title'):
                title = link.get('title', '')
                if 'Pokémon' in title or '(' in title:
                    name_cell = cell
                    break
        
        if not name_cell:
            continue
        
        # Extract Pokemon name
        pokemon_name = name_cell.get_text(strip=True)
        # Clean up the name (remove extra text like "(Pokémon)")
        pokemon_name = re.split(r'\(', pokemon_name)[0].strip()
        
        # Get the Gen VIII cell
        gen_viii_cell = cells[gen_viii_index]
        
        # Find image in the Gen VIII column
        img = gen_viii_cell.find('img')
        
        if not img or not img.get('src'):
            continue
        
        img_url = img.get('src')
        
        # Make absolute URL
        if img_url.startswith('//'):
            img_url = 'https:' + img_url
        elif img_url.startswith('/'):
            img_url = urljoin(url, img_url)
        
        # Convert thumbnail to full resolution
        img_url = get_full_image_url(img_url)
        
        # Try to find matching Pokemon ID
        normalized_name = normalize_pokemon_name(pokemon_name)
        pokemon_id = None
        
        # Try exact match first
        if pokemon_name.lower() in name_to_id:
            pokemon_id = name_to_id[pokemon_name.lower()]
        else:
            # Try normalized match
            for name, pid in name_to_id.items():
                if normalize_pokemon_name(name) == normalized_name:
                    pokemon_id = pid
                    break
        
        if pokemon_id is None:
            print(f"Skipping {pokemon_name} - not found in JSON data")
            skipped_count += 1
            continue
        
        # Download the image
        output_path = os.path.join(output_dir, f"{pokemon_id}.png")
        
        try:
            img_response = requests.get(img_url, timeout=10)
            img_response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(img_response.content)
            
            print(f"Downloaded {pokemon_name} (ID: {pokemon_id})")
            downloaded_count += 1
            
        except Exception as e:
            print(f"Error downloading {pokemon_name} (ID: {pokemon_id}): {e}")
            skipped_count += 1
    
    print(f"\nDownload complete!")
    print(f"Successfully downloaded: {downloaded_count}")
    print(f"Skipped: {skipped_count}")


def main():
    parser = argparse.ArgumentParser(
        description='Download Pokemon footprint images from Bulbapedia'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to pokemon_data.json file'
    )
    parser.add_argument(
        '--output-dir',
        default='footprint',
        help='Output directory for footprint images (default: footprint)'
    )
    parser.add_argument(
        '--url',
        default='https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_footprint',
        help='URL to scrape (default: Bulbapedia footprints page)'
    )
    
    args = parser.parse_args()
    
    # Load Pokemon data
    print(f"Loading Pokemon data from: {args.input_json}")
    name_to_id = load_pokemon_data(args.input_json)
    print(f"Loaded {len(name_to_id)} Pokemon")
    
    # Scrape and download footprints
    scrape_footprints(args.url, name_to_id, args.output_dir)


if __name__ == '__main__':
    main()
