#!/usr/bin/env python3
"""
Script to enhance Pokemon data with location encounter information.

This script:
1. Renames location_area_encounters to introduced_gen_location_area_encounters
2. Adds preevolution_location_area_encounters from pre-evolutions
3. Adds all_location_area_encounters filtered by specific game versions
"""

import json
import argparse
import requests
import time
import re
from typing import Dict, List, Set, Optional
import sys

# Simple in-memory cache of URL -> JSON response to avoid duplicate network calls
response_cache: Dict[str, Optional[Dict]] = {}

# Valid game versions to filter encounters
VALID_VERSIONS = {
    'red', 'blue', 'firered', 'leafgreen', 'yellow',
    'heartgold', 'soulsilver', 'gold', 'silver', 'crystal',
    'ruby', 'sapphire', 'emerald', 'omega-ruby', 'alpha-sapphire'
}

def get_evolution_chain(pokemon_id: int) -> Optional[Dict]:
    """
    Fetch the evolution chain for a Pokemon.
    
    Args:
        pokemon_id: The Pokemon ID
        
    Returns:
        Evolution chain data or None if request fails
    """
    try:
        # Get species data to find evolution chain URL
        species_url = f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_id}"
        print(f"  Fetching species data: {species_url}")
        if species_url in response_cache:
            species_data = response_cache[species_url]
        else:
            species_response = requests.get(species_url, timeout=10)
            species_response.raise_for_status()
            species_data = species_response.json()
            response_cache[species_url] = species_data
        
        # Get evolution chain
        evolution_chain_url = species_data.get('evolution_chain', {}).get('url')
        if not evolution_chain_url:
            print(f"  No evolution chain URL found for Pokemon {pokemon_id}")
            return None
            
        print(f"  Fetching evolution chain: {evolution_chain_url}")
        time.sleep(0.5)  # Rate limiting
        if evolution_chain_url in response_cache:
            return response_cache[evolution_chain_url]
        chain_response = requests.get(evolution_chain_url, timeout=10)
        chain_response.raise_for_status()
        chain_json = chain_response.json()
        response_cache[evolution_chain_url] = chain_json
        return chain_json
        
    except requests.RequestException as e:
        print(f"  Error fetching evolution chain for Pokemon {pokemon_id}: {e}")
        return None

def extract_preevolution_ids(chain_data: Dict, current_id: int) -> List[int]:
    """
    Extract all pre-evolution Pokemon IDs from the evolution chain.
    
    Args:
        chain_data: Evolution chain data from API
        current_id: The current Pokemon's ID
        
    Returns:
        List of pre-evolution Pokemon IDs
    """
    preevolution_ids = []
    
    def traverse_chain(chain, target_id, ancestors):
        """Recursively traverse evolution chain to find pre-evolutions."""
        # Extract ID from species URL
        species_url = chain.get('species', {}).get('url', '')
        try:
            chain_id = int(species_url.rstrip('/').split('/')[-1])
        except (ValueError, IndexError):
            return
        
        # If we found our target, return all ancestors
        if chain_id == target_id:
            preevolution_ids.extend(ancestors)
            return
        
        # Continue traversing
        new_ancestors = ancestors + [chain_id]
        for evolution in chain.get('evolves_to', []):
            traverse_chain(evolution, target_id, new_ancestors)
    
    if chain_data and 'chain' in chain_data:
        traverse_chain(chain_data['chain'], current_id, [])
    
    return preevolution_ids

