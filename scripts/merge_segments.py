#!/usr/bin/env python3
"""
Merge segment images listed in CSV rows into layered PNGs.

Each row in the CSV should list image file paths (relative or absolute). The script
will load each image in the order provided and alpha-composite them onto a single
RGBA canvas. Output files are written to the specified output directory.

Usage:
  python scripts/merge_segments.py -c segments.csv -o out_dir

Options:
  --canvas WxH   Set explicit canvas size (e.g. 512x512). Otherwise size of the
                 first image in the row is used.
  --center       Center each image on the canvas (default: paste at 0,0).
  --name-from-first If true (default), output filename is derived from the first
                 image's basename; otherwise uses row index like row-1.png.
  --bg-color R,G,B,A Background color for base canvas (default transparent: 0,0,0,0)

Dependencies:
  pip install pillow
"""

import argparse
import csv
from pathlib import Path
from PIL import Image
import sys


def parse_size(s):
    try:
        w, h = s.lower().split('x')
        return int(w), int(h)
    except Exception:
        raise argparse.ArgumentTypeError('Size must be WIDTHxHEIGHT, e.g. 512x512')


def parse_color(s):
    parts = [int(p.strip()) for p in s.split(',')]
    if len(parts) == 3:
        parts.append(255)
    if len(parts) != 4:
        raise argparse.ArgumentTypeError('Color must be R,G,B or R,G,B,A')
    return tuple(parts)


def load_row_images(fields, base_dir):
    # kept for backward compat but will be replaced by new resolver in main
    paths = []
    for f in fields:
        if not f:
            continue
        p = Path(f.strip())
        if not p.is_absolute():
            p = (base_dir / p)
        paths.append(p)
    return paths


def merge_images(image_paths, canvas_size=None, center=False, bg=(0,0,0,0)):
    if not image_paths:
        return None

    # load first image to get default size if not provided
    first = Image.open(str(image_paths[0])).convert('RGBA')
    base_w, base_h = first.size
    if canvas_size is None:
        canvas_w, canvas_h = base_w, base_h
    else:
        canvas_w, canvas_h = canvas_size

    base = Image.new('RGBA', (canvas_w, canvas_h), bg)

    for p in image_paths:
        try:
            img = Image.open(str(p)).convert('RGBA')
        except Exception as e:
            print(f"Warning: failed to open {p}: {e}", file=sys.stderr)
            continue
        # if image size matches canvas, composite directly
        if img.size != (canvas_w, canvas_h):
            # create temp canvas and paste image
            temp = Image.new('RGBA', (canvas_w, canvas_h), (0,0,0,0))
            if center:
                x = (canvas_w - img.width) // 2
                y = (canvas_h - img.height) // 2
            else:
                x = 0
                y = 0
            temp.paste(img, (x, y), img)
            base = Image.alpha_composite(base, temp)
        else:
            base = Image.alpha_composite(base, img)

    return base


def main():
    p = argparse.ArgumentParser(description='Merge segment images listed in CSV rows into layered PNGs')
    p.add_argument('-c', '--csv', required=True, help='CSV file where each row lists images to merge')
    p.add_argument('-o', '--out', required=True, help='Output directory')
    p.add_argument('-I', '--images-dir', help='Directory to look for image files (searched after CSV folder). Defaults to CSV folder')
    p.add_argument('--canvas', type=parse_size, help='Canvas size WIDTHxHEIGHT (e.g. 512x512)')
    p.add_argument('--center', action='store_true', help='Center images on canvas')
    p.add_argument('--name-from-first', action='store_true', default=True, help='Derive output name from first image basename (default: true)')
    p.add_argument('--bg-color', type=parse_color, default=(0,0,0,0), help='Background color R,G,B or R,G,B,A (default transparent)')
    args = p.parse_args()

    csv_path = Path(args.csv)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    base_dir = csv_path.parent

    images_dir = Path(args.images_dir) if args.images_dir else base_dir
    with csv_path.open('r', newline='', encoding='utf-8') as fh:
        reader = csv.reader(fh)
        for idx, row in enumerate(reader, start=1):
            # skip empty rows
            fields = [f.strip() for f in row if f.strip()]
            if not fields:
                continue

            # Resolve each field to an absolute path. If field has no extension,
            # assume .png. Try these in order:
            # 1. absolute path as given
            # 2. relative to CSV folder
            # 3. relative to provided images-dir
            # If none found, warn and skip that entry.
            resolved = []
            for f in fields:
                p = Path(f)
                # if no suffix, assume .png
                if not p.suffix:
                    p = p.with_suffix('.png')
                candidates = []
                if p.is_absolute():
                    candidates.append(p)
                else:
                    candidates.append(base_dir / p)
                    if images_dir != base_dir:
                        candidates.append(images_dir / p)
                    # also try just the relative path as-is
                    candidates.append(Path(p))

                found = None
                for c in candidates:
                    if c.exists():
                        found = c.resolve()
                        break
                if found:
                    resolved.append(found)
                else:
                    print(f"Row {idx}: warning - file not found for '{f}' (tried: {', '.join(str(x) for x in candidates)})", file=sys.stderr)

            if not resolved:
                print(f"Row {idx}: no valid image paths after resolution", file=sys.stderr)
                continue

            merged = merge_images(resolved, canvas_size=args.canvas, center=args.center, bg=args.bg_color)
            if merged is None:
                print(f"Row {idx}: failed to merge", file=sys.stderr)
                continue
            # determine output filename
            if args.name_from_first and resolved:
                name = Path(resolved[0]).stem
                out_name = f"{name}.png"
            else:
                out_name = f"row-{idx}.png"
            out_path = out_dir / out_name
            merged.save(str(out_path))
            print(f"Wrote {out_path}")

if __name__ == '__main__':
    main()
