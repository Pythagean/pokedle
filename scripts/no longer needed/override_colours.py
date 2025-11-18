#!/usr/bin/env python3
"""
override_colours.py

Usage:
  python scripts/override_colours.py --csv overrides.csv --input public/data/pokemon_data.json --output public/data/pokemon_data_overridden.json [--images-dir path/to/images]

Reads `input-json` (array of Pokémon objects), reads CSV of overrides (must include `id` column), and for each row updates the matching Pokémon object:
 - sets `colour` = primary_color (from CSV)
 - adds `secondary_colours` = [secondary_1, secondary_2, secondary_3] with missing ones omitted

If `--images-dir` is provided, the script copies `{id}.png` from that dir to a new directory named `{images_dir}_colour_overrides/` and writes the primary and secondary colours as overlaid text onto the copied image (bottom area).

The script is defensive: it will warn when an ID in the CSV is not found in the JSON. It preserves other fields.
"""

import argparse
import csv
import json
import os
import shutil
import sys
from typing import Dict, Any, List

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:
    Image = None


def parse_csv_overrides(csv_path: str) -> Dict[str, Dict[str, str]]:
    """Return dict keyed by id (string) -> override dict"""
    overrides = {}
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Normalize header names to lower-case to allow flexible column names
        headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
        for row in reader:
            # Find id column (case-insensitive)
            id_val = None
            for k in row:
                if k.strip().lower() == 'id':
                    id_val = row[k].strip()
                    break
            if not id_val:
                # Try first column
                first_key = next(iter(row.keys()))
                id_val = row[first_key].strip()
            if not id_val:
                continue
            # Extract primary color
            primary = None
            secondary = []
            for k, v in row.items():
                if v is None:
                    continue
                key = k.strip().lower()
                val = v.strip()
                if key in ('primary_color', 'primarycolour', 'primary', 'colour', 'color') and val:
                    # prefer explicit primary_color header; if header is generic 'colour' that's ok
                    # but if CSV contains 'colour' as the original file's colour we still accept it
                    primary = val
                elif key.startswith('secondary') and val:
                    secondary.append(val)
            # If primary not found look for a column named 'colour' or 'color'
            if not primary:
                for k, v in row.items():
                    if v is None:
                        continue
                    key = k.strip().lower()
                    if key in ('colour', 'color') and v.strip():
                        primary = v.strip()
                        break
            overrides[id_val] = {
                'primary_color': primary if primary else '',
                'secondary_colours': secondary,
            }
    return overrides