def get_pokemon_encounters(pokemon_id: int) -> List[str]:
    """
    Fetch location encounters for a Pokemon, filtered by valid versions.
    
    Args:
        pokemon_id: The Pokemon ID
        
    Returns:
        List of unique location area names
    """
    try:
        encounters_url = f"https://pokeapi.co/api/v2/pokemon/{pokemon_id}/encounters"
        print(f"  Fetching encounters: {encounters_url}")
        if encounters_url in response_cache:
            encounters_data = response_cache[encounters_url]
        else:
            response = requests.get(encounters_url, timeout=10)
            response.raise_for_status()
            encounters_data = response.json()
            response_cache[encounters_url] = encounters_data

        locations = []
        # cache region lookups per location_area url to avoid duplicate API calls
        region_cache: Dict[str, Optional[str]] = {}
        for encounter in encounters_data:
            la = encounter.get('location_area', {}) or {}
            location_name = la.get('name')
            location_area_url = la.get('url')
            if not location_name:
                continue

            # Skip any unknown-* location area identifiers
            if 'unknown-' in location_name.lower():
                print(f"    Skipping location_area (unknown-*): {location_name}")
                continue

            # Check if any version_details match our valid versions and collect methods
            version_details = encounter.get('version_details', [])
            matched = False
            methods_seen: List[str] = []
            for detail in version_details:
                version_name = detail.get('version', {}).get('name', '')
                if version_name in VALID_VERSIONS:
                    matched = True
                    # gather methods from encounter_details
                    for ed in detail.get('encounter_details', []) or []:
                        method_obj = ed.get('method') or {}
                        method_name = None
                        if isinstance(method_obj, dict):
                            method_name = method_obj.get('name')
                        else:
                            method_name = method_obj
                        if not method_name:
                            continue
                        # normalize method display: replace '-' with spaces and title-case
                        mnorm = method_name.replace('-', ' ').title()
                        if mnorm not in methods_seen:
                            methods_seen.append(mnorm)
            if not matched:
                continue

            region_name = None
            if location_area_url:
                # Use shared response cache to avoid duplicate calls
                if location_area_url in response_cache:
                    la_data = response_cache[location_area_url]
                else:
                    try:
                        print(f"    Fetching location_area: {location_area_url}")
                        resp = requests.get(location_area_url, timeout=10)
                        resp.raise_for_status()
                        la_data = resp.json()
                        response_cache[location_area_url] = la_data
                    except requests.RequestException as e:
                        print(f"    Error fetching location_area {location_area_url}: {e}")
                        la_data = None
                if la_data:
                    location_ref = la_data.get('location', {}) or {}
                    location_url = location_ref.get('url')
                    if location_url:
                        if location_url in response_cache:
                            loc_data = response_cache[location_url]
                        else:
                            try:
                                time.sleep(0.2)
                                print(f"    Fetching location: {location_url}")
                                loc_resp = requests.get(location_url, timeout=10)
                                loc_resp.raise_for_status()
                                loc_data = loc_resp.json()
                                response_cache[location_url] = loc_data
                            except requests.RequestException as e:
                                print(f"    Error fetching location {location_url}: {e}")
                                loc_data = None
                        if loc_data:
                            region_ref = loc_data.get('region', {}) or {}
                            region_name = region_ref.get('name')
                            if region_name:
                                region_name = region_name.replace('-', ' ').title()
            # small pause to be polite
            time.sleep(0.1)

            # Normalize and refine name (route trimming, remove 'Area')
            norm = normalize_location_name(location_name)
            if not norm:
                # Skip empty or nonsense names
                continue
            # Skip any remaining 'unknown ... bugs' items after normalization
            low = norm.lower()
            if 'unknown' in low and 'bug' in low:
                print(f"    Skipping normalized unknown-bugs location: {norm}")
                continue

            # If it's a Route, trim after the number (normalize_location_name already handles this)
            # Prepend region if available and not already present
            combined = norm
            if region_name:
                region_title = region_name.replace('-', ' ').title()
                if region_title.lower() not in combined.lower():
                    combined = f"{region_title} {combined}"

            # If any method contains 'Headbutt', collapse to a single 'Headbutt' entry
            if any('headbutt' in m.lower() for m in methods_seen):
                methods_seen = ['Headbutt']

            method_str = ', '.join(methods_seen) if methods_seen else ''
            locations.append({'region': region_name.replace('-', ' ').title() if region_name else None, 'name': combined, 'method': method_str})

        # Deduplicate while preserving order
        seen = set()
        out = []
        for item in locations:
            if item['name'] not in seen:
                seen.add(item['name'])
                out.append(item)
        return out

    except requests.RequestException as e:
        print(f"  Error fetching encounters for Pokemon {pokemon_id}: {e}")
        return []

