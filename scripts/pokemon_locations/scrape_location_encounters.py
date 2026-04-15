#!/usr/bin/env python3
"""
Scrape Pokemon encounter data from Bulbapedia location pages.

For each URL in the input file, fetches the Generation I/II/III encounter
tables under the "In the games > Pokémon" section and writes rows to CSV.

Usage:
    python scrape_location_encounters.py --input-urls urls.txt --output-csv encounters.csv

Output CSV columns:
    location_name, pokemon, games, location, levels, rate

Example row:
    Hoenn Route 117,oddish,ruby|sapphire,grass,13,10%
"""

import csv
import re
import sys
import time
import json
import argparse
from urllib.parse import urlparse, unquote
from collections import Counter

import requests
from bs4 import BeautifulSoup

API_BASE = "https://bulbapedia.bulbagarden.net/w/api.php"
HEADERS = {"User-Agent": "pokedle-scraper/1.0 (https://github.com/pokedle)"}
RATE_LIMIT = 0.8  # seconds between API requests

VALID_GENERATIONS = {"Generation I", "Generation II", "Generation III"}

# Maps game column abbreviation text -> version name, per generation section heading.
# "R" in Gen I = red; "R" in Gen III = ruby. Abbreviations are unique within each gen.
GEN_ABBREV_MAP = {
    "Generation I": {"R": "red", "B": "blue", "Y": "yellow"},
    "Generation II": {"G": "gold", "S": "silver", "C": "crystal"},
    "Generation III": {
        "R": "ruby", "S": "sapphire", "E": "emerald",
        "FR": "firered", "LG": "leafgreen",
    },
}

CSV_FIELDS = ["pokemon_id", "pokemon", "generation", "location_name", "games", "location", "levels", "rate", "rate_morning", "rate_day", "rate_night"]


def normalize_name(s: str) -> str:
    """Normalize Pokemon names for lookup: lower, strip apostrophes, replace hyphens with spaces,
    remove periods, normalize gender symbols (♀/♂ -> f/m), collapse whitespace."""
    if not s:
        return ""
    s = s.lower()
    s = s.replace("'", "")
    s = s.replace("-", " ")
    s = s.replace(".", "")
    s = s.replace("♀", "f")
    s = s.replace("♂", "m")
    # collapse multiple spaces
    s = re.sub(r"\s+", " ", s)
    return s.strip()


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def url_to_location_name(url: str) -> str:
    """Extract a human-readable location name from a Bulbapedia wiki URL."""
    path = urlparse(url).path
    title = path.split("/wiki/")[-1]
    return unquote(title).replace("_", " ")


def url_to_page_title(url: str) -> str:
    """Extract the wiki page title (for API calls) from a Bulbapedia wiki URL."""
    path = urlparse(url).path
    title = path.split("/wiki/")[-1]
    # Unquote percent-encodings (e.g. %27 -> ') and convert underscores to spaces
    return unquote(title).replace("_", " ")


# ---------------------------------------------------------------------------
# Bulbapedia API
# ---------------------------------------------------------------------------