def load_json(json_path: str) -> List[Dict[str, Any]]:
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_json(data: List[Dict[str, Any]], out_path: str):
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def apply_overrides(data: List[Dict[str, Any]], overrides: Dict[str, Dict[str, Any]]) -> int:
    """Apply overrides in-place. Returns count of modified objects."""
    # Build id map: JSON objects have numeric 'id' in many files; accept string/int keys
    id_map = {}
    for obj in data:
        if not isinstance(obj, dict):
            continue
        if 'id' in obj:
            id_map[str(obj['id'])] = obj
        elif 'name' in obj:
            # fallback: could map by name
            id_map[str(obj.get('name'))] = obj
    modified = 0
    for id_key, ov in overrides.items():
        obj = id_map.get(id_key)
        if obj is None:
            # try numeric string variations
            try:
                alt = str(int(id_key))
                obj = id_map.get(alt)
            except Exception:
                obj = None
        if obj is None:
            print(f"Warning: id {id_key} not found in JSON; skipping", file=sys.stderr)
            continue
        primary = ov.get('primary_color', '')
        secondaries = ov.get('secondary_colours', []) or []
        # Write main_colour (leave original 'colour' field untouched)
        if primary:
            obj['main_colour'] = primary
        # Add secondary_colours array (replace if present)
        obj['secondary_colours'] = [s for s in secondaries if s]
        modified += 1
    return modified


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def copy_and_annotate_images(overrides: Dict[str, Dict[str, Any]], images_dir: str):
    if Image is None:
        print('Pillow is not installed; image processing skipped. Install pillow to enable this feature.', file=sys.stderr)
        return
    src = images_dir
    dst = images_dir.rstrip('/\\') + '_colour_overrides'
    ensure_dir(dst)
    # Load a truetype font if available, otherwise fallback to PIL default
    font = None
    try:
        # Try common font paths; users can edit to point to a specific TTF if desired
        font = ImageFont.truetype('arial.ttf', 18)
    except Exception:
        try:
            font = ImageFont.load_default()
        except Exception:
            font = None
    for id_key, ov in overrides.items():
        # id_key may be '001' or '1' or name; prefer numeric
        src_filename = os.path.join(src, f"{id_key}.png")
        # if not found, try int conversion
        if not os.path.exists(src_filename):
            try:
                src_filename = os.path.join(src, f"{int(id_key)}.png")
            except Exception:
                pass
        if not os.path.exists(src_filename):
            print(f"Image for id {id_key} not found at {src_filename}; skipping image processing", file=sys.stderr)
            continue
        dst_filename = os.path.join(dst, os.path.basename(src_filename))
        try:
            shutil.copyfile(src_filename, dst_filename)
        except Exception as e:
            print(f"Failed copying {src_filename} -> {dst_filename}: {e}", file=sys.stderr)
            continue
        # Annotate the copied image
        try:
            im = Image.open(dst_filename).convert('RGBA')
            w, h = im.size
            draw = ImageDraw.Draw(im)
            # Build lines: main on first line, secondary on second line
            primary = ov.get('primary_color', '') or ''
            secondaries = ov.get('secondary_colours', []) or []
            # Always display both lines; use 'None' when missing
            main_line = f"Main: {primary}" if primary else "Main: None"
            secondary_text = ', '.join(secondaries) if secondaries else 'None'
            secondary_line = f"Secondary: {secondary_text}"
            # Determine font size: make text larger for two-line display
            fontsize = max(20, int(w / 14))
            try:
                font = ImageFont.truetype('arial.ttf', fontsize)
            except Exception:
                font = ImageFont.load_default()
            # Measure each line robustly across Pillow versions
            def measure(text_str):
                try:
                    bbox = draw.textbbox((0, 0), text_str, font=font)
                    return bbox[2] - bbox[0], bbox[3] - bbox[1]
                except Exception:
                    try:
                        return font.getsize(text_str)
                    except Exception:
                        try:
                            mask = font.getmask(text_str)
                            return mask.size
                        except Exception:
                            return (len(text_str) * (fontsize // 2), fontsize)

            main_w, main_h = measure(main_line) if main_line else (0, 0)
            sec_w, sec_h = measure(secondary_line) if secondary_line else (0, 0)
            text_w = max(main_w, sec_w)
            # vertical padding between lines and around
            padding = max(8, int(w * 0.015))
            line_spacing = max(4, int(fontsize * 0.25))
            rect_h = main_h + sec_h + padding * 2 + (line_spacing if main_line and secondary_line else 0)
            # Draw semi-transparent rectangle at bottom
            rect_y0 = h - rect_h
            overlay = Image.new('RGBA', im.size, (255,255,255,0))
            odraw = ImageDraw.Draw(overlay)
            odraw.rectangle([(0, rect_y0), (w, h)], fill=(0,0,0,160))
            # Composite
            im = Image.alpha_composite(im, overlay)
            draw = ImageDraw.Draw(im)
            text_x = (w - text_w) // 2
            # Draw main line then secondary line beneath
            y = rect_y0 + padding
            if main_line:
                draw.text((text_x + (text_w - main_w) // 2, y), main_line, font=font, fill=(255,255,255,255))
                y += main_h + line_spacing
            if secondary_line:
                draw.text((text_x + (text_w - sec_w) // 2, y), secondary_line, font=font, fill=(255,255,255,255))
            # Flatten transparency to white if present, then save
            try:
                if im.mode in ('RGBA', 'LA') or im.info.get('transparency') is not None:
                    # Paste onto white background using alpha channel as mask
                    alpha = im.split()[-1]
                    bg = Image.new('RGB', im.size, (255, 255, 255))
                    bg.paste(im, mask=alpha)
                    bg.save(dst_filename)
                else:
                    im.convert('RGB').save(dst_filename)
            except Exception:
                # Fallback: try a direct save
                im.convert('RGB').save(dst_filename)
        except Exception as e:
            print(f"Failed to annotate image {dst_filename}: {e}", file=sys.stderr)
            continue
    print(f"Processed images written to: {dst}")


def main(argv=None):
    p = argparse.ArgumentParser(description='Apply color overrides from CSV to pokemon_data.json and optionally annotate images')
    p.add_argument('--csv', required=True, help='CSV file with overrides (must include id column)')
    p.add_argument('--input', required=True, help='Input JSON file (pokemon_data.json)')
    p.add_argument('--output', required=True, help='Output JSON file to write modified data')
    p.add_argument('--images-dir', required=False, help='Optional images directory containing {id}.png files to copy/annotate')
    args = p.parse_args(argv)

    overrides = parse_csv_overrides(args.csv)
    if not overrides:
        print('No overrides found in CSV; exiting.', file=sys.stderr)
        return 2

    data = load_json(args.input)
    modified = apply_overrides(data, overrides)
    print(f'Applied overrides for {modified} entries')

    write_json(data, args.output)
    print(f'Wrote output JSON to: {args.output}')

    if args.images_dir:
        copy_and_annotate_images(overrides, args.images_dir)

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
