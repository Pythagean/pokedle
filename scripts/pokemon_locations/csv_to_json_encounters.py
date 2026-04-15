#!/usr/bin/env python3
"""Convert CSV encounter rows into per-pokemon JSON matching example structure.

Usage:
  python csv_to_json_encounters.py --input-csv encounters.csv --output-json encounters.json [--pokemon-json pokemon_data.json]

If provided, --pokemon-json will be used to look up canonical Pokemon names by id.
"""

import argparse
import csv
import json
import os
from collections import defaultdict


KNOWN_REGIONS = {"kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar"}


def infer_region(location_name: str) -> str:
    if not location_name:
        return ""
    parts = location_name.split()
    if parts:
        first = parts[0].lower().strip()
        if first in KNOWN_REGIONS:
            return first.capitalize()
    return ""


# Map common game short-names (as seen in CSV `games` column) to canonical regions
GAME_TO_REGION = {
    # Kanto
    "red": "Kanto", "blue": "Kanto", "yellow": "Kanto",
    "firered": "Kanto", "leafgreen": "Kanto",
    "let's go": "Kanto",
    # Johto
    "gold": "Johto", "silver": "Johto", "crystal": "Johto",
    # Hoenn
    "ruby": "Hoenn", "sapphire": "Hoenn", "emerald": "Hoenn"
}


# Map game names to their generation number
GAME_TO_GENERATION = {
    # Gen 1
    "red": 1, "blue": 1, "yellow": 1,
    # Gen 2
    "gold": 2, "silver": 2, "crystal": 2,
    # Gen 3
    "ruby": 3, "sapphire": 3, "emerald": 3,
    "firered": 3, "leafgreen": 3,
}


def infer_generation_from_games(games: list) -> int:
    """Infer generation number by majority vote from a list of game identifiers."""
    if not games:
        return 0
    counts: dict = {}
    for g in games:
        key = g.lower().strip()
        gen = GAME_TO_GENERATION.get(key)
        if gen:
            counts[gen] = counts.get(gen, 0) + 1
    if not counts:
        return 0
    return max(counts.items(), key=lambda kv: kv[1])[0]


def infer_region_from_games(games: list) -> str:
    """Infer region by majority vote from a list of game identifiers."""
    if not games:
        return ""
    counts = {}
    for g in games:
        key = g.lower().strip()
        # normalize some variants
        key = key.replace(" ", " ")
        region = GAME_TO_REGION.get(key)
        if region:
            counts[region] = counts.get(region, 0) + 1
    if not counts:
        return ""
    # pick region with highest count
    best = max(counts.items(), key=lambda kv: kv[1])[0]
    return best


def format_chance(row: dict) -> str:
    # Prefer single 'rate' if present, otherwise compose morning/day/night
    rate = (row.get("rate") or "").strip()
    rm = (row.get("rate_morning") or "").strip()
    rd = (row.get("rate_day") or "").strip()
    rn = (row.get("rate_night") or "").strip()
    if rate:
        return rate
    if rm or rd or rn:
        parts = []
        if rm:
            parts.append(f"morning:{rm}")
        if rd:
            parts.append(f"day:{rd}")
        if rn:
            parts.append(f"night:{rn}")
        return ";".join(parts)
    return ""


def load_pokemon_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # accept either list of objects or mapping
    id_to_name = {}
    if isinstance(data, list):
        for entry in data:
            if "id" in entry and "name" in entry:
                id_to_name[int(entry["id"])] = entry["name"]
    elif isinstance(data, dict):
        for k, v in data.items():
            try:
                id_to_name[int(k)] = v.get("name") if isinstance(v, dict) else v
            except Exception:
                continue
    return id_to_name


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input-csv", required=True)
    p.add_argument("--output-json", required=True)
    p.add_argument("--pokemon-json", help="Optional pokemon data JSON to get canonical names by id")
    args = p.parse_args()

    id_to_name = {}
    if args.pokemon_json:
        id_to_name = load_pokemon_json(args.pokemon_json)

    groups = defaultdict(list)

    with open(args.input_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # group key: pokemon_id if present else pokemon name
            pid = row.get("pokemon_id", "")
            key = pid if pid else (row.get("pokemon", "")).strip()
            groups[key].append(row)

    out = []
    for key, rows in groups.items():
        # choose id and name
        first = rows[0]
        pid = first.get("pokemon_id", "")
        try:
            pid_int = int(pid) if pid != "" else 0
        except Exception:
            pid_int = 0
        name = ""
        if pid_int and pid_int in id_to_name:
            name = id_to_name[pid_int]
        else:
            # title-case the csv pokemon name
            name = (first.get("pokemon") or "").replace("-", " ")
            name = " ".join([w.capitalize() for w in name.split()])

        location_area_encounters = []
        for r in rows:
            games = [g.strip() for g in (r.get("games") or "").split("|") if g.strip()]
            loc_name = r.get("location_name", "")
            region = infer_region_from_games(games) or infer_region(loc_name)
            generation = infer_generation_from_games(games)
            location_area_encounters.append({
                "name": loc_name,
                "region": region,
                "generation": generation,
                "games": games,
                "method": r.get("location", ""),
                "level_range": r.get("levels", ""),
                "chance": format_chance(r),
            })

        out.append({"id": pid_int, "name": name, "location_area_encounters": location_area_encounters})

    # write JSON
    os.makedirs(os.path.dirname(os.path.abspath(args.output_json)), exist_ok=True)
    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(out)} pokemon to: {args.output_json}")


if __name__ == '__main__':
    main()
