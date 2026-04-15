#!/usr/bin/env python3
"""
Scrape Pokemon encounter/location data from Bulbapedia.

For each Pokemon in pokemon_data.json (within the valid games), this script:
1. Fetches the "Game locations" section from the Bulbapedia MediaWiki API
2. Parses the game rows to extract: game(s), location name, and encounter method
3. Outputs encounter entries in the same format used by add_location_encounters.py

Output format per entry:
    {
        "name":        "Kanto Pallet Town",
        "region":      "Kanto",
        "games":       ["red", "blue", "firered", "leafgreen"],
        "method":      "Gift",
        "level_range": "5",
        "chance":      null
    }

Usage:
    # Scrape all Pokemon and write updated JSON
    python scrape_bulbapedia_locations.py --input-json ../public/data/pokemon_data.json --output-json ./pokemon_data.json

    # Test a single Pokemon
    python scrape_bulbapedia_locations.py --input-json ../public/data/pokemon_data.json --output-json ./pokemon_data.json --pokemon Bulbasaur

    # Preview scraped data without updating JSON (prints to stdout)
    python scrape_bulbapedia_locations.py --input-json ../public/data/pokemon_data.json --preview --pokemon Pikachu
"""

import json
import re
import time
import argparse
import sys
import urllib.parse
from typing import Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MEDIAWIKI_API = "https://bulbapedia.bulbagarden.net/w/api.php"

# Version names that match the existing pokedle data
VALID_VERSIONS = {
    'red', 'blue', 'firered', 'leafgreen', 'yellow',
    'gold', 'silver', 'crystal',
    'ruby', 'sapphire', 'emerald',
}

# Map Bulbapedia game page titles → valid version name(s)
# Keys are checked as substrings of the link title attribute
GAME_TITLE_MAP: List[Tuple[str, List[str]]] = [
    # Gen 1
    ("Red and Blue",               ["red", "blue"]),
    ("Pokémon Red Version",        ["red"]),
    ("Pokémon Blue Version",       ["blue"]),
    ("Pokémon Yellow",             ["yellow"]),
    # Gen 2
    ("Gold and Silver",            ["gold", "silver"]),
    ("Pokémon Gold",               ["gold"]),
    ("Pokémon Silver",             ["silver"]),
    ("Pokémon Crystal",            ["crystal"]),
    # Gen 3 main
    ("Ruby and Sapphire",          ["ruby", "sapphire"]),
    ("Pokémon Ruby",               ["ruby"]),
    ("Pokémon Sapphire",           ["sapphire"]),
    ("Pokémon Emerald",            ["emerald"]),
    ("FireRed and LeafGreen",      ["firered", "leafgreen"]),
    ("Pokémon FireRed",            ["firered"]),
    ("Pokémon LeafGreen",          ["leafgreen"]),
]

# Derive region from games present
GAME_TO_REGION: Dict[str, str] = {
    "red": "Kanto", "blue": "Kanto", "yellow": "Kanto",
    "firered": "Kanto", "leafgreen": "Kanto",
    "gold": "Johto", "silver": "Johto", "crystal": "Johto",
    "ruby": "Hoenn", "sapphire": "Hoenn", "emerald": "Hoenn",
}

# Link titles/texts that are NOT location names
NON_LOCATION_TERMS = {
    "trade", "time capsule", "event", "pal park",
    "poké transfer", "pokémon home", "global link", "wild area news",
    "island scan", "first partner pokémon", "in-game event",
    "received", "list of", "days of the week",
}

# Suffixes that indicate a link target is NOT a location
# (e.g. Pokémon articles, mechanics, characters, items)
NON_LOCATION_LINK_SUFFIXES = (
    "_(pokémon)", "_(pokemon)", "_(character)", "_(game)",
    "_(item)", "_(move)", "_(ability)", "_(mechanic)",
    "_(type)", "_(yellow)", "_(generation_i)", "_(generation_ii)",
    "_(generation_iii)",
)

# Bulbapedia article titles that are specifically non-location (game mechanics, NPCs etc.)
NON_LOCATION_TITLES_EXACT = {
    "professor oak", "professor elm", "professor birch", "professor rowan",
    "professor juniper", "professor sycamore", "professor kukui", "professor magnolia",
    "professor turo", "professor sada", "professor willow",
    "melanie", "maylene", "professor", "red", "blue",
    "friendship", "happiness",
    "starter pokémon", "first partner pokémon",
    "qr scanner", "pal park", "poké transfer", "pokémon home",
    "time capsule", "trade", "event", "mystery gift",
    # Fishing rods / encounter methods that link to their own pages
    "old rod", "good rod", "super rod", "fishing", "routes", "surfing",
    # Specific Bulbapedia disambiguation / overview pages
    "national pokédex", "pokédex",
}

