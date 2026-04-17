#!/usr/bin/env python3
"""
Merge location_area_encounters / preevolution_location_area_encounters entries
that share the same (name, region, generation, games) key.

Aggregation rules
-----------------
level_range
    All level values / ranges are parsed to individual integers, unioned, then
    re-formatted as a compact, sorted range string.
    e.g. "5, 10" + "8-12" -> "5, 8-12"
    Special non-numeric strings (e.g. "The same as the traded Pokémon") are
    preserved verbatim alongside any numeric ranges.

chance
    Percentage values are expressed as a min-max range of the values seen.
    e.g. "2%" + "5%" -> "2-5%"; a single unique value stays as-is ("5%").
    Time-of-day values ("morning:5%;day:10%;night:5%") are ranged per period.
    Special strings ("One", "Only One") are deduplicated and joined with " / "
    when mixed types appear.

Grouping key
    (name, region, generation, games, method) — method is included so that
    entries for different floors / fishing rods / etc. are NOT merged.

All other fields are taken from the first entry in each group.

Usage
-----
    python merge_duplicate_encounters.py --input-json pokemon_data.json
    python merge_duplicate_encounters.py --input-json pokemon_data.json \\
        --output-json pokemon_data_merged.json
    python merge_duplicate_encounters.py --input-json pokemon_data.json --dry-run
"""

import argparse
import json
import re
import sys
from collections import defaultdict


# ---------------------------------------------------------------------------
# Level-range helpers
# ---------------------------------------------------------------------------

def _parse_level_range(s):
    """
    Return (numeric_levels: set[int] | None, special_strs: list[str]).

    'special_strs' collects tokens that are not parseable as integers/ranges.
    """
    numeric = set()
    specials = []

    for token in re.split(r',', s):
        token = token.strip()
        if not token:
            continue
        # Range like "20-40" or "26-27"
        range_match = re.fullmatch(r'(\d+)\s*-\s*(\d+)', token)
        if range_match:
            lo, hi = int(range_match.group(1)), int(range_match.group(2))
            numeric.update(range(lo, hi + 1))
            continue
        # Plain integer
        if re.fullmatch(r'\d+', token):
            numeric.add(int(token))
            continue
        # Everything else is a special string
        if token not in specials:
            specials.append(token)

    return numeric or None, specials


def _format_levels(levels):
    """Convert a sorted set of integers to a compact range string."""
    sorted_lvls = sorted(levels)
    ranges = []
    start = end = sorted_lvls[0]
    for lvl in sorted_lvls[1:]:
        if lvl == end + 1:
            end = lvl
        else:
            ranges.append(str(start) if start == end else f"{start}-{end}")
            start = end = lvl
    ranges.append(str(start) if start == end else f"{start}-{end}")
    return ', '.join(ranges)


def merge_level_ranges(level_range_list):
    """
    Merge a list of level_range strings into one unified string.
    Returns the original first value if nothing can be parsed.
    """
    all_numeric = set()
    all_specials = []

    for lr in level_range_list:
        if not lr:
            continue
        s = str(lr).strip()
        if not s:
            continue
        numeric, specials = _parse_level_range(s)
        if numeric:
            all_numeric |= numeric
        for sp in specials:
            if sp not in all_specials:
                all_specials.append(sp)

    parts = []
    if all_numeric:
        parts.append(_format_levels(all_numeric))
    parts.extend(all_specials)

    return ', '.join(parts) if parts else (level_range_list[0] if level_range_list else '')


# ---------------------------------------------------------------------------
# Chance helpers
# ---------------------------------------------------------------------------

_PCT_RE = re.compile(r'^(\d+(?:\.\d+)?)%$')
_TOD_RE = re.compile(
    r'^morning:([^;]+);day:([^;]+);night:([^;]+)$', re.IGNORECASE
)


def _fmt_pct(val):
    v = int(val) if val == int(val) else val
    return f"{v}%"


def _range_pct_strs(values):
    """
    Given a list of percentage strings like ["2%", "5%", "8%"],
    return a range string: "2-8%", or just "5%" if all values are equal.
    Non-parseable strings are passed through unchanged.
    """
    nums = []
    for v in values:
        m = _PCT_RE.match(str(v).strip())
        if m:
            nums.append(float(m.group(1)))
        else:
            # Cannot parse — return all unique strings joined
            unique = list(dict.fromkeys(values))
            return ' / '.join(unique)
    lo, hi = min(nums), max(nums)
    if lo == hi:
        return _fmt_pct(lo)
    lo_s = int(lo) if lo == int(lo) else lo
    hi_s = int(hi) if hi == int(hi) else hi
    return f"{lo_s}-{hi_s}%"


