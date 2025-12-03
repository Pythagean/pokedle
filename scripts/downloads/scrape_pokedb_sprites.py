#!/usr/bin/env python3
"""
Scrape Pokémon sprite images from pokemondb.net for a list of Pokémon.

Usage:
  python scrape_pokedb_sprites.py --input-json ../public/data/pokemon_data.json --output-dir ./out --partial 10

This script extracts image URLs from pages like:
  https://pokemondb.net/sprites/{pokemon-name}
and downloads images whose `src` looks like sprite images (hosted under img.pokemondb.net/sprites).

Dependencies: requests, beautifulsoup4
Install: pip install requests beautifulsoup4
"""

import argparse
import json
import os
import re
import sys
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
try:
    from PIL import Image
    HAS_PIL = True
except Exception:
    HAS_PIL = False

HEADERS = {
    'User-Agent': 'pokedle-sprite-scraper/1.0 (+https://github.com/Pythagean/pokedle)'
}

POKEDB_BASE = 'https://pokemondb.net/sprites/'

# Hardcoded substrings: if the final filename contains any of these substrings
# (case-insensitive) the file will be skipped and not saved. Edit this list
# to add or remove patterns you want to filter out (e.g. 'animated', 'back').
SKIP_SUBSTRINGS = [
    'shiny',
    'bank',
    '-f',
    'back',
    'gigantamax',
    '-mega',
    '1x'
    'home'
]

# Map path-prefix -> generation string. Edit this dict to add mappings.
# If the constructed filename begins with one of these prefixes, the
# corresponding generation string will be appended before the extension.
GEN_MAP = {
     'red-blue': '1',
     'crystal': '2',
     'emerald': '3',
     'heartgold-soulsilver': '4',
     'black-white': '5',
     'x-y': '6',
     'lets-go-pikachu': '7',
     'brilliant-diamond-shining-pearl': '8',
     'scarlet-violet': '9'
}


def parse_args():
    p = argparse.ArgumentParser(description='Scrape sprite images from pokemondb.net')
    p.add_argument('--input-json', required=True, help='Path to pokemon_data.json')
    p.add_argument('--partial', type=int, default=None, help='Only process the first X pokemon')
    p.add_argument('--output-dir', required=True, help='Directory to save downloaded images')
    p.add_argument('--delay', type=float, default=1.0, help='Seconds to wait between requests (default 1.0)')
    p.add_argument('--verbose', action='store_true', help='Print verbose progress')
    p.add_argument('--all', action='store_true', help='Also save all discovered sprite files into OUTPUT_DIR/all/ preserving their original path under /sprites/')
    return p.parse_args()


def slugify_name(name: str) -> str:
    """Create a URL slug usable on pokemondb.net from a Pokémon name.
    This is a best-effort approach: lower-case, replace spaces and dots with '-', remove problematic characters.
    """
    s = name.strip().lower()
    # common gender symbols mapping
    s = s.replace('\u2640', '-f').replace('\u2642', '-m')
    # replace non-alphanumeric with hyphen
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


def crop_transparent_border(image_path, padding=5, verbose=False):
    """Crop transparent border from an image, leaving `padding` pixels."""
    if not HAS_PIL:
        if verbose:
            print('    Pillow not installed; skipping crop for', image_path)
        return False
    try:
        im = Image.open(image_path)
    except Exception as e:
        if verbose:
            print(f'    Failed to open image for cropping {image_path}: {e}')
        return False
    # Skip GIFs (animated) to avoid complex frame handling
    if getattr(im, 'format', '') == 'GIF':
        if verbose:
            print(f'    Skipping GIF crop: {os.path.basename(image_path)}')
        return False
    # Need an alpha channel to detect transparent border
    if 'A' not in im.getbands():
        if verbose:
            print(f'    No alpha channel, skipping crop: {os.path.basename(image_path)}')
        return False
    try:
        alpha = im.split()[-1]
        bbox = alpha.getbbox()
        if not bbox:
            if verbose:
                print(f'    Image fully transparent? skipping crop: {os.path.basename(image_path)}')
            return False
        left, upper, right, lower = bbox
        left = max(0, left - padding)
        upper = max(0, upper - padding)
        right = min(im.width, right + padding)
        lower = min(im.height, lower + padding)
        # If bbox covers whole image within padding, nothing to do
        if left == 0 and upper == 0 and right == im.width and lower == im.height:
            if verbose:
                print(f'    No transparent border to crop: {os.path.basename(image_path)}')
            return False
        cropped = im.crop((left, upper, right, lower))
        # Preserve format and save
        try:
            cropped.save(image_path)
            if verbose:
                print(f'    Cropped transparent border: {os.path.basename(image_path)}')
            return True
        except Exception as e:
            if verbose:
                print(f'    Failed to save cropped image {image_path}: {e}')
            return False
    except Exception as e:
        if verbose:
            print(f'    Error during cropping {image_path}: {e}')
        return False


