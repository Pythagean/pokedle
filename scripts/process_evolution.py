
import sys
import json
import requests
import time


# Only process Gen 1, 2, 3
ALLOWED_GENERATIONS = {1, 2, 3}

# Verbose flag
VERBOSE = '--verbose' in sys.argv
PARTIAL = '--partial' in sys.argv

with open('../src/data/pokemon_data.json', encoding='utf-8') as f:
    pokemon_list = json.load(f)
if PARTIAL:
    pokemon_list = pokemon_list[:3]

# Build a map from id to pokemon data for quick lookup
dex_by_id = {p['id']: p for p in pokemon_list}

# Helper to get evolution chain for a species

def get_evolution_chain(chain, result=None):
    if result is None:
        result = []
    result.append({
        'species': chain['species']['name'],
        'id': int(chain['species']['url'].rstrip('/').split('/')[-1])
    })
    for evo in chain.get('evolves_to', []):
        get_evolution_chain(evo, result)
    return result

processed = []

for poke in pokemon_list:
    poke_id = poke['id']
    poke_gen = poke.get('generation', 0)
    if poke_gen not in ALLOWED_GENERATIONS:
        continue
    # Get species info
    species_url = f'https://pokeapi.co/api/v2/pokemon-species/{poke_id}/'
    if VERBOSE:
        print(f"[API] GET {species_url}")
    species_resp = requests.get(species_url)
    if species_resp.status_code != 200:
        print(f"Failed to fetch species for {poke['name']} (id={poke_id})")
        continue
    species_data = species_resp.json()
    evo_chain_url = species_data['evolution_chain']['url']
    if VERBOSE:
        print(f"[API] GET {evo_chain_url}")
    # Get evolution chain
    evo_resp = requests.get(evo_chain_url)
    if evo_resp.status_code != 200:
        print(f"Failed to fetch evolution chain for {poke['name']} (id={poke_id})")
        continue
    evo_chain = evo_resp.json()['chain']
    evo_list = get_evolution_chain(evo_chain)
    # Find if this pokemon is at the end of the chain
    poke_name = poke['name'].lower()
    # Find this pokemon in the chain
    found = False
    fully_evolved = False
    for idx, evo in enumerate(evo_list):
        if evo['species'] == poke_name:
            found = True
            # If it's the last in the chain, it's fully evolved
            if idx == len(evo_list) - 1:
                fully_evolved = True
            break
    poke['fully_evolved'] = fully_evolved
    processed.append(poke)
    if VERBOSE:
        print(f"{poke['name']} (id={poke_id}): fully_evolved = {fully_evolved}")
    time.sleep(0.2)  # Be nice to the API

with open('../src/data/pokemon_data_processed.json', 'w', encoding='utf-8') as f:
    json.dump(processed, f, ensure_ascii=False, indent=2)
