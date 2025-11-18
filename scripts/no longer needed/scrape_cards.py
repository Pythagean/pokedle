
import os
import requests
import time
import json
import sys
from bs4 import BeautifulSoup


# --- Argument parsing for --verbose and --partial ---
import argparse
parser = argparse.ArgumentParser(description='Download Serebii card HTML and images.')
parser.add_argument('--verbose', action='store_true', help='Print detailed progress messages')
parser.add_argument('--partial', type=int, default=None, help='Only process this many Pokémon (for testing)')
args = parser.parse_args()

# Load your pokemon_data.json
with open('./data/pokemon_data.json', encoding='utf-8') as f:
    pokemon_data = json.load(f)
if args.partial:
    pokemon_data = pokemon_data[:args.partial]


data_dir = os.path.join('data')
html_dir = os.path.join(data_dir, 'serebii_pages')
img_dir = os.path.join(data_dir, 'cards')
os.makedirs(html_dir, exist_ok=True)
os.makedirs(img_dir, exist_ok=True)

# Download HTML pages if not present
for p in pokemon_data:
    poke_id = int(p['id'])
    url = f'https://www.serebii.net/card/dex/{poke_id:03d}.shtml'
    out_path = os.path.join(html_dir, f'{poke_id:03d}.html')
    if os.path.exists(out_path):
        if args.verbose:
            print(f'Skipping {poke_id:03d} (already downloaded)')
        continue
    if args.verbose:
        print(f'Downloading {url} ...')
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        with open(out_path, 'w', encoding='utf-8') as out_file:
            out_file.write(resp.text)
        time.sleep(0.5)  # Be polite to Serebii
    except Exception as e:
        print(f'Failed to download {url}: {e}')

# Extract and download card images from HTML
for p in pokemon_data:
    poke_id = int(p['id'])
    html_path = os.path.join(html_dir, f'{poke_id:03d}.html')
    if not os.path.exists(html_path):
        if args.verbose:
            print(f'HTML for {poke_id:03d} not found, skipping image extraction')
        continue
    with open(html_path, encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
    # Find all card images (Serebii uses /tcg/ set)
    imgs = soup.find_all('img')
    # Print all <img> tags with src starting with /card/ and ending with .jpg
    card_imgs = [img for img in imgs if img.get('src','').startswith('/card/') and img.get('src','').endswith('.jpg')]
    if args.verbose:
        if card_imgs:
            print(f'Found /card/*.jpg images for {poke_id:03d}:')
        else:
            print(f'No /card/*.jpg images found for {poke_id:03d}')
    for i, img in enumerate(card_imgs):
        src = img['src']
        # Remove 3 characters after '/card/'
        idx = src.find('/card/')
        if idx != -1:
            prefix = src[:idx+6]  # includes '/card/'
            rest = src[idx+6+3:]  # skip 3 chars after '/card/'
            new_src = prefix + rest
        else:
            new_src = src
        full_url = 'https://www.serebii.net' + new_src
        img_name = f'{poke_id}-{i+1}.jpg'
        out_path = os.path.join(img_dir, img_name)

        if args.verbose:
            print('   ', full_url)

        if not os.path.exists(out_path):
            try:
                resp = requests.get(full_url, timeout=10)
                resp.raise_for_status()
                with open(out_path, 'wb') as out_file:
                    out_file.write(resp.content)
                # Check file size and delete if < 5KB
                file_size = os.path.getsize(out_path)
                if file_size < 5 * 1024:
                    os.remove(out_path)
                    if args.verbose:
                        print(f'      Deleted {img_name} (less than 5KB)')
                else:
                    if args.verbose:
                        print(f'      Downloaded {img_name}')
                time.sleep(0.5)
            except Exception as e:
                print(f'      Failed to download {full_url}: {e}')
        else:
            if args.verbose:
                print(f'      Image {img_name} already exists, skipping')