def get_sections(page_title: str) -> list:
    """Return the sections list for a page via the MediaWiki API."""
    resp = requests.get(
        API_BASE,
        params={
            "action": "parse",
            "page": page_title,
            "prop": "sections",
            "format": "json",
        },
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("parse", {}).get("sections", [])


def get_section_html(page_title: str, section_index: str) -> str:
    """Return the rendered HTML for a specific section index."""
    resp = requests.get(
        API_BASE,
        params={
            "action": "parse",
            "page": page_title,
            "prop": "text",
            "section": section_index,
            "format": "json",
        },
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("parse", {}).get("text", {}).get("*", "")


# ---------------------------------------------------------------------------
# Section discovery
# ---------------------------------------------------------------------------

def find_target_sections(sections: list) -> list:
    """
    Return [(generation_name, section_index), ...] for all Generation I/II/III
    sections that are children of a "Pokémon" section.

    Handles two page layouts:
      - "In the games" (L2) > "Pokémon" (L3) > "Generation X" (L4)  [e.g. Hoenn routes]
      - "Pokémon" (L2) > "Generation X" (L3)                        [e.g. Johto routes]
    """
    results = []
    # Map section number -> True for any "Pokémon" section at level 2 or 3
    pokemon_section_numbers = set()

    for sec in sections:
        level = int(sec.get("level", 0))
        # Section line may contain HTML (e.g. accented characters)
        line = BeautifulSoup(sec.get("line", ""), "html.parser").get_text()
        number = sec.get("number", "")
        index = sec.get("index", "")

        if level in (2, 3) and "Pok" in line and "Adventures" not in line:
            # Captures "Pokémon" section at level 2 or 3
            pokemon_section_numbers.add(number)
        elif line in VALID_GENERATIONS:
            # Generation section: check its parent number matches a Pokémon section
            parent_number = ".".join(number.split(".")[:-1])
            if parent_number in pokemon_section_numbers:
                results.append((line, index))

    return results


# ---------------------------------------------------------------------------
# Table parsing
# ---------------------------------------------------------------------------

def normalize_encounter_type(text: str) -> str:
    """Normalize raw location-cell text to a clean encounter type string."""
    text = text.replace("\xa0", " ").strip()
    lower = text.lower()
    if "super rod" in lower:
        return "super rod"
    if "good rod" in lower:
        return "good rod"
    if "old rod" in lower:
        return "old rod"
    if "fishing" in lower:
        return "fishing"
    if "surfing" in lower or "surf" in lower:
        return "surfing"
    if "grass" in lower or "walking" in lower or "tall grass" in lower:
        return "grass"
    if "headbutt" in lower:
        return "headbutt"
    if "swarm" in lower or "outbreak" in lower:
        return "swarm"
    if "gift" in lower:
        return "gift"
    if "trade" in lower:
        return "trade"
    if "special" in lower:
        return "special"
    return lower


def parse_encounter_table(table, generation: str, location_name: str) -> list:
    """
    Parse one encounter table (class="roundy") and return a list of row dicts.

    Table structure per data row:
        <td> Pokemon cell
        <th colspan=2> R/S/E/FR/LG/etc.  (colored bg = active, white = inactive)
        ...
        <td> Location cell (Grass / Surfing / Fishing Old Rod / etc.)
        <td> Levels
        <td colspan=3> Rate          <- single rate (no time-of-day)
      OR:
        <td> Morning rate            <- time-of-day split (3 separate cells)
        <td> Day rate
        <td> Night rate

    Some rows within a time-of-day table still use colspan=3 when all three
    rates are equal, so detection is per-row based on trailing TD count.
    """
    rows = []
    abbrev_map = GEN_ABBREV_MAP.get(generation, {})
    # Tracks the most recent section-divider text (e.g. "Headbutt tree (Moderate chances of battle)")
    current_section_header = ""

    tbody = table.find("tbody") or table
    for tr in tbody.find_all("tr", recursive=False):
        cells = tr.find_all(["td", "th"], recursive=False)
        if not cells:
            continue

        # Section-divider rows start with <th> — record their text for context, then skip
        if cells[0].name != "td":
            current_section_header = tr.get_text(separator=" ", strip=True).lower()
            continue

        # Game columns are <th> elements; if none present, skip (e.g. footer row)
        th_cells = [c for c in cells if c.name == "th"]
        if not th_cells:
            continue

        # --- Pokemon name ---
        # Prefer an anchor that links to the Pokemon article (href contains '_(Pok')
        poke_link = None
        for a in cells[0].find_all("a", href=True):
            href = a.get("href", "")
            title_attr = a.get("title", "")
            if "_(Pok" in href or "(Pok" in title_attr:
                poke_link = a
                break
        if not poke_link:
            # fallback: first anchor in the cell
            poke_link = cells[0].find("a", href=True)
        if not poke_link:
            continue
        pokemon_name = poke_link.get_text(strip=True)
        if not pokemon_name:
            pokemon_name = poke_link.get("title", "")
        pokemon_name = pokemon_name.lower()

        # --- Active games ---
        # A game <th> is "active" (Pokemon found there) when it contains an <a> link.
        # A white background / greyed-out cell only has a <span>, no <a>.
        active_games = []
        for th in th_cells:
            abbrev = th.get_text(strip=True).replace("\xa0", " ")
            version = abbrev_map.get(abbrev)
            if version and th.find("a"):
                active_games.append(version)

        if not active_games:
            continue

        # --- Trailing <td> cells: Location, Levels, Rate(s) ---
        last_th_pos = max(i for i, c in enumerate(cells) if c.name == "th")
        trailing = [c for c in cells[last_th_pos + 1:] if c.name == "td"]

        if len(trailing) < 3:
            continue

        location_type = normalize_encounter_type(
            trailing[0].get_text(separator=" ", strip=True)
        )

        # Skip swarm encounters
        if location_type == "swarm":
            continue

        # For headbutt, only keep entries under "(Moderate chances of battle)"
        if location_type == "headbutt" and "(moderate chances of battle)" not in current_section_header:
            continue

        levels = trailing[1].get_text(strip=True).replace("\xa0", " ")

        # Time-of-day rows have 5 trailing TDs: location, levels, morning, day, night.
        # Regular rows have 3: location, levels, rate (last TD may have colspan=3).
        if len(trailing) >= 5:
            rate = ""
            rate_morning = trailing[2].get_text(strip=True).replace("\xa0", " ")
            rate_day = trailing[3].get_text(strip=True).replace("\xa0", " ")
            rate_night = trailing[4].get_text(strip=True).replace("\xa0", " ")
        else:
            rate = trailing[2].get_text(strip=True).replace("\xa0", " ")
            rate_morning = ""
            rate_day = ""
            rate_night = ""

        rows.append({
            "pokemon_id": "",  # filled in later from --input-json
            "pokemon": pokemon_name,
            "generation": generation_to_number(generation),
            "location_name": location_name,
            "games": "|".join(active_games),
            "location": location_type,
            "levels": levels,
            "rate": rate,
            "rate_morning": rate_morning,
            "rate_day": rate_day,
            "rate_night": rate_night,
        })

    return rows


def parse_encounter_section(html: str, generation: str, location_name: str) -> list:
    """Parse all roundy encounter tables within a section's rendered HTML."""
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for table in soup.find_all("table", class_="roundy"):
        rows.extend(parse_encounter_table(table, generation, location_name))
    return rows


def generation_to_number(generation: str) -> int:
    """Convert 'Generation I'/'Generation II'/'Generation III' to 1/2/3.
    Returns 0 if unknown.
    """
    if not generation:
        return 0
    if "generation i" in generation.lower():
        return 1
    if "generation ii" in generation.lower():
        return 2
    if "generation iii" in generation.lower():
        return 3
    return 0


# ---------------------------------------------------------------------------
# Per-page orchestration
# ---------------------------------------------------------------------------

def scrape_location_page(url: str) -> list:
    """Scrape encounter rows from a single Bulbapedia location page."""
    location_name = url_to_location_name(url)
    page_title = url_to_page_title(url)

    print(f"  [{page_title}] fetching sections...")
    try:
        sections = get_sections(page_title)
    except Exception as exc:
        print(f"  ERROR fetching sections: {exc}")
        return []
    time.sleep(RATE_LIMIT)

    target_sections = find_target_sections(sections)
    if not target_sections:
        print(f"  No Generation I/II/III Pokemon sections found")
        return []

    gen_names = [g for g, _ in target_sections]
    print(f"  Found sections: {gen_names}")

    all_rows = []
    for generation, section_index in target_sections:
        print(f"  Parsing {generation} (section index {section_index})...")
        try:
            html = get_section_html(page_title, section_index)
        except Exception as exc:
            print(f"  ERROR fetching section {section_index}: {exc}")
            time.sleep(RATE_LIMIT)
            continue
        time.sleep(RATE_LIMIT)

        rows = parse_encounter_section(html, generation, location_name)
        print(f"    -> {len(rows)} encounter rows")
        all_rows.extend(rows)

    return all_rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_pokemon_id_map(json_path: str) -> dict:
    """Return a lowercase-name -> id mapping from the pokemon data JSON."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {normalize_name(entry["name"]): entry["id"] for entry in data if "name" in entry and "id" in entry}


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Pokemon encounter data from Bulbapedia location pages"
    )
    parser.add_argument(
        "--input-urls",
        required=True,
        help="Path to text file with Bulbapedia location URLs (one per line)",
    )
    parser.add_argument(
        "--input-json",
        help="Path to pokemon data JSON file (used to populate pokemon_id column)",
    )
    parser.add_argument(
        "--missing-csv",
        help="Optional path to write missing-ID report CSV (default: <output>_missing_ids.csv)",
    )
    parser.add_argument(
        "--output-csv",
        required=True,
        help="Path to write the output CSV",
    )
    args = parser.parse_args()

    # Load pokemon name -> id mapping if provided
    pokemon_id_map = {}
    if args.input_json:
        try:
            pokemon_id_map = load_pokemon_id_map(args.input_json)
            print(f"Loaded {len(pokemon_id_map)} Pokemon from: {args.input_json}")
        except (FileNotFoundError, json.JSONDecodeError) as exc:
            print(f"ERROR loading --input-json: {exc}")
            sys.exit(1)

    # Read URLs (skip blank lines and # comments)
    try:
        with open(args.input_urls, "r", encoding="utf-8") as f:
            urls = [
                line.strip()
                for line in f
                if line.strip() and not line.strip().startswith("#")
            ]
    except FileNotFoundError:
        print(f"ERROR: Input file not found: {args.input_urls}")
        sys.exit(1)

    print(f"Loaded {len(urls)} URL(s)")

    all_rows = []
    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}] {url}")
        rows = scrape_location_page(url)
        all_rows.extend(rows)
        print(f"  Subtotal: {len(all_rows)} rows")

    # Populate pokemon_id and sort
    unknown = []
    for row in all_rows:
        name = row["pokemon"]
        lookup = normalize_name(name)
        row["pokemon_id"] = pokemon_id_map.get(lookup, "")
        if row["pokemon_id"] == "" and pokemon_id_map:
            unknown.append(name)
    if unknown:
        uniq_unknown = sorted(set(unknown))
        print(f"\nWARNING: No ID found for: {uniq_unknown}")
        # write a missing IDs CSV alongside output unless user provided a path
        missing_csv = getattr(args, "missing_csv", None)
        if not missing_csv:
            missing_csv = args.output_csv.replace('.csv', '') + '_missing_ids.csv'
        counts = Counter(unknown)
        try:
            with open(missing_csv, 'w', newline='', encoding='utf-8') as mf:
                mw = csv.writer(mf)
                mw.writerow(['pokemon', 'count'])
                for name in uniq_unknown:
                    mw.writerow([name, counts[name]])
            print(f"Wrote missing-ID report: {missing_csv}")
        except IOError:
            print(f"Could not write missing-ID report to: {missing_csv}")

    all_rows.sort(key=lambda r: (r["pokemon_id"] if isinstance(r["pokemon_id"], int) else 9999, r["location_name"]))

    # Write CSV
    print(f"\nWriting {len(all_rows)} rows to: {args.output_csv}")
    try:
        with open(args.output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            writer.writeheader()
            writer.writerows(all_rows)
        print("Done!")
    except IOError as exc:
        print(f"ERROR writing CSV: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
