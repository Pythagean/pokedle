import os
import re
import json
import shutil
import argparse
from PIL import Image
from bs4 import BeautifulSoup

def clean_name(name):
    name = name.replace('Mega', '').replace('ex', '').strip()
    return name

def main():
    parser = argparse.ArgumentParser(description='Process .webmp files using TCG Pocket Collection Tracker.htm and pokemon_data.json')
    parser.add_argument('directory', help='Directory containing the .htm and _files folder')
    parser.add_argument('--partial', action='store_true', help='Only process 3 files')
    parser.add_argument('--verbose', action='store_true', help='Print detailed actions')
    args = parser.parse_args()
    base_dir = args.directory
    htm_path = os.path.join(base_dir, 'TCG Pocket Collection Tracker.htm')
    files_dir = os.path.join(base_dir, 'TCG Pocket Collection Tracker_files')
    failed_dir = os.path.join(base_dir, 'failed')
    success_dir = os.path.join(base_dir, 'success')
    os.makedirs(failed_dir, exist_ok=True)
    os.makedirs(success_dir, exist_ok=True)

    # Load pokemon data
    with open(os.path.join('public/data', 'pokemon_data.json'), encoding='utf-8') as f:
        pokemon_data = json.load(f)
    name_to_id = {p['name']: str(p['id']) for p in pokemon_data}

    # Parse HTML
    with open(htm_path, encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Build a mapping from card code (e.g., B1-251) to cleaned name
    code_to_name = {}
    for span in soup.find_all('span', class_='block md:inline'):
        code = span.get_text(strip=True)
        # Look for the next span with class 'block md:inline truncate'
        next_span = span.find_next('span', class_='block md:inline truncate')
        if next_span:
            raw_name = next_span.get_text(strip=True)
            cleaned = clean_name(raw_name)
            code_to_name[code] = cleaned

    # Track how many times we've used each id for decrementing x
    id_to_x = {}

    files = [f for f in os.listdir(files_dir) if f.lower().endswith('.webp')]
    if args.partial:
        files = files[:3]
        if args.verbose:
            print(f"[Partial] Only processing first 3 files: {files}")
    for fname in files:
        if args.verbose:
            print(f"Processing file: {fname}")
        code = os.path.splitext(fname)[0]
        poke_name = code_to_name.get(code)
        if args.verbose:
            print(f"  Card code: {code}")
            print(f"  Found name: {poke_name}")
        if not poke_name:
            shutil.move(os.path.join(files_dir, fname), os.path.join(failed_dir, fname))
            print(f"No name found for {fname}, moved to failed.")
            continue
        poke_id = name_to_id.get(poke_name)
        if args.verbose:
            print(f"  Found id: {poke_id}")
        if not poke_id:
            shutil.move(os.path.join(files_dir, fname), os.path.join(failed_dir, fname))
            print(f"No id found for {poke_name}, moved {fname} to failed.")
            continue
        x = id_to_x.get(poke_id, 100) - 1
        id_to_x[poke_id] = x
        new_fname = f"{poke_id}-{x}.jpg"
        src_path = os.path.join(files_dir, fname)
        dst_path = os.path.join(success_dir, new_fname)
        try:
            if args.verbose:
                print(f"  Converting {fname} to {new_fname}...")
            with Image.open(src_path) as im:
                rgb_im = im.convert('RGB')
                rgb_im.save(dst_path, 'JPEG')
            os.remove(src_path)
            print(f"Converted {fname} to {new_fname} and moved to success.")
        except Exception as e:
            shutil.move(src_path, os.path.join(failed_dir, fname))
            print(f"Failed to convert {fname}: {e}. Moved to failed.")

if __name__ == '__main__':
    main()
