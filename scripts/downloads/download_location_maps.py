#!/usr/bin/env python3
"""
Download location map images from Bulbapedia based on locations referenced
in a provided `pokemon_data.json` file.

Usage:
  python scripts/download_location_maps.py --input-json path/to/pokemon_data.json --output-dir out/maps --region-map region_map.json

Notes:
- Provide an optional `--region-map` JSON mapping of location-name -> RegionName
  (e.g. {"Pewter City": "Kanto", "Cerulean City": "Kanto").
- If a location contains the word "Route" we will NOT prepend a region.
- The script fetches the Bulbapedia file page (e.g. /wiki/File:Kanto_Pewter_City_Map.png)
  and scrapes the actual image URL from the page, then downloads the PNG.

Dependencies:
  pip install requests beautifulsoup4

"""
import argparse
import json
import os
import re
import sys
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_PAGE = "https://bulbapedia.bulbagarden.net"

# Default (empty) mapping - you can pass a JSON map via --region-map
# Format: { "Pewter City": "Kanto", "Goldenrod City": "Johto" }
DEFAULT_REGION_MAP = {}

# Characters to remove/replace for safe file/page names
def clean_name_for_file(name: str) -> str:
    # strip leading/trailing whitespace
    s = name.strip()
    # replace spaces with underscores
    s = re.sub(r"\s+", "_", s)
    # remove characters that commonly break filenames or URLs
    s = re.sub(r"[\/:#?%\\<>\|\"]", "", s)
    # replace commas and semicolons with nothing
    s = s.replace(',', '')
    s = s.replace(';', '')
    # keep parentheses if present (Bulbapedia sometimes uses them) but remove trailing periods
    s = s.replace('.', '')
    return s


def extract_location_name(item):
    """Try to extract a human-facing location name from a location_area_encounters entry.
    Handles strings or common dict shapes.
    """
    if item is None:
        return None
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        # common shapes:
        # { "location_area": { "name": "viridian-city" } }
        # or { "name": "Viridian City" }
        la = item.get('location_area')
        if isinstance(la, dict):
            # may have 'name' or 'url' or 'localized_name'
            if la.get('name'):
                return la.get('name')
        if item.get('name'):
            return item.get('name')
        # sometimes API includes 'location' or nested structures
        if item.get('location') and isinstance(item['location'], dict) and item['location'].get('name'):
            return item['location']['name']
    # fallback: try to stringify
    try:
        return str(item)
    except Exception:
        return None


def find_image_url_from_file_page(page_html):
    """Given the HTML of a Bulbapedia File: page, try to find the direct image URL.
    Bulbapedia pages typically contain an <a class="internal" href="..."> linking to the image file.
    """
    soup = BeautifulSoup(page_html, 'html.parser')
    # Look for anchor with class 'internal' (link to file)
    a = soup.find('a', class_='internal')
    if a and a.get('href'):
        href = a['href']
        # some links may be protocol-relative
        if href.startswith('//'):
            return 'https:' + href
        if href.startswith('http'):
            return href
        return urljoin(BASE_PAGE, href)
    # Fallback: find image element inside .fullMedia or .thumb
    img = soup.select_one('.fullImage a img') or soup.select_one('.fullImage img') or soup.select_one('.thumbimage')
    if img and img.get('src'):
        src = img['src']
        if src.startswith('//'):
            return 'https:' + src
        if src.startswith('http'):
            return src
        return urljoin(BASE_PAGE, src)
    # Another fallback: search for og:image meta tag
    og = soup.find('meta', property='og:image')
    if og and og.get('content'):
        return og['content']
    return None