# Href fragments (after /wiki/) that definitively indicate a non-location 
NON_LOCATION_HREFS = {
    "/wiki/old_rod", "/wiki/good_rod", "/wiki/super_rod",
    "/wiki/surf_(move)", "/wiki/surf", "/wiki/fishing",
    "/wiki/trade", "/wiki/national_pok%c3%a9dex",
}

# Method keywords to detect in the description text
METHOD_KEYWORDS = [
    (["first partner", "starter pokémon", "from professor", "received from"],  "Gift"),
    (["received"],                                                              "Gift"),
    (["island scan"],                                                           "Island Scan"),
    (["old rod"],                                                               "Old Rod"),
    (["good rod"],                                                              "Good Rod"),
    (["super rod"],                                                             "Super Rod"),
    (["fishing", " rod"],                                                       "Fishing"),
    (["surf"],                                                                  "Surf"),
    (["headbutt"],                                                              "Headbutt"),
    (["rock smash"],                                                            "Rock Smash"),
    (["pal park"],                                                              "Pal Park"),
    (["time capsule"],                                                          "Time Capsule"),
    (["trade"],                                                                 "Trade"),
    (["only one"],                                                              "Gift"),
]

# Request rate-limiting delay (seconds)
REQUEST_DELAY = 0.8

# Simple cache: url → response JSON
_cache: Dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "pokedle-data-scraper/1.0 (https://github.com/your-repo; educational use)"
})


