import os
import sys
import json
import requests
from urllib.parse import urlparse

def download_image(url, path, verbose=False):
    if not url:
        return
    try:
        resp = requests.get(url, stream=True)
        resp.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in resp.iter_content(1024):
                f.write(chunk)
        if verbose:
            print(f"Downloaded {url} -> {path}")
    except Exception as e:
        if verbose:
            print(f"Failed to download {url}: {e}")

def main():
    verbose = '--verbose' in sys.argv
    partial = '--partial' in sys.argv
    # Load pokemon data
    with open('data/pokemon_data.json', 'r', encoding='utf-8') as f:
        pokedex = json.load(f)
    if partial:
        pokedex = pokedex[:3]
    # Ensure directories exist in ../public/data/
    os.makedirs('../public/data/sprites', exist_ok=True)
    os.makedirs('../public/data/images', exist_ok=True)
    for poke in pokedex:
        poke_id = poke.get('id')
        name = poke.get('name')
        sprites = poke.get('sprites', {})
        if verbose:
            print(f"Processing {poke_id}: {name}")
        # Download back_default
        back_url = sprites.get('back_default')
        if back_url:
            back_path = f"../public/data/sprites/{poke_id}-back.png"
            download_image(back_url, back_path, verbose)
        # Download front_default
        front_url = sprites.get('front_default')
        if front_url:
            front_path = f"../public/data/sprites/{poke_id}-front.png"
            download_image(front_url, front_path, verbose)
        # Download official_artwork
        art_url = sprites.get('official_artwork')
        if art_url:
            art_path = f"../public/data/images/{poke_id}.png"
            download_image(art_url, art_path, verbose)

if __name__ == "__main__":
    main()
