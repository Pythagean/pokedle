#!/usr/bin/env python3
"""
scrub_flavor_texts.py

Usage:
  python scripts/scrub_flavor_texts.py input.json output.json

Reads the JSON `input.json` (expected to be an array of Pokémon objects),
collects all `name` values, then replaces occurrences of any of those names
inside each element of `flavor_text_entries` with "[...]" (case-insensitive,
word-aware). Writes the modified data to `output.json`.

Notes:
- The script preserves the original JSON structure except for modified
  `flavor_text_entries` values.
- Matching is done using a regex with non-word boundaries so names with
  punctuation or spaces are handled sensibly (e.g. "Mr. Mime", "Farfetch'd").
"""

import argparse
import json
import re
import sys
from typing import List


def build_name_pattern(names: List[str]) -> re.Pattern:
    # Unique names, sort longest-first so multi-word/long names match before substrings
    unique = sorted({n for n in names if isinstance(n, str) and n.strip()}, key=lambda s: -len(s))
    if not unique:
        # A pattern that never matches
        return re.compile(r"\b\B")
    escaped = [re.escape(n) for n in unique]
    # Use (?<!\w) and (?!\w) so we match whole-name occurrences even if name contains
    # punctuation/spaces (they're not word characters). This avoids matching inside other words.
    pattern = r"(?<!\w)(?:" + "|".join(escaped) + r")(?!\w)"
    return re.compile(pattern, flags=re.IGNORECASE)


def scrub_flavor_texts(data, pattern: re.Pattern):
    replaced_count = 0
    # Expecting data to be a list of pokemon objects
    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list of Pokémon objects.")

    for obj in data:
        if not isinstance(obj, dict):
            continue
        fte = obj.get('flavor_text_entries')
        if not isinstance(fte, list):
            continue
        # Preserve the original, unmodified flavor text entries in a new field
        # unless the field already exists. If the current entries already
        # contain the scrub token "[...]", replace those tokens with the
        # current object's name when saving the original so we retain a
        # plausible unsanitized version.
        if 'flavor_text_entries_original' not in obj:
            try:
                name = obj.get('name') if isinstance(obj.get('name'), str) else ''
                # Build an original copy where any literal "[...]" is swapped
                # back to this object's name (if available). This helps when
                # running the script against a file that was partially scrubbed
                # using generic tokens.
                def restore_token(txt):
                    if not isinstance(txt, str):
                        return txt
                    if name and '[...]' in txt:
                        return txt.replace('[...]', name)
                    return txt

                obj['flavor_text_entries_original'] = [restore_token(t) for t in fte]
            except Exception:
                obj['flavor_text_entries_original'] = fte
        new_entries = []
        for txt in fte:
            if not isinstance(txt, str):
                new_entries.append(txt)
                continue
            new_txt, n = pattern.subn('[...]', txt)
            if n:
                replaced_count += n
            new_entries.append(new_txt)
        obj['flavor_text_entries'] = new_entries
    return replaced_count


def main(argv=None):
    p = argparse.ArgumentParser(description='Replace Pokémon names in flavor_text_entries with "[...]"')
    p.add_argument('input', help='Path to input JSON file')
    p.add_argument('output', help='Path to write scrubbed JSON')
    p.add_argument('--preview', action='store_true', help='Do not write output, just print a summary')
    args = p.parse_args(argv)

    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to read input file '{args.input}': {e}", file=sys.stderr)
        return 2

    # Extract names
    names = []
    if isinstance(data, list):
        for obj in data:
            if isinstance(obj, dict):
                name = obj.get('name')
                if isinstance(name, str) and name.strip():
                    names.append(name.strip())
    names = list(dict.fromkeys(names))  # preserve order, unique

    if not names:
        print('No Pokémon names found in input; nothing to replace.')
        if args.preview:
            return 0
        else:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return 0

    pattern = build_name_pattern(names)

    replaced_count = scrub_flavor_texts(data, pattern)

    print(f'Found {len(names)} Pokémon names. Total replacements in flavor_text_entries: {replaced_count}')

    if args.preview:
        return 0

    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Failed to write output file '{args.output}': {e}", file=sys.stderr)
        return 3

    print(f'Wrote scrubbed JSON to: {args.output}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