def main():
    p = argparse.ArgumentParser(description='Download Bulbapedia location map images from pokemon_data.json')
    p.add_argument('--input-json', required=True, help='Path to pokemon_data.json')
    p.add_argument('--output-dir', required=True, help='Directory to save downloaded maps')
    p.add_argument('--region-map', help='Optional JSON file mapping location name -> Region name')
    p.add_argument('--overwrite', action='store_true', help='Overwrite existing files (by default existing files are skipped)')
    p.add_argument('--delay', type=float, default=1.0, help='Delay (seconds) between requests to avoid hammering the site')
    args = p.parse_args()

    if not os.path.exists(args.input_json):
        print('Input JSON not found:', args.input_json)
        sys.exit(2)

    region_map = DEFAULT_REGION_MAP.copy()
    if args.region_map:
        if not os.path.exists(args.region_map):
            print('Region map JSON not found:', args.region_map)
            sys.exit(2)
        with open(args.region_map, 'r', encoding='utf-8') as fh:
            region_map = json.load(fh)

    with open(args.input_json, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    # Collect unique location strings
    locations = set()
    for entry in data:
        # location_area_encounters may be a key or nested under 'encounters'
        locs = entry.get('location_area_encounters') or entry.get('location_area') or entry.get('encounters') or []
        if not isinstance(locs, list):
            # sometimes it's a string or other shape
            if isinstance(locs, str):
                locations.add(locs)
            continue
        for item in locs:
            name = extract_location_name(item)
            if not name:
                continue
            # optionally normalize common URL or slug names to pretty names
            # If the name is a URL or slug like 'viridian-city', convert dashes to spaces and title-case
            if re.match(r'^[a-z0-9\-]+$', name):
                pretty = name.replace('-', ' ').replace('_', ' ')
                pretty = ' '.join([w.capitalize() for w in pretty.split()])
                locations.add(pretty)
            else:
                locations.add(name)

    print(f'Found {len(locations)} unique locations')
    os.makedirs(args.output_dir, exist_ok=True)

    session = requests.Session()
    session.headers.update({'User-Agent': 'pokedle-map-downloader/1.0 (+https://github.com/Pythagean/pokedle)'})

    missing_locations = set()
    # If the provided region_map filename looks like an overrides file, treat
    # values as full file-prefix overrides (don't append the original location name).
    overrides_mode = False
    if args.region_map:
        try:
            overrides_mode = 'override' in os.path.basename(args.region_map).lower()
        except Exception:
            overrides_mode = False
    failed_locations = {}
    for idx, loc in enumerate(sorted(locations)):
        # Skip blank
        if not loc or not loc.strip():
            continue
        # Determine whether to prefix region
        is_route = 'Route' in loc or 'route' in loc
        name_clean = clean_name_for_file(loc)
        if is_route:
            page_name = f'File:{name_clean}_Map.png'
            out_name = f'{name_clean}.png'
        else:
            override_val = region_map.get(loc)
            if not override_val:
                print(f'WARNING: no region mapping for "{loc}"; skipping (will add to region_map_todo.json)')
                missing_locations.add(loc)
                continue

            # If we're in overrides mode, the value is the full file prefix to use
            # e.g. "Kanto_Pewter_City" -> File:Kanto_Pewter_City_Map.png
            if overrides_mode:
                override_clean = clean_name_for_file(override_val)
                page_name = f'File:{override_clean}_Map.png'
                out_name = f'{override_clean}.png'
            else:
                # legacy behavior: value is a Region name
                region = override_val
                region_clean = clean_name_for_file(region)
                page_name = f'File:{region_clean}_{name_clean}_Map.png'
                out_name = f'{region_clean}_{name_clean}.png'

        out_path = os.path.join(args.output_dir, out_name)
        if os.path.exists(out_path) and not args.overwrite:
            print(f'[{idx+1}/{len(locations)}] Skipping existing: {out_name} (use --overwrite to replace)')
            continue

        page_url = f'{BASE_PAGE}/wiki/{page_name}'
        print(f'[{idx+1}/{len(locations)}] Fetching page: {page_url}')
        try:
            r = session.get(page_url, timeout=15)
            if r.status_code == 200:
                image_url = find_image_url_from_file_page(r.text)
                if not image_url:
                    print('  Could not locate image URL on page; skipping')
                    failed_locations[loc] = 'no_image_url_found_on_page'
                    continue
                print(f'  Found image URL: {image_url}')
                # Download the image
                ir = session.get(image_url, stream=True, timeout=30)
                if ir.status_code == 200:
                    with open(out_path, 'wb') as of:
                        for chunk in ir.iter_content(1024 * 8):
                            if not chunk:
                                break
                            of.write(chunk)
                    print(f'  Saved to {out_path}')
                else:
                    print(f'  Failed to download image (status {ir.status_code})')
                    failed_locations[loc] = f'image_download_status_{ir.status_code}'
            else:
                print(f'  Failed to fetch page (status {r.status_code})')
                failed_locations[loc] = f'page_fetch_status_{r.status_code}'
        except Exception as e:
            print('  Error fetching:', e)
            try:
                failed_locations[loc] = str(e)
            except Exception:
                failed_locations[loc] = 'exception_when_fetching'
        time.sleep(args.delay)

    print('Done.')

    # Write out missing locations to a todo JSON next to the provided region_map (or in scripts/ if none provided)
    if missing_locations:
        if args.region_map:
            todo_dir = os.path.dirname(os.path.abspath(args.region_map))
        else:
            todo_dir = os.path.dirname(os.path.abspath(__file__))
        todo_path = os.path.join(todo_dir, 'region_map_todo.json')

        # Load existing todo map if present
        todo_map = {}
        if os.path.exists(todo_path):
            try:
                with open(todo_path, 'r', encoding='utf-8') as tf:
                    todo_map = json.load(tf) or {}
            except Exception:
                todo_map = {}

        # Insert missing locations with empty string values if not present
        added = 0
        for m in sorted(missing_locations):
            if m not in todo_map:
                todo_map[m] = ""
                added += 1

        try:
            with open(todo_path, 'w', encoding='utf-8') as tf:
                json.dump(dict(sorted(todo_map.items())), tf, indent=2, ensure_ascii=False)
            print(f'Wrote {added} missing locations to {todo_path} (fill region names and merge into your region_map.json)')
        except Exception as e:
            print('Failed to write todo file:', e)

    # Write failed locations to a _failed json next to the region_map (or scripts/ if none provided)
    if failed_locations:
        if args.region_map:
            failed_dir = os.path.dirname(os.path.abspath(args.region_map))
        else:
            failed_dir = os.path.dirname(os.path.abspath(__file__))
        failed_path = os.path.join(failed_dir, 'region_map_failed.json')

        # Load existing failed map if present
        failed_map = {}
        if os.path.exists(failed_path):
            try:
                with open(failed_path, 'r', encoding='utf-8') as ff:
                    failed_map = json.load(ff) or {}
            except Exception:
                failed_map = {}

        # Merge new failures (overwrite existing message for the same key)
        failed_map.update(failed_locations)

        try:
            with open(failed_path, 'w', encoding='utf-8') as ff:
                json.dump(dict(sorted(failed_map.items())), ff, indent=2, ensure_ascii=False)
            print(f'Wrote {len(failed_locations)} failed locations to {failed_path}')
        except Exception as e:
            print('Failed to write failed file:', e)


if __name__ == '__main__':
    main()