def process_pokemon(pokemon: Dict, all_pokemon: List[Dict]) -> Dict:
    """
    Process a single Pokemon to add new location fields.
    
    Args:
        pokemon: Pokemon data dictionary
        all_pokemon: List of all Pokemon (for lookup)
        
    Returns:
        Updated Pokemon dictionary
    """
    pokemon_id = pokemon.get('id')
    pokemon_name = pokemon.get('name', 'Unknown')
    
    print(f"\nProcessing Pokemon #{pokemon_id}: {pokemon_name}")
    
    # 1. We'll compute structured `location_area_encounters` from API (region + name objects)

    
    # 2. Get evolution chain and find pre-evolutions
    chain_data = get_evolution_chain(pokemon_id)
    time.sleep(0.5)  # Rate limiting
    
    preevolution_ids = []
    if chain_data:
        preevolution_ids = extract_preevolution_ids(chain_data, pokemon_id)
        print(f"  Found {len(preevolution_ids)} pre-evolution(s): {preevolution_ids}")
    
        # 3. Collect pre-evolution locations (structured objects)
        preevo_items = []
        seen = set()
        for pre_id in preevolution_ids:
            try:
                items = get_pokemon_encounters(pre_id)
            except Exception:
                items = []
            added = 0
            for it in items:
                name = it.get('name')
                if not name or name in seen:
                    continue
                seen.add(name)
                preevo_items.append(it)
                added += 1
            print(f"  Added {added} location(s) from pre-evolution #{pre_id}")

        pokemon['preevolution_location_area_encounters'] = preevo_items
    
    # 4. Get structured location encounters for this Pokemon
    all_locations = get_pokemon_encounters(pokemon_id)
    time.sleep(0.5)  # Rate limiting
    # all_locations is a list of {'region': ..., 'name': ...}
    pokemon['location_area_encounters'] = all_locations
    print(f"  Found {len(all_locations)} structured location(s) for Pokemon {pokemon_id}")

    return pokemon

def main():
    parser = argparse.ArgumentParser(
        description='Add location encounter data to Pokemon JSON file'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to input Pokemon data JSON file'
    )
    parser.add_argument(
        '--output-json',
        required=True,
        help='Path to output Pokemon data JSON file'
    )
    parser.add_argument(
        '--partial',
        type=int,
        help='Only process first X Pokemon (for testing)'
    )
    parser.add_argument(
        '--locations-list',
        help='Path to write a newline-separated list of all location names (trimmed, unique)'
    )
    
    args = parser.parse_args()
    
    # Load input JSON
    print(f"Loading Pokemon data from: {args.input_json}")
    try:
        with open(args.input_json, 'r', encoding='utf-8') as f:
            pokemon_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input_json}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file: {e}")
        sys.exit(1)
    
    if not isinstance(pokemon_data, list):
        print("Error: Input JSON must be an array of Pokemon")
        sys.exit(1)
    
    total_pokemon = len(pokemon_data)
    print(f"Loaded {total_pokemon} Pokemon")
    
    # Limit processing if --partial specified
    if args.partial:
        pokemon_data = pokemon_data[:args.partial]
        print(f"Processing only first {args.partial} Pokemon")
    
    # Process each Pokemon
    print("\n" + "="*60)
    print("Starting Pokemon processing...")
    print("="*60)
    
    for i, pokemon in enumerate(pokemon_data):
        try:
            pokemon_data[i] = process_pokemon(pokemon, pokemon_data)
        except Exception as e:
            print(f"Error processing Pokemon #{pokemon.get('id', '?')}: {e}")
            print("Continuing with next Pokemon...")
    
    # Save output JSON
    print("\n" + "="*60)
    print(f"Saving results to: {args.output_json}")
    try:
        # If partial was used, write a slimmed output: only pokemon name and location fields
        if args.partial:
            slim = []
            for p in pokemon_data:
                entry = {
                    'name': p.get('name'),
                    'location_area_encounters': p.get('location_area_encounters', [])
                }
                # include preevolution field if present
                if 'preevolution_location_area_encounters' in p:
                    entry['preevolution_location_area_encounters'] = p.get('preevolution_location_area_encounters', [])
                slim.append(entry)
            out_data = slim
        else:
            out_data = pokemon_data

        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(out_data, f, indent=2, ensure_ascii=False)
        print("Successfully saved output file!")
    except IOError as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

    # If requested, write a deduped locations list file
    if args.locations_list:
        try:
            locs = []
            seen = set()
            # collect from processed pokemon
            for p in pokemon_data:
                for item in p.get('location_area_encounters', []) or []:
                    name = item.get('name') if isinstance(item, dict) else item
                    if not name:
                        continue
                    # Replace ' Sea ' with ' '
                    name_proc = re.sub(r"\bSea\b", "", name, flags=re.IGNORECASE).strip()
                    # Trim after keywords
                    trim_keywords = ['Cave','Tower','Mortar','Mansion','Zone','City','Town','Road','Silver','Origin','Islands','Tunnel','Moon']
                    low = name_proc.lower()
                    cut_idx = None
                    for kw in trim_keywords:
                        m = re.search(rf"\b{re.escape(kw)}\b", name_proc, flags=re.IGNORECASE)
                        if m:
                            idx = m.end()
                            if cut_idx is None or idx < cut_idx:
                                cut_idx = idx
                    if cut_idx:
                        name_proc = name_proc[:cut_idx].rstrip()
                    # Normalize spaces
                    name_proc = re.sub(r"\s+", " ", name_proc).strip()
                    if name_proc and name_proc not in seen:
                        seen.add(name_proc)
                        locs.append(name_proc)

            # write file (one per line)
            with open(args.locations_list, 'w', encoding='utf-8') as lf:
                for n in locs:
                    lf.write(n + '\n')
            print(f"Wrote {len(locs)} unique locations to: {args.locations_list}")
        except IOError as e:
            print(f"Error writing locations list file: {e}")
            sys.exit(1)
    
    print("\nProcessing complete!")
    print(f"Processed: {len(pokemon_data)} Pokemon")