def merge_chances(chance_list):
    """
    Aggregate a list of chance strings into a range representation.

    - Plain percentages  → min-max range, e.g. ["2%","5%","8%"] -> "2-8%"
    - Time-of-day format → per-period min-max range
    - Special strings    → deduplicated, joined with " / "
    """
    if not chance_list:
        return ''

    # Classify each entry
    pct_vals = []
    tod_morning, tod_day, tod_night = [], [], []
    specials = []
    has_tod = False

    for c in chance_list:
        if not c:
            continue
        s = str(c).strip()
        m_tod = _TOD_RE.match(s)
        if m_tod:
            has_tod = True
            tod_morning.append(m_tod.group(1).strip())
            tod_day.append(m_tod.group(2).strip())
            tod_night.append(m_tod.group(3).strip())
            continue
        m_pct = _PCT_RE.match(s)
        if m_pct:
            pct_vals.append(s)
            continue
        if s not in specials:
            specials.append(s)

    if has_tod:
        return (
            f"morning:{_range_pct_strs(tod_morning)};"
            f"day:{_range_pct_strs(tod_day)};"
            f"night:{_range_pct_strs(tod_night)}"
        )

    if pct_vals:
        return _range_pct_strs(pct_vals)

    return ' / '.join(specials)


# ---------------------------------------------------------------------------
# Core merge logic
# ---------------------------------------------------------------------------

def _games_key(games):
    return tuple(sorted(str(g).lower() for g in (games or [])))


def merge_encounters(encounters, require_same_games=True):
    """
    Group encounters by (name, region, generation, [games,] method) and merge
    level_range / chance within each group.

    require_same_games: if True (default), games must be identical to merge.
                        if False, games is excluded from the key and the merged
                        entry's games list is the sorted union of all groups.
    """
    groups = defaultdict(list)
    order = []

    for enc in encounters:
        if require_same_games:
            key = (
                enc.get('name', ''),
                enc.get('region', ''),
                enc.get('generation', ''),
                _games_key(enc.get('games', [])),
                enc.get('method', ''),
            )
        else:
            key = (
                enc.get('name', ''),
                enc.get('region', ''),
                enc.get('generation', ''),
                enc.get('method', ''),
            )
        if key not in groups:
            order.append(key)
        groups[key].append(enc)

    merged = []
    for key in order:
        group = groups[key]
        if len(group) == 1:
            merged.append(group[0])
            continue

        # Start from a copy of the first entry
        base = dict(group[0])

        # Aggregate level_range
        base['level_range'] = merge_level_ranges(
            [e.get('level_range', '') for e in group]
        )

        # Aggregate chance
        base['chance'] = merge_chances(
            [e.get('chance', '') for e in group]
        )

        # If games were not part of the key, union all games lists
        if not require_same_games:
            seen = []
            for e in group:
                for g in (e.get('games') or []):
                    gl = str(g).lower()
                    if gl not in seen:
                        seen.append(gl)
            base['games'] = seen

        merged.append(base)

    return merged


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

FIELDS = ('location_area_encounters', 'preevolution_location_area_encounters')


def process(pokemon_list, verbose=False, require_same_games=True):
    total_removed = 0
    affected_pokemon = 0

    for pokemon in pokemon_list:
        removed_this = 0
        for field in FIELDS:
            encounters = pokemon.get(field)
            if not encounters:
                continue
            before = len(encounters)
            merged = merge_encounters(encounters, require_same_games=require_same_games)
            after = len(merged)
            if after < before:
                pokemon[field] = merged
                removed_this += before - after
                if verbose:
                    print(
                        f"  [{pokemon.get('id', '?')}] {pokemon.get('name', '?')} "
                        f"{field}: {before} -> {after} entries"
                    )
        if removed_this:
            total_removed += removed_this
            affected_pokemon += 1

    return total_removed, affected_pokemon


def main():
    parser = argparse.ArgumentParser(
        description='Merge duplicate location encounters in pokemon_data.json.'
    )
    parser.add_argument(
        '--input-json', required=True,
        help='Path to pokemon_data.json'
    )
    parser.add_argument(
        '--output-json',
        help='Output path (defaults to overwriting --input-json)'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Report what would be merged without writing any files'
    )
    parser.add_argument(
        '--verbose', action='store_true',
        help='Print each merge operation'
    )
    parser.add_argument(
        '--ignore-games', action='store_true',
        help='Merge entries even when their games lists differ; '
             'the merged entry will have the union of all games'
    )
    args = parser.parse_args()

    print(f"Reading {args.input_json} …")
    with open(args.input_json, 'r', encoding='utf-8') as f:
        pokemon_list = json.load(f)

    removed, affected = process(
        pokemon_list,
        verbose=args.verbose or args.dry_run,
        require_same_games=not args.ignore_games,
    )

    if args.dry_run:
        print(f"\nDry run: would merge {removed} duplicate entries across {affected} Pokémon.")
        sys.exit(0)

    output_path = args.output_json or args.input_json
    print(f"Writing {output_path} …")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(pokemon_list, f, indent=2, ensure_ascii=False)

    print(f"Done. Merged {removed} duplicate entries across {affected} Pokémon.")
    print(f"Output: {output_path}")


if __name__ == '__main__':
    main()
