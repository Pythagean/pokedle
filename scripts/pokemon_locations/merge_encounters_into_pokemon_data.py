#!/usr/bin/env python3
"""
Merges new Bulbapedia encounter data into pokemon_data.json.

For every Pokemon in the input pokemon_data.json:
  - location_area_encounters       → filled from encounters.json (by pokemon ID)
  - preevolution_location_area_encounters → filled from encounters.json for all pre-evolutions
                                            (pre-evo IDs resolved via PokeAPI evolution chains)

Usage:
  python merge_encounters_into_pokemon_data.py \
    --pokemon-json ../../public/data/pokemon_data.json \
    --encounters-json ./encounters_2.json \
    --output ../../public/data/pokemon_data_new.json

Options:
  --chain-cache  Path to a JSON file to save/load PokeAPI evolution chain results
                 (avoids re-fetching on subsequent runs). Defaults to ./evo_chain_cache.json
"""

import json
import argparse
import requests
import time
import sys
from typing import Dict, List, Optional

# Only resolve evolution chains for these generations (our encounter data coverage)
GEN_1_3_MAX_ID = 386

# In-memory cache for PokeAPI responses
_api_cache: Dict[str, dict] = {}


def fetch_json(url: str, delay: float = 0.3) -> Optional[dict]:
    """Fetch a URL, using in-memory cache to avoid duplicate requests."""
    if url in _api_cache:
        return _api_cache[url]
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        _api_cache[url] = data
        time.sleep(delay)
        return data
    except requests.RequestException as e:
        print(f"  [WARN] Failed to fetch {url}: {e}", file=sys.stderr)
        return None


def extract_id_from_url(url: str) -> Optional[int]:
    """Extract numeric ID from a PokeAPI species URL."""
    try:
        return int(url.rstrip("/").split("/")[-1])
    except (ValueError, IndexError):
        return None


def walk_chain(node: dict, ancestors: List[int]):
    """
    Generator that yields (species_id, [ancestor_ids]) for every node in the chain.
    ancestors is the list of IDs that come before this node.
    """
    species_id = extract_id_from_url(node.get("species", {}).get("url", ""))
    if species_id is None:
        return
    yield species_id, ancestors
    for child in node.get("evolves_to", []):
        yield from walk_chain(child, ancestors + [species_id])


def get_preevo_ids(pokemon_id: int, chain_cache: dict) -> List[int]:
    """
    Return the list of pre-evolution Pokemon IDs for the given pokemon_id.
    Uses chain_cache (keyed by pokemon_id str) to avoid repeat API calls.

    chain_cache is a dict that maps str(pokemon_id) -> list of pre-evo IDs.
    All Pokemon in the same evolution chain are populated together.
    """
    cache_key = str(pokemon_id)
    if cache_key in chain_cache:
        return chain_cache[cache_key]

    print(f"  Fetching evolution chain for #{pokemon_id}...")

    # Step 1: get species to find the chain URL
    species_data = fetch_json(f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_id}/")
    if not species_data:
        chain_cache[cache_key] = []
        return []

    chain_url = species_data.get("evolution_chain", {}).get("url")
    if not chain_url:
        chain_cache[cache_key] = []
        return []

    # Step 2: fetch the chain
    chain_data = fetch_json(chain_url)
    if not chain_data or "chain" not in chain_data:
        chain_cache[cache_key] = []
        return []

    # Step 3: populate cache for all Pokemon in this chain at once
    for species_id, ancestors in walk_chain(chain_data["chain"], []):
        chain_cache[str(species_id)] = ancestors

    return chain_cache.get(cache_key, [])


def load_chain_cache(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_chain_cache(cache: dict, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f)


def main():
    parser = argparse.ArgumentParser(description="Merge new encounter data into pokemon_data.json")
    parser.add_argument("--pokemon-json", required=True,
                        help="Path to pokemon_data.json (input)")
    parser.add_argument("--encounters-json", required=True,
                        help="Path to encounters.json produced by csv_to_json_encounters.py")
    parser.add_argument("--output", required=True,
                        help="Path for the output pokemon_data JSON file")
    parser.add_argument("--chain-cache", default="./evo_chain_cache.json",
                        help="Path to cache file for PokeAPI evolution chain results")
    args = parser.parse_args()

    # --- Load inputs ---
    print(f"Loading pokemon data from {args.pokemon_json}...")
    with open(args.pokemon_json, encoding="utf-8") as f:
        pokemon_list = json.load(f)

    print(f"Loading encounters from {args.encounters_json}...")
    with open(args.encounters_json, encoding="utf-8") as f:
        encounters_list = json.load(f)

    # Build id → location_area_encounters from encounters.json
    encounters_map: Dict[int, list] = {}
    for entry in encounters_list:
        pid = entry.get("id")
        if pid is not None:
            encounters_map[pid] = entry.get("location_area_encounters", [])

    # Load persisted chain cache
    chain_cache = load_chain_cache(args.chain_cache)
    print(f"  Loaded {len(chain_cache)} cached evolution chain entries.")

    # --- Process each Pokemon ---
    total = len(pokemon_list)
    api_calls_made = 0

    for i, poke in enumerate(pokemon_list):
        poke_id = poke["id"]
        poke_name = poke.get("name", f"#{poke_id}")
        poke_gen = poke.get("generation", 0)

        if (i + 1) % 50 == 0 or i == 0:
            print(f"  Processing {i + 1}/{total}: {poke_name}")

        # Own encounters
        poke["location_area_encounters"] = encounters_map.get(poke_id, [])

        # Pre-evolution encounters — only resolve for Gen 1-3 (our data coverage)
        if poke_gen in (1, 2, 3) and poke_id <= GEN_1_3_MAX_ID:
            cache_size_before = len(chain_cache)
            preevo_ids = get_preevo_ids(poke_id, chain_cache)
            if len(chain_cache) > cache_size_before:
                api_calls_made += 1
        else:
            preevo_ids = []

        # Aggregate encounters for all pre-evolutions (deduplicated by object identity)
        preevo_encounters = []
        seen = set()
        for preevo_id in preevo_ids:
            for enc in encounters_map.get(preevo_id, []):
                # Use a tuple of key fields as a dedup key
                key = (
                    enc.get("name"),
                    enc.get("method"),
                    enc.get("level_range"),
                    enc.get("chance"),
                    tuple(sorted(enc.get("games", []))),
                )
                if key not in seen:
                    seen.add(key)
                    preevo_encounters.append(enc)

        poke["preevolution_location_area_encounters"] = preevo_encounters

    # Save updated chain cache
    save_chain_cache(chain_cache, args.chain_cache)
    print(f"  Saved evolution chain cache ({len(chain_cache)} entries) to {args.chain_cache}")
    print(f"  Made {api_calls_made} PokeAPI chain fetch(es) during this run.")

    # --- Write output ---
    print(f"Writing output to {args.output}...")
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(pokemon_list, f, ensure_ascii=False, indent=2)

    # Summary
    with_encounters = sum(1 for p in pokemon_list if p["location_area_encounters"])
    with_preevo = sum(1 for p in pokemon_list if p["preevolution_location_area_encounters"])
    print(f"Done. {with_encounters} Pokemon have location encounters, "
          f"{with_preevo} have pre-evolution encounters.")


if __name__ == "__main__":
    main()
