
import requests
import json
import sys

def fetch_pokemon_data(limit=10):
    # Build a set of all Gen 1-3 species names for quick lookup
    gen123_species = set()
    for gen in range(1, 4):
        url = f"https://pokeapi.co/api/v2/generation/{gen}/"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        for species in data['pokemon_species']:
            gen123_species.add(species['name'])
    verbose = '--verbose' in sys.argv
    # Fetch Pokémon from the first 3 generations
    results = []
    species_urls = set()
    for gen in range(1, 4):
        url = f"https://pokeapi.co/api/v2/generation/{gen}/"
        if verbose:
            print(f"Calling API: {url}")
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        for species in data['pokemon_species']:
            species_urls.add(species['url'])
    # If partial mode, only keep the first 3 species
    if '--partial' in sys.argv:
        species_urls = list(species_urls)[:10]
    # Get Pokémon details by species name
    pokemon_details = []
    import re

    def format_and_capitalize(val, is_color=False):
        if not val:
            return val
        # Replace dashes with spaces, capitalize each word
        s = val.replace('-', ' ')
        s = ' '.join(word.capitalize() for word in s.split(' '))
        if is_color and s.lower() == 'gray':
            s = 'Grey'
        return s

    def format_list(lst, is_color=False):
        return [format_and_capitalize(x, is_color=is_color) for x in lst]

    for species_url in species_urls:
        if verbose:
            print(f"Calling API: {species_url}")
        # Get the species id from the URL
        species_id = species_url.rstrip('/').split('/')[-1]
        # Call the species_url endpoint
        species_resp = requests.get(species_url)
        species_data = None
        if species_resp.status_code == 200:
            species_data = species_resp.json()
        # Now call the main pokemon endpoint
        poke_url = f"https://pokeapi.co/api/v2/pokemon/{species_id}/"
        if verbose:
            print(f"Calling API: {poke_url}")
        poke_response = requests.get(poke_url)
        if poke_response.status_code == 200:
            poke_data = poke_response.json()
            poke_obj = {"name": format_and_capitalize(poke_data.get("name"))}

            # --- Evolution stage logic ---
            # Get evolution chain URL from species_data
            evo_stage = 1
            if species_data and "evolution_chain" in species_data:
                evo_chain_url = species_data["evolution_chain"]["url"]
                evo_chain_resp = requests.get(evo_chain_url)
                if evo_chain_resp.status_code == 200:
                    evo_chain = evo_chain_resp.json()["chain"]
                    # Traverse the chain, counting only Gen 1-3 species
                    def find_stage(chain, target_name, stage=1):
                        name = chain["species"]["name"]
                        # Only count if in Gen 1-3
                        if name not in gen123_species:
                            return None
                        if name == poke_data["name"]:
                            return stage
                        for evo in chain.get("evolves_to", []):
                            result = find_stage(evo, target_name, stage+1)
                            if result:
                                return result
                        return None
                    stage = find_stage(evo_chain, poke_data["name"], 1)
                    if stage:
                        evo_stage = stage
            poke_obj["evolution_stage"] = evo_stage
            # --- Species data fields ---
            if species_data:
                # color: save as a single string
                color = species_data.get("color", {})
                poke_obj["color"] = format_and_capitalize(color["name"], is_color=True) if "name" in color else None
                # egg_groups: array of strings
                poke_obj["egg_groups"] = format_list([eg["name"] for eg in species_data.get("egg_groups", [])])
                # flavor_text_entries: array of strings, replace Pokémon name with "..."
                flavor_texts = []
                seen_flavor_texts = set()
                name_regex = re.compile(re.escape(poke_obj["name"]), re.IGNORECASE)
                for entry in species_data.get("flavor_text_entries", []):
                    if entry.get("language", {}).get("name") == "en":
                        text = entry.get("flavor_text", "")
                        text = name_regex.sub("[...]", text)
                        text = text.replace("\n", " ")
                        text = text.replace("\u00e9", "e")
                        text = text.replace("\u00ad ", "")
                        text = text.replace("\u2019", "'")
                        text = text.replace("\u00ad", "")
                        text = text.replace("\u201c", "\"")
                        text = text.replace("\u201d", "\"")
                        text = text.replace("\u2014", ". ")
                        text = text.replace("\f", " ")
                        if text not in seen_flavor_texts:
                            flavor_texts.append(text)
                            seen_flavor_texts.add(text)
                poke_obj["flavor_text_entries"] = flavor_texts
                # genera: single string, genus where language.name == "en"
                genus = next((g["genus"] for g in species_data.get("genera", []) if g.get("language", {}).get("name") == "en"), None)
                if genus:
                    genus = genus.replace("\u00e9", "e")
                poke_obj["genus"] = genus
                # generation: convert generation-i to 1, generation-ii to 2, generation-iii to 3
                gen_map = {"generation-i": 1, "generation-ii": 2, "generation-iii": 3}
                gen_name = species_data.get("generation", {}).get("name")
                poke_obj["generation"] = gen_map.get(gen_name, gen_name)
                # habitat: single string
                poke_obj["habitat"] = format_and_capitalize(species_data.get("habitat", {}).get("name"))
                # shape: single string
                poke_obj["shape"] = format_and_capitalize(species_data.get("shape", {}).get("name"))
            # --- End species data fields ---
            # Abilities: array of ability names
                poke_obj["abilities"] = format_list([a["ability"]["name"] for a in poke_data.get("abilities", [])])
            # Cries, height, held_items, id, location_area_encounters, sprites, stats, weight
            poke_obj["cries"] = poke_data.get("cries")
            poke_obj["height"] = poke_data.get("height") / 10
            # held_items: only grab item.name as array of strings
            poke_obj["held_items"] = format_list([item["item"]["name"] for item in poke_data.get("held_items", []) if "item" in item and "name" in item["item"]])
            poke_obj["id"] = poke_data.get("id")
            # location_area_encounters: fetch and extract location names if link exists
            encounters_url = poke_data.get("location_area_encounters")
            if verbose and encounters_url:
                print(f"Calling API: {encounters_url}")
            location_names = set()
            allowed_versions = {
                "red", "blue", "yellow", "red-blue",
                "gold", "silver", "crystal",
                "ruby", "sapphire", "emerald", "ruby-sapphire",
                "firered-leafgreen", "heartgold-soulsilver"
            }
            if encounters_url:
                try:
                    encounters_resp = requests.get(encounters_url)
                    if encounters_resp.status_code == 200:
                        encounters_data = encounters_resp.json()
                        for entry in encounters_data:
                            loc_name = entry.get("location_area", {}).get("name")
                            if not loc_name:
                                continue
                            # Check version_details for allowed versions
                            version_details = entry.get("version_details", [])
                            for v in version_details:
                                version = v.get("version", {}).get("name")
                                if version in allowed_versions:
                                    # Clean up location name
                                    import re
                                    loc_name_clean = loc_name
                                    if "route" not in loc_name_clean:
                                        # Remove everything from the closest '-' before a number onwards, unless 'b' is directly before the number
                                        match = re.search(r"(\d+)", loc_name_clean)
                                        if match:
                                            num_start = match.start(1)
                                            dash_idx = loc_name_clean.rfind('-', 0, num_start)
                                            # If 'b' is directly before the number, skip removal and keep original
                                            if dash_idx != -1 and loc_name_clean[dash_idx-1:dash_idx] == 'b':
                                                loc_name_clean = loc_name
                                            elif dash_idx != -1:
                                                loc_name_clean = loc_name_clean[:dash_idx]
                                    # If 'safari-zone' in name, remove everything after that
                                    safari_idx = loc_name_clean.find('safari-zone')
                                    if safari_idx != -1:
                                        loc_name_clean = loc_name_clean[:safari_idx+11]
                                    # Remove '-area' if present
                                    if loc_name_clean.endswith("-area"):
                                        loc_name_clean = loc_name_clean[:-5]
                                    # Remove trailing hyphen if present
                                    if loc_name_clean.endswith("-"):
                                        loc_name_clean = loc_name_clean[:-1]
                                    location_names.add(loc_name_clean)
                                    break
                except Exception:
                    pass
                locs = format_list(list(location_names))
                locs.sort()
                poke_obj["location_area_encounters"] = locs
            # Moves: only moves with level-up method, array of move names
            moves = []
            for m in poke_data.get("moves", []):
                for vgd in m.get("version_group_details", []):
                    if vgd.get("move_learn_method", {}).get("name") == "level-up":
                        # Only include if version_group name is in allowed_versions
                        version_group = vgd.get("version_group", {}).get("name")
                        if version_group in allowed_versions:
                            moves.append(m["move"]["name"])
                            break
                poke_obj["moves"] = format_list(moves)
            # Sprites: only save back_default, front_default, and official-artwork.front_default as official_artwork
            sprites = poke_data.get("sprites", {})
            sprites_obj = {
                "back_default": sprites.get("back_default"),
                "front_default": sprites.get("front_default"),
            }
            # Get official-artwork.front_default
            official_artwork = sprites.get("other", {}).get("official-artwork", {}).get("front_default")
            sprites_obj["official_artwork"] = official_artwork
            poke_obj["sprites"] = sprites_obj
            # Stats: convert array to object {stat_name: base_stat}
            stats_obj = {}
            for stat in poke_data.get("stats", []):
                stat_name = stat.get("stat", {}).get("name")
                base_stat = stat.get("base_stat")
                if stat_name is not None and base_stat is not None:
                    stats_obj[stat_name] = base_stat
            poke_obj["stats"] = stats_obj
            # Types: array of type names
            poke_obj["types"] = format_list([t["type"]["name"] for t in poke_data.get("types", [])])
            poke_obj["weight"] = poke_data.get("weight") / 10
            pokemon_details.append(poke_obj)
    # Sort by id ascending
    pokemon_details.sort(key=lambda x: x.get("id", 0))
    return pokemon_details

if __name__ == "__main__":
    pokemon_data = fetch_pokemon_data()
    with open("./data/pokemon_data.json", "w") as f:
        json.dump(pokemon_data, f, indent=2)
    print(f"Data for {len(pokemon_data)} Pokémon saved to pokemon_data.json")