def find_sprite_images(soup: BeautifulSoup):
    imgs = []
    # Look for <img> tags whose src contains the pokedb sprite host or '/sprites/' path
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src')
        if not src:
            continue
        # Normalize
        src_l = src.lower()
        if 'img.pokemondb.net' in src_l and '/sprites/' in src_l:
            imgs.append(src)
        elif '/sprites/' in src_l:
            imgs.append(src)
    # Deduplicate while preserving order
    seen = set()
    out = []
    for u in imgs:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


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
    for i, p in enumerate(data):
        if args.partial and i >= args.partial:
            break
        poke_id = p.get('id')
        poke_name = p.get('name')
        if not poke_name:
            continue
        slug = slugify_name(poke_name)
        page_url = urljoin(POKEDB_BASE, slug)
        if args.verbose:
            print(f'[{i+1}/{total}] {poke_id} - {poke_name} -> {page_url}')
        try:
            resp = requests.get(page_url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')
            img_urls = find_sprite_images(soup)
            if args.verbose:
                print(f'    Found {len(img_urls)} sprite image(s)')
            if not img_urls:
                # try alternative: look for images under table or section with class 'grid-col' etc.
                # fallback: find images inside main content only
                main = soup.find('main') or soup
                more = []
                for img in main.find_all('img'):
                    src = img.get('src') or img.get('data-src')
                    if not src:
                        continue
                    if src.lower().startswith('http'):
                        more.append(src)
                # dedupe
                img_urls = []
                for u in more:
                    if u not in img_urls and ("img.pokemondb.net" in u.lower() or "/sprites/" in u.lower()):
                        img_urls.append(u)
                if args.verbose:
                    print(f'    Fallback found {len(img_urls)} image(s)')

            if img_urls:
                # Save all matched files into the main output directory
                out_dir_for_poke = args.output_dir
                for url in img_urls:
                    # make absolute URL if needed
                    if url.startswith('//'):
                        url = 'https:' + url
                    elif url.startswith('/'):
                        url = urljoin(page_url, url)
                    parsed = urlparse(url)
                    # Build filename using everything after '/sprites/' in the path.
                    # Example: /sprites/red-blue/normal/bulbasaur.png -> red-blue_normal_bulbasaur.png
                    path = parsed.path or ''
                    fname = None
                    marker = '/sprites/'
                    if marker in path:
                        after = path.split(marker, 1)[1]
                        # split into segments
                        parts = [p for p in after.split('/') if p]
                        if parts:
                            # last part may contain extension
                            last = parts[-1]
                            base, ext = os.path.splitext(last)
                            parts[-1] = base
                            safe_parts = [p for p in parts]
                            joined = '_'.join(safe_parts)
                            # preserve extension if present
                            fname = joined + (ext or '')
                    if not fname:
                        # fallback to basename
                        fname = os.path.basename(parsed.path)

                    # If --all is specified, save the original sprite path into
                    # OUTPUT_DIR/all/<original path under /sprites/> (do not apply SKIP_SUBSTRINGS)
                    if args.all:
                        try:
                            # derive original relative path under /sprites/
                            orig_rel = None
                            marker = '/sprites/'
                            if marker in path:
                                orig_rel = path.split(marker, 1)[1]
                            else:
                                orig_rel = parsed.path.lstrip('/')
                            # build destination path under output_dir/all/
                            parts = [p for p in orig_rel.split('/') if p]
                            if parts:
                                dest_rel = os.path.join(*parts)
                            else:
                                dest_rel = os.path.basename(parsed.path)
                            all_out_path = os.path.join(args.output_dir, 'all', dest_rel)
                            all_out_dir = os.path.dirname(all_out_path)
                            ensure_dir(all_out_dir)
                            if not os.path.exists(all_out_path):
                                if args.verbose:
                                    print(f"    Saving original to all/: {os.path.relpath(all_out_path, args.output_dir)}")
                                download_url(url, all_out_path, verbose=args.verbose)
                            else:
                                if args.verbose:
                                    print(f"    Already exists in all/, skipping: {os.path.relpath(all_out_path, args.output_dir)}")
                        except Exception:
                            if args.verbose:
                                print(f"    Failed to save original/all copy for: {fname}")
                    # Determine generation from the constructed filename using GEN_MAP
                    # Only save files that match a GEN_MAP prefix. The final saved
                    # filename will be `{pokemonId}-{generation}.{extension}`.
                    try:
                        lf = fname.lower() if isinstance(fname, str) else ''
                        gen_found = None
                        for prefix, gen in GEN_MAP.items():
                            if not prefix:
                                continue
                            p_l = prefix.lower()
                            if lf.startswith(p_l):
                                # Special-case: for 'red-blue' prefer the color sprite only
                                if p_l == 'red-blue' and 'color' not in lf:
                                    # do not treat this as a generation match
                                    continue
                                gen_found = gen
                                break
                        if not gen_found:
                            if args.verbose:
                                print(f"    Skipping (no GEN_MAP match): {fname}")
                            continue
                    except Exception:
                        if args.verbose:
                            print(f"    Skipping (error determining generation): {fname}")
                        continue

                    # Check skip list (case-insensitive) and avoid saving if matched
                    lower_fname = fname.lower() if isinstance(fname, str) else ''
                    skip = False
                    for sub in SKIP_SUBSTRINGS:
                        try:
                            if sub and sub.lower() in lower_fname:
                                skip = True
                                break
                        except Exception:
                            continue
                    if skip:
                        if args.verbose:
                            print(f"    Skipping (matched skip-list): {fname}")
                        continue

                    # Build final output filename: {pokemonId}-{generation}.{extension}
                    base_name, ext = os.path.splitext(fname)
                    ext = ext or ''
                    out_fname = f"{poke_id}-{gen_found}{ext}"
                    out_path = os.path.join(out_dir_for_poke, out_fname)

                    # If this is a GIF, save it into a dedicated 'gifs' subdirectory
                    # inside the main output directory (flattened), e.g. ./output_dir/gifs/
                    try:
                        if ext.lower() == '.gif':
                            gif_dir = os.path.join(args.output_dir, 'gifs')
                            ensure_dir(gif_dir)
                            out_path = os.path.join(gif_dir, out_fname)
                            if args.verbose:
                                print(f"    Saving GIF to subdirectory: {os.path.relpath(out_path, args.output_dir)}")
                    except Exception:
                        # if anything goes wrong determining GIF path, fall back to main out_path
                        pass

                    # Avoid overwriting an existing file
                    if os.path.exists(out_path):
                        if args.verbose:
                            print(f"    Already exists, skipping: {os.path.relpath(out_path, args.output_dir)}")
                        continue

                    if args.verbose:
                        print(f"    Saving: {os.path.relpath(out_path, args.output_dir)}")

                    success = download_url(url, out_path, verbose=args.verbose)
                    if success:
                        # After successful download, crop transparent border for non-GIF images
                        try:
                            ext_low = os.path.splitext(out_path)[1].lower()
                            if ext_low != '.gif':
                                crop_transparent_border(out_path, padding=5, verbose=args.verbose)
                        except Exception:
                            pass
                        count_images += 1
                count_processed += 1
            else:
                if args.verbose:
                    print('    No sprite images found on page')
        except Exception as e:
            print(f'  Error fetching {page_url}: {e}', file=sys.stderr)
        # polite delay
        time.sleep(max(0.0, float(args.delay)))

    print(f'Done. Processed {count_processed} pokemon; downloaded {count_images} images.')


if __name__ == '__main__':
    main()
