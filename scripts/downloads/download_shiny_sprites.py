#!/usr/bin/env python3
"""
Download shiny front sprites for Pokémon listed in a pokemon_data.json file.

For each Pokemon entry, this script queries the PokeAPI endpoint
`https://pokeapi.co/api/v2/pokemon/{id}` and retrieves
`sprites.front_shiny`. The image is saved as `{id}-shiny.png` in the
provided output directory.

Usage:
  python scripts/download_shiny_sprites.py --output-dir ./shiny --input public/data/pokemon_data.json

Notes:
 - The input file is expected to be a JSON array of Pokemon objects with an `id` field.
 - The script will skip IDs that do not return a shiny sprite and will report them at the end.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import List

import requests


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Download shiny front sprites via PokeAPI')
    p.add_argument('--input', '-i', default='public/data/pokemon_data.json', help='Path to pokemon_data.json')
    p.add_argument('--output-dir', '-o', required=True, help='Directory to save shiny sprites')
    p.add_argument('--start-id', type=int, default=None, help='Start ID (inclusive) to limit downloads')
    p.add_argument('--end-id', type=int, default=None, help='End ID (inclusive) to limit downloads')
    p.add_argument('--retry', type=int, default=3, help='Number of retries for API/image requests')
    p.add_argument('--delay', type=float, default=0.35, help='Delay (seconds) between API requests to avoid rate limits')
    p.add_argument('--partial', type=int, default=None, help='Only download up to this many successful sprites and then exit')
    return p.parse_args()


def load_pokemon_ids(input_path: str) -> List[int]:
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    ids = []
    if isinstance(data, dict):
        # maybe keyed by id
        for k, v in data.items():
            try:
                ids.append(int(k))
            except Exception:
                continue
    elif isinstance(data, list):
        for item in data:
            try:
                ids.append(int(item.get('id')))
            except Exception:
                continue
    else:
        raise ValueError('Unsupported pokemon_data.json format')
    return sorted(set(ids))


def get_shiny_url(session: requests.Session, poke_id: int, retries: int = 3) -> str | None:
    url = f'https://pokeapi.co/api/v2/pokemon/{poke_id}'
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=10)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            j = resp.json()
            # navigate to sprites.front_shiny, tolerate missing keys
            sprites = j.get('sprites') if isinstance(j, dict) else None
            if sprites:
                shiny = sprites.get('front_shiny')
                if shiny:
                    return shiny
            return None
        except requests.RequestException as e:
            if attempt < retries:
                wait = 1.0 * attempt
                print(f'Warning: request for id {poke_id} failed (attempt {attempt}/{retries}): {e}; retrying in {wait}s', file=sys.stderr)
                time.sleep(wait)
                continue
            print(f'Error: request for id {poke_id} failed after {retries} attempts: {e}', file=sys.stderr)
            return None


def download_image(session: requests.Session, url: str, dest_path: str, retries: int = 3) -> bool:
    for attempt in range(1, retries + 1):
        try:
            with session.get(url, stream=True, timeout=20) as r:
                r.raise_for_status()
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
            return True
        except requests.RequestException as e:
            if attempt < retries:
                wait = 1.0 * attempt
                print(f'Warning: download failed for {url} (attempt {attempt}/{retries}): {e}; retrying in {wait}s', file=sys.stderr)
                time.sleep(wait)
                continue
            print(f'Error: download failed for {url} after {retries} attempts: {e}', file=sys.stderr)
            return False


def main() -> int:
    args = parse_args()

    if not os.path.exists(args.input):
        print(f'Input file not found: {args.input}', file=sys.stderr)
        return 2

    os.makedirs(args.output_dir, exist_ok=True)

    ids = load_pokemon_ids(args.input)
    if args.start_id is not None or args.end_id is not None:
        start = args.start_id if args.start_id is not None else min(ids)
        end = args.end_id if args.end_id is not None else max(ids)
        ids = [i for i in ids if start <= i <= end]

    if not ids:
        print('No Pokémon IDs found to process.', file=sys.stderr)
        return 1

    session = requests.Session()
    missing: List[int] = []
    failed_downloads: List[int] = []

    downloaded_count = 0
    for i, pid in enumerate(ids, start=1):
        # If partial mode is set and we've reached the target, stop early
        if args.partial is not None and downloaded_count >= args.partial:
            print(f'Reached partial download target: {downloaded_count} sprites saved; exiting.')
            break
        print(f'[{i}/{len(ids)}] Processing id {pid}...')
        shiny_url = get_shiny_url(session, pid, retries=args.retry)
        if not shiny_url:
            print(f'  - No shiny sprite URL for id {pid} (skipping)')
            missing.append(pid)
            time.sleep(args.delay)
            continue

        dest = os.path.join(args.output_dir, f'{pid}-shiny.png')
        if os.path.exists(dest):
            print(f'  - File exists: {dest} (skipping download)')
            time.sleep(args.delay)
            continue

        ok = download_image(session, shiny_url, dest, retries=args.retry)
        if not ok:
            failed_downloads.append(pid)
        else:
            downloaded_count += 1
            print(f'  - Saved {dest} ({downloaded_count} saved so far)')

        time.sleep(args.delay)

    print('\nDone.')
    print(f'Total processed: {len(ids)}')
    if missing:
        print(f'Missing shiny sprite URL for IDs: {missing}')
    if failed_downloads:
        print(f'Failed downloads for IDs: {failed_downloads}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
