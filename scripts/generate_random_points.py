#!/usr/bin/env python3
"""
Generate random non-transparent 3x3 sample points for images in a directory.

Usage:
  python scripts/generate_random_points.py --images-dir PATH --output-json out.json [--points 10] [--seed 123]

Output JSON format:
{
  "image_name_without_ext": [[x,y], [x,y], ...],
  ...
}

Notes:
- For each chosen point (x,y) the 3x3 neighborhood centered at (x,y) must be fully opaque.
- Images without an alpha channel are treated as fully opaque.
- Images smaller than 3x3 are skipped.
"""

import argparse
import json
import os
import random
from PIL import Image, ImageDraw


def has_full_alpha(img, x, y):
    """Return True if the 3x3 neighborhood centered at (x,y) is fully opaque.
    img is an RGBA PIL Image.
    """
    w, h = img.size
    # ensure neighborhood in bounds (caller should only pick x in [1,w-2])
    if x <= 0 or x >= w-1 or y <= 0 or y >= h-1:
        return False
    pixels = img.load()
    for yy in range(y - 1, y + 2):
        for xx in range(x - 1, x + 2):
            r, g, b, a = pixels[xx, yy]
            if a == 0:
                return False
    return True


def choose_points_for_image(img_path, points=10, max_attempts=20000):
    """Return a list of (x,y) points for one image path.

    Raises RuntimeError if not enough valid points found within max_attempts.
    """
    try:
        im = Image.open(img_path)
    except Exception as e:
        raise RuntimeError(f"Failed to open image {img_path}: {e}")

    w, h = im.size
    if w < 3 or h < 3:
        raise RuntimeError(f"Image too small for 3x3 checks: {img_path} ({w}x{h})")

    # Convert to RGBA to inspect alpha.
    # If the image has no alpha, converting to RGBA will set alpha=255 everywhere.
    rgba = im.convert('RGBA')

    chosen = []
    attempts = 0
    tried = set()

    # Precompute possible candidate coordinates (centers where 3x3 fits)
    candidates = [(x, y) for x in range(1, w - 1) for y in range(1, h - 1)]
    if not candidates:
        raise RuntimeError(f"No candidates in image {img_path}")

    # Randomly sample without replacement if there are enough candidates
    # but we still check alpha; continue until points found or attempts exhausted.
    while len(chosen) < points and attempts < max_attempts:
        attempts += 1
        x, y = random.choice(candidates)
        if (x, y) in tried:
            continue
        tried.add((x, y))
        if has_full_alpha(rgba, x, y):
            chosen.append([int(x), int(y)])
        # If we've tried all candidates, break
        if len(tried) >= len(candidates) and len(chosen) < points:
            break

    if len(chosen) < points:
        raise RuntimeError(f"Could not find {points} valid points in {img_path} after {attempts} attempts (found {len(chosen)})")

    return chosen


def is_image_file(fname):
    ext = os.path.splitext(fname)[1].lower()
    return ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff']


def main():
    p = argparse.ArgumentParser(description='Generate random non-transparent 3x3 sample points for images')
    p.add_argument('--images-dir', required=True, help='Directory containing images to process')
    p.add_argument('--output-json', required=True, help='Output JSON path')
    p.add_argument('--points', type=int, default=10, help='Number of points to pick per image (default 10)')
    p.add_argument('--seed', type=int, default=None, help='Optional random seed for reproducible results')
    p.add_argument('--annotate-dir', type=str, default=None, help='Optional directory to write annotated images with highlighted points')
    p.add_argument('--marker-size', type=int, default=4, help='Half-size in pixels of the marker to draw around each point (default 4)')
    p.add_argument('--max-attempts', type=int, default=20000, help='Maximum attempts per image')
    args = p.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    images_dir = args.images_dir
    if not os.path.isdir(images_dir):
        print(f"Error: images dir not found: {images_dir}")
        return 1

    annotate_dir = args.annotate_dir
    marker_size = max(1, int(args.marker_size))
    if annotate_dir:
        try:
            os.makedirs(annotate_dir, exist_ok=True)
        except Exception as e:
            print(f"Error: could not create annotate dir {annotate_dir}: {e}")
            return 1

    results = {}
    files = sorted(os.listdir(images_dir))
    for fname in files:
        if not is_image_file(fname):
            continue
        path = os.path.join(images_dir, fname)
        key = os.path.splitext(fname)[0]
        try:
            pts = choose_points_for_image(path, points=args.points, max_attempts=args.max_attempts)
            results[key] = pts
            print(f"OK: {fname} -> {len(pts)} points")
            # Write annotated image if requested
            if annotate_dir:
                try:
                    with Image.open(path) as orig_im:
                        draw = ImageDraw.Draw(orig_im)
                        for (x, y) in pts:
                            # draw a larger red rectangle around the marker center
                            half = marker_size
                            left = x - half
                            top = y - half
                            right = x + half
                            bottom = y + half
                            # rectangle outline (thicker for visibility)
                            draw.rectangle([left, top, right, bottom], outline=(255, 0, 0), width=2)
                            # cross center (extend slightly beyond rectangle)
                            ext = max(2, half)
                            draw.line([(x - ext, y), (x + ext, y)], fill=(255, 0, 0), width=2)
                            draw.line([(x, y - ext), (x, y + ext)], fill=(255, 0, 0), width=2)
                        out_path = os.path.join(annotate_dir, fname)
                        # preserve format by using original image format if possible
                        try:
                            orig_im.save(out_path)
                        except Exception:
                            # fallback to PNG
                            orig_im.convert('RGBA').save(out_path, 'PNG')
                except Exception as e:
                    print(f"ERROR annotating {fname}: {e}")
        except Exception as e:
            print(f"ERROR processing {fname}: {e}")

    # Write JSON
    try:
        with open(args.output_json, 'w', encoding='utf-8') as fh:
            json.dump(results, fh, indent=2)
        print(f"Wrote output to {args.output_json}")
    except Exception as e:
        print(f"Failed to write output JSON: {e}")
        return 1

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