def normalize_location_name(name: str, region: Optional[str] = None) -> str:
    """Normalize and refine a location name.

    - replace '-' with spaces and title-case
    - remove trailing ' Area'
    - if 'Route <number>' present, trim everything after the number (keep 'Route N')
    - if `region` provided and not already included, prepend it
    """
    if not name:
        return name
    try:
        s = name.replace('-', ' ')
        # Collapse multiple spaces
        parts = [p for p in s.split() if p]
        # Title-case each token
        parts = [p.capitalize() for p in parts]

        # If 'Route' present, trim everything after the number following 'Route'
        lower_parts = [p.lower() for p in parts]
        if 'route' in lower_parts:
            idx = lower_parts.index('route')
            # keep up to and including the number token after 'Route' if it exists
            if idx + 1 < len(parts):
                num_token = parts[idx + 1]
                m = re.match(r"(\d+)", num_token)
                if m:
                    # keep tokens up to idx+1 (inclusive)
                    parts = parts[: idx + 2]

        result = ' '.join(parts)

        # Replace ' Sea ' occurrences (case-insensitive) with a single space
        result = re.sub(r'\bSea\b', '', result, flags=re.IGNORECASE)
        result = re.sub(r'\s+', ' ', result).strip()

        # Trim after certain landmark keywords (keep the keyword). This handles
        # cases like 'Union Cave B2f' -> 'Union Cave'.
        keywords = ['Cave', 'Tower', 'Mortar', 'Mansion', 'Zone', 'City', 'Town', 'Road', 'Silver', 'Origin']
        # Find earliest match among keywords
        earliest = None
        for kw in keywords:
            m = re.search(rf"\b{re.escape(kw)}\b", result, flags=re.IGNORECASE)
            if m:
                if earliest is None or m.start() < earliest.start():
                    earliest = m
        if earliest:
            # Keep up to the end of the matched keyword
            result = result[:earliest.end()].strip()

        # Remove trailing ' Area' (case-insensitive) if present
        if result.lower().endswith(' area'):
            result = result[: -5].rstrip()

        # Prepend region if provided and not already included
        if region:
            region_title = region.replace('-', ' ').title()
            # if region not present in the name already (case-insensitive), prepend
            if region_title.lower() not in result.lower():
                result = f"{region_title} {result}".strip()

        return result
    except Exception:
        return name
    

if __name__ == '__main__':
    main()