def api_get(params: dict) -> Optional[dict]:
    """Make a rate-limited GET request to the Bulbapedia MW API."""
    params["format"] = "json"
    cache_key = MEDIAWIKI_API + "?" + urllib.parse.urlencode(sorted(params.items()))
    if cache_key in _cache:
        return _cache[cache_key]

    try:
        resp = SESSION.get(MEDIAWIKI_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        _cache[cache_key] = data
        time.sleep(REQUEST_DELAY)
        return data
    except (requests.RequestException, ValueError) as e:
        print(f"    API error: {e}", file=sys.stderr)
        return None


def pokemon_page_title(name: str) -> str:
    """Convert a Pokemon name to its Bulbapedia page title."""
    # Special-case names that differ from simple "(Pokémon)" suffix
    special = {
        "Nidoran♀":  "Nidoran♀_(Pokémon)",
        "Nidoran♂":  "Nidoran♂_(Pokémon)",
        "Mr. Mime":  "Mr._Mime_(Pokémon)",
        "Farfetch'd": "Farfetch'd_(Pokémon)",
        "Farfetchd":  "Farfetch'd_(Pokémon)",
        "Ho-Oh":     "Ho-Oh_(Pokémon)",
        "Mime Jr.":  "Mime_Jr._(Pokémon)",
        "Porygon-Z": "Porygon-Z_(Pokémon)",
        "Porygon2":  "Porygon2_(Pokémon)",
        "Jangmo-o":  "Jangmo-o_(Pokémon)",
        "Hakamo-o":  "Hakamo-o_(Pokémon)",
        "Kommo-o":   "Kommo-o_(Pokémon)",
        "Flabébé":   "Flabébé_(Pokémon)",
        "Type: Null": "Type:_Null_(Pokémon)",
    }
    if name in special:
        return special[name]
    # Default: replace spaces with underscores, append _(Pokémon)
    return name.replace(" ", "_") + "_(Pokémon)"


def get_game_locations_section_index(page_title: str) -> Optional[str]:
    """Return the section index string for 'Game locations' on the given page."""
    data = api_get({"action": "parse", "page": page_title, "prop": "sections"})
    if not data or "parse" not in data:
        return None
    for section in data["parse"].get("sections", []):
        if section.get("line", "").strip().lower() == "game locations":
            return section["index"]
    return None


def get_section_html(page_title: str, section_index: str) -> Optional[str]:
    """Fetch the rendered HTML for a specific section."""
    data = api_get({
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "section": section_index,
        "disablelimitreport": "1",
        "disableeditsection": "1",
    })
    if not data:
        return None
    return data.get("parse", {}).get("text", {}).get("*")


# ---------------------------------------------------------------------------
# HTML Parsing
# ---------------------------------------------------------------------------

def title_to_versions(link_title: str) -> List[str]:
    """Map a Bulbapedia game link title to a list of valid version names."""
    versions = []
    for keyword, ver_list in GAME_TITLE_MAP:
        if keyword.lower() in link_title.lower():
            for v in ver_list:
                if v in VALID_VERSIONS and v not in versions:
                    versions.append(v)
            if versions:
                return versions
    return versions


def get_games_from_th_group(th_tags) -> List[str]:
    """Extract matched valid version names from a group of <th> game-header cells."""
    versions = []
    for th in th_tags:
        for a in th.find_all("a"):
            title = a.get("title", "")
            for v in title_to_versions(title):
                if v not in versions:
                    versions.append(v)
            # Also check the visible text (e.g. "Red", "Blue")
            if not versions:
                text = a.get_text(strip=True)
                for v in title_to_versions(text):
                    if v not in versions:
                        versions.append(v)
    return versions


def infer_method(text: str) -> str:
    """Guess encounter method from the description text."""
    lower = text.lower()
    for keywords, method in METHOD_KEYWORDS:
        if any(kw in lower for kw in keywords):
            return method
    # Default: assume wild encounter (Walk)
    return "Walk"


def extract_level_range(text: str) -> Optional[str]:
    """Extract a level or level range string like '5', '3-6' from description text."""
    # Match "level X", "Lv. X", "LX", or a standalone number (often in parentheses)
    match = re.search(r'\blevel[s]?\s+(\d+)(?:\s*[-–]\s*(\d+))?', text, re.IGNORECASE)
    if not match:
        match = re.search(r'\bL[Vv]\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?', text)
    if not match:
        # Try bare "5" style numbers when text is very simple (e.g. gift at level 5)
        match = re.search(r'\b(\d{1,2})\b', text)
    if not match:
        return None
    lo = match.group(1)
    # Group 2 is optional; use try/except to safely attempt retrieval
    try:
        hi = match.group(2)
    except IndexError:
        hi = None
    return f"{lo}-{hi}" if hi and lo != hi else lo


def location_links_from_cell(cell) -> List[str]:
    """Return location names from <a> links inside the description cell."""
    locations = []
    for a in cell.find_all("a"):
        title = a.get("title", "").strip()
        href  = a.get("href", "")
        text  = a.get_text(strip=True)

        # Must link to a wiki page
        if not href.startswith("/wiki/"):
            continue
        # Skip list pages, event pages, anchor-only links
        if "List_of" in href or "Event_Pok" in href or href == "/wiki/":
            continue

        # Skip if the article title has a non-location type suffix
        href_lower = href.lower()
        if any(href_lower.endswith(sfx) for sfx in NON_LOCATION_LINK_SUFFIXES):
            continue

        # Skip known non-location hrefs
        if href_lower in NON_LOCATION_HREFS:
            continue

        label = (title or text).lower()

        # Skip known non-location terms in the link text / title
        if any(term in label for term in NON_LOCATION_TERMS):
            continue

        # Skip if the full label exactly matches a known non-location
        if label in NON_LOCATION_TITLES_EXACT:
            continue

        # Skip bare "Routes" or similar overview-link text
        if re.fullmatch(r"routes?", label):
            continue

        # Skip day-of-week superscripts (2-letter abbreviations: Mo, Tu, We …)
        if len(text) <= 2 and text.isalpha():
            continue

        # Recover "Route N" when the link text is just a number,
        # e.g. <a href="/wiki/Route_21">21</a> → "Route 21"
        if text.isdigit() and re.search(r"/wiki/[A-Za-z0-9_]+_route_|/wiki/route_", href_lower):
            text = f"Route {text}"
        elif text.isdigit() and re.search(r"/wiki/[A-Z][a-z]+_(\d+)$", href):
            # Handles "/wiki/Johto_Route_34" → "Route 34" style
            match = re.search(r"_(\d+)$", href)
            if match:
                text = f"Route {match.group(1)}"
        elif text.isdigit():
            # Bare route number without a recognisable href pattern — skip it
            # (could be a route number in the described text but we can't be sure)
            # We rely on the title attribute instead
            if "route" in (title.lower() if title else ""):
                text = title  # use the full title, e.g. "Route 21"
            else:
                continue  # skip standalone numbers with unclear meaning

        loc_name = text
        if loc_name and loc_name not in locations:
            locations.append(loc_name)

    return locations


def parse_game_locations_html(html: str) -> List[Dict]:
    """
    Parse the rendered 'Game locations' section HTML from Bulbapedia.

    Returns a list of raw row dicts:
        {
            "games":     [...],       # valid version name strings
            "locations": [...],       # location name strings (may be empty)
            "method":    "...",
            "level_range": "...",     # or None
            "raw_text":  "...",       # full cell text, for debugging
        }
    """
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # The outermost game-locations table uses a type-colored border which varies by Pokemon.
    # Shared structural markers: class="roundy", style contains "margin:auto" and
    # "border: 3px solid" and "padding:2px".  The first such table in the section is
    # the main game locations table (side-games and events sections are further down).
    main_table = soup.find(
        "table",
        class_="roundy",
        style=re.compile(r"margin:auto.*border:\s*3px solid", re.S)
    )
    if not main_table:
        return results

    # Each generation group is in a <tr><td>...<table>...</table></td></tr> inside main_table.
    # Structure (with tbody intermediaries that BS4 inserts):
    #   main_table > tbody > tr > td > gen_subtable > tbody >
    #     row0: [th(gen name), td]
    #     row1: [td.roundytr.roundybottom > inner_table > tbody >
    #              game_row: [th(game), th(game), td(location)], ...]
    #
    # NOTE: Always traverse via .find('tbody') before .find_all('tr', recursive=False)
    # because tables have an implicit <tbody> wrapper in parsed HTML.

    main_tbody = main_table.find("tbody") or main_table
    for gen_row in main_tbody.find_all("tr", recursive=False):
        # Each gen_row contains a single <td> with the generation sub-table
        gen_td = gen_row.find("td", recursive=False)
        if not gen_td:
            continue
        gen_subtable = gen_td.find("table")
        if not gen_subtable:
            continue

        # The gen_subtable has a header row (generation name) and a content row.
        # The content row has another nested table with the actual game rows.
        # The content row is row index 1 (after the generation-name header row),
        # and contains a single <td> with classes like 'roundytr roundybottom'.
        gen_sub_tbody = gen_subtable.find("tbody") or gen_subtable
        gen_sub_rows = gen_sub_tbody.find_all("tr", recursive=False)
        if len(gen_sub_rows) < 2:
            continue
        content_td = gen_sub_rows[1].find("td", recursive=False)
        if not content_td:
            continue
        inner_table = content_td.find("table")
        if not inner_table:
            continue

        # Each row in inner_table: one or two <th> (game names) + one <td> (locations)
        inner_tbody = inner_table.find("tbody") or inner_table
        for game_row in inner_tbody.find_all("tr", recursive=False):
            th_tags = game_row.find_all("th", recursive=False)
            td_tags = game_row.find_all("td", recursive=False)
            if not th_tags or not td_tags:
                continue

            games = get_games_from_th_group(th_tags)
            if not games:
                continue  # No valid versions in this row

            # The location cell is the last <td> in the row, which contains a
            # nested table → tbody → tr → td.roundy (the actual text)
            outer_td = td_tags[-1]
            inner_td = outer_td.find("td", class_="roundy")
            if not inner_td:
                # Fallback: use outer_td directly
                inner_td = outer_td

            raw_text = inner_td.get_text(separator=" ", strip=True)
            # Collapse whitespace
            raw_text = re.sub(r"\s+", " ", raw_text).strip()

            locations = location_links_from_cell(inner_td)
            method    = infer_method(raw_text)
            level     = extract_level_range(raw_text)

            results.append({
                "games":       games,
                "locations":   locations,
                "method":      method,
                "level_range": level,
                "raw_text":    raw_text,
            })

    return results


# ---------------------------------------------------------------------------
# Data building
# ---------------------------------------------------------------------------

def region_for_games(games: List[str]) -> Optional[str]:
    """Return the region name if all games map to the same region."""
    regions = {GAME_TO_REGION.get(g) for g in games if g in GAME_TO_REGION}
    regions.discard(None)
    return next(iter(regions)) if len(regions) == 1 else None


def build_encounter_entries(raw_rows: List[Dict]) -> List[Dict]:
    """
    Convert raw parsed rows into encounter entry dicts matching the
    existing pokemon_data.json format.
    """
    # Aggregate by (location_name, method) → merge games
    agg: Dict[Tuple, Dict] = {}

    for row in raw_rows:
        games  = row["games"]
        method = row["method"]
        level  = row["level_range"]
        locs   = row["locations"]

        if not locs:
            # No extractable location (e.g. pure Trade entries) – skip
            # unless method is explicitly Trade/Time Capsule (those are handled
            # by add_trade_locations.py)
            continue

        region = region_for_games(games)

        for loc_name in locs:
            # Prepend region prefix if not already present
            if region and region.lower() not in loc_name.lower():
                full_name = f"{region} {loc_name}"
            else:
                full_name = loc_name

            key = (full_name, method)
            if key not in agg:
                agg[key] = {
                    "name":        full_name,
                    "region":      region,
                    "games":       [],
                    "method":      method,
                    "level_range": level,
                    "chance":      None,
                }

            for g in games:
                if g not in agg[key]["games"]:
                    agg[key]["games"].append(g)

            # Keep the first non-None level we encounter
            if agg[key]["level_range"] is None and level:
                agg[key]["level_range"] = level

    return list(agg.values())


# ---------------------------------------------------------------------------
# Per-Pokemon scraping
# ---------------------------------------------------------------------------

def scrape_pokemon(pokemon_name: str) -> List[Dict]:
    """
    Fetch and parse Bulbapedia game location data for a single Pokemon.
    Returns a list of encounter entry dicts.
    """
    page_title = pokemon_page_title(pokemon_name)
    print(f"  [{pokemon_name}] page: {page_title}")

    section_idx = get_game_locations_section_index(page_title)
    if section_idx is None:
        print(f"  [{pokemon_name}] WARNING: 'Game locations' section not found")
        return []

    html = get_section_html(page_title, section_idx)
    if not html:
        print(f"  [{pokemon_name}] WARNING: failed to fetch section HTML")
        return []

    raw_rows = parse_game_locations_html(html)
    print(f"  [{pokemon_name}] parsed {len(raw_rows)} game rows")
    entries  = build_encounter_entries(raw_rows)
    print(f"  [{pokemon_name}] -> {len(entries)} encounter entries")
    return entries


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Scrape Pokemon encounter data from Bulbapedia"
    )
    parser.add_argument(
        "--input-json", required=True,
        help="Path to the input pokemon_data.json"
    )
    parser.add_argument(
        "--output-json",
        help="Path to write the updated pokemon_data.json. "
             "Omit (or use --preview) to skip writing."
    )
    parser.add_argument(
        "--pokemon", nargs="+",
        help="Only process these Pokemon names (space-separated). "
             "Processes all if omitted."
    )
    parser.add_argument(
        "--field", default="location_area_encounters",
        choices=["location_area_encounters", "preevolution_location_area_encounters"],
        help="Which JSON field to update (default: location_area_encounters)"
    )
    parser.add_argument(
        "--preview", action="store_true",
        help="Print scraped entries to stdout without modifying JSON"
    )
    parser.add_argument(
        "--merge", action="store_true",
        help="Merge scraped entries with existing entries rather than replacing them"
    )
    args = parser.parse_args()

    # Load input JSON
    print(f"Loading {args.input_json}...")
    with open(args.input_json, encoding="utf-8") as f:
        pokemon_data = json.load(f)

    # Build lookup by name
    name_to_idx = {p["name"]: i for i, p in enumerate(pokemon_data)}

    targets = args.pokemon if args.pokemon else [p["name"] for p in pokemon_data]
    print(f"Processing {len(targets)} Pokemon...\n")

    updated_count = 0

    for pokemon_name in targets:
        if pokemon_name not in name_to_idx:
            print(f"WARNING: '{pokemon_name}' not found in JSON, skipping", file=sys.stderr)
            continue

        idx = name_to_idx[pokemon_name]
        print(f"Processing #{idx + 1}: {pokemon_name}")
        entries = scrape_pokemon(pokemon_name)

        if args.preview:
            print(json.dumps(entries, indent=2, ensure_ascii=False))
            print()
            continue

        if entries or not args.merge:
            if args.merge:
                existing = pokemon_data[idx].get(args.field, []) or []
                # Merge: add entries whose (name, method) aren't already present
                existing_keys = {
                    (e.get("name", ""), e.get("method", ""))
                    for e in existing
                }
                new_entries = [
                    e for e in entries
                    if (e["name"], e["method"]) not in existing_keys
                ]
                pokemon_data[idx][args.field] = existing + new_entries
                if new_entries:
                    print(f"  → merged {len(new_entries)} new entries")
            else:
                pokemon_data[idx][args.field] = entries
                updated_count += 1

        print()

    if args.preview:
        return

    if not args.output_json:
        print("No --output-json specified. Use --preview to inspect results.")
        return

    print(f"Writing {args.output_json}...")
    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(pokemon_data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Done. Updated {updated_count} Pokemon.")


if __name__ == "__main__":
    main()
