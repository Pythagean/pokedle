#!/usr/bin/env python3
"""
Download images by appending Pokémon names (slugs) to a list of base URLs.

Edit the `BASE_URLS` list below to place your 9 URLs. The script will append
each Pokémon slug (from `pokemon_data.json`) to each base URL and attempt
to download the resulting URL. It will try a few common extensions when the
base URL doesn't already include one.

Usage:
  python download_by_base_urls.py --input-json ../public/data/pokemon_data.json --output-dir ./out --partial 10

Arguments mirror the existing scraper: `--input-json`, `--partial`, `--output-dir`,
`--delay`, and `--verbose`.
"""

import argparse
import json
import os
import re
import sys
import time
from urllib.parse import urljoin, urlparse

import requests

HEADERS = {
    'User-Agent': 'pokedle-downloader/1.0 (+https://github.com/Pythagean/pokedle)'
}

# Edit this mapping: put your keys and base URLs here. The script will append the
# Pokémon slug to the end of each URL (with a '/' if needed). Examples:
#   "crystal": "https://img.pokemondb.net/sprites/crystal/normal/"
#   "sword-shield": "https://img.pokemondb.net/sprites/sword-shield/normal/"
BASE_URLS = {
    # Replace these placeholders with your key: url pairs
    "red-blue": "https://img.pokemondb.net/sprites/red-blue/normal/",
    "crystal": "https://img.pokemondb.net/sprites/crystal/normal/",
    "ruby-sapphire": "https://img.pokemondb.net/sprites/ruby-sapphire/normal/",
    "diamond-pearl": "https://img.pokemondb.net/sprites/diamond-pearl/normal/",
    "black-white": "https://img.pokemondb.net/sprites/black-white/normal/",
    "x-y": "https://img.pokemondb.net/sprites/x-y/normal/",
    # "lets-go-pikachu-eevee": "https://img.pokemondb.net/sprites/lets-go-pikachu-eevee/normal/",
    "sword-shield": "https://img.pokemondb.net/sprites/sword-shield/normal/",
    "brilliant-diamond": "https://img.pokemondb.net/sprites/brilliant-diamond-shining-pearl/normal/",
    "scarlet-violet": "https://img.pokemondb.net/sprites/scarlet-violet/normal/",
    "home": "https://img.pokemondb.net/sprites/home/normal/"
}


def parse_args():
    p = argparse.ArgumentParser(description='Download images by appending pokemon slugs to base URLs')
    p.add_argument('--input-json', required=True, help='Path to pokemon_data.json')
    p.add_argument('--partial', type=int, default=None, help='Only process the first X pokemon')
    p.add_argument('--id-range', type=str, default=None, help="Comma-separated ids/ranges to process, e.g. '1-151,201,250'")
    p.add_argument('--output-dir', required=True, help='Directory to save downloaded images')
    p.add_argument('--delay', type=float, default=0.5, help='Seconds to wait between requests (default 0.5)')
    p.add_argument('--verbose', action='store_true', help='Print verbose progress')
    return p.parse_args()


def parse_id_range(s: str):
    """Parse a string like '1-151,201,250' into a set of ints."""
    ids = set()
    if not s:
        return ids
    parts = [p.strip() for p in s.split(',') if p.strip()]
    for part in parts:
        if '-' in part:
            try:
                a, b = part.split('-', 1)
                a_i = int(a)
                b_i = int(b)
                if a_i <= b_i:
                    ids.update(range(a_i, b_i + 1))
                else:
                    ids.update(range(b_i, a_i + 1))
            except ValueError:
                continue
        else:
            try:
                ids.add(int(part))
            except ValueError:
                continue
    return ids


def slugify_name(name: str) -> str:
    s = name.strip().lower()
    s = s.replace('\u2640', '-f').replace('\u2642', '-m')
    s = re.sub(r"[^a-z0-9]+", '-', s)
    s = re.sub(r'-{2,}', '-', s)
    s = s.strip('-')
    return s


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def download_url(url, out_path, verbose=False):
    try:
        r = requests.get(url, headers=HEADERS, stream=True, timeout=20)
        r.raise_for_status()
        with open(out_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        if verbose:
            print(f'    Saved: {out_path}')
        return True
    except Exception as e:
        if verbose:
            print(f'    Failed to download {url}: {e}')
        return False


def main():
    args = parse_args()
    try:
        with open(args.input_json, encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f'Failed to read input JSON {args.input_json}: {e}', file=sys.stderr)
        sys.exit(1)

    ensure_dir(args.output_dir)

    total = len(data)
    if args.partial:
        total = min(total, args.partial)
    print(f'Processing {total} pokemon from {args.input_json} -> {args.output_dir}')

    count_processed = 0
    count_images = 0

    # common extensions to try if the base URL doesn't include one
    common_exts = ['.png']

    # Optionally filter by id range
    id_filter = set()
    if getattr(args, 'id_range', None):
        id_filter = parse_id_range(args.id_range)

    for i, p in enumerate(data):
        if args.partial and i >= args.partial:
            break
        poke_id = p.get('id')
        poke_name = p.get('name')
        if not poke_name:
            continue
        if id_filter and (poke_id not in id_filter):
            # skip IDs not in the requested set
            if args.verbose:
                print(f'[{i+1}/{total}] Skipping id {poke_id} (not in id-range)')
            continue
        slug = slugify_name(poke_name)
        if args.verbose:
            print(f'[{i+1}/{total}] {poke_id} - {poke_name} -> slug: {slug}')

        for idx, (key, base) in enumerate(BASE_URLS.items(), start=1):
            # build base + slug
            base_clean = base.rstrip('/')
            candidate_base = base_clean + '/' + slug

            # determine whether base already has an extension in its path
            parsed_base = urlparse(candidate_base)
            base_ext = os.path.splitext(parsed_base.path)[1].lower()

            tried = False
            success = False
            # Try .png first (user request), then the raw candidate, then other common extensions
            if base_ext:
                candidates = [candidate_base]
            else:
                candidates = [candidate_base + '.png', candidate_base] + [candidate_base + e for e in common_exts if e != '.png']

            for cand in candidates:
                tried = True
                if args.verbose:
                    print(f'    Trying: {cand}')
                parsed = urlparse(cand)
                ext = os.path.splitext(parsed.path)[1]
                # include key in filename so we know which source produced the image
                safe_key = re.sub(r'[^a-z0-9_-]+', '', str(key))
                out_fname = f"{poke_id}-{safe_key}{ext}"
                out_path = os.path.join(args.output_dir, out_fname)
                if os.path.exists(out_path):
                    if args.verbose:
                        print(f'    Already exists, skipping: {out_fname}')
                    success = True
                    break
                ok = download_url(cand, out_path, verbose=args.verbose)
                if ok:
                    count_images += 1
                    success = True
                    break
                # polite delay between tries
                time.sleep(max(0.0, float(args.delay)))

            if not tried and args.verbose:
                print(f'    No candidates tried for base: {base}')

        count_processed += 1

    print(f'Done. Processed {count_processed} pokemon; downloaded {count_images} images.')


if __name__ == '__main__':
    main()
