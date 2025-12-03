#!/usr/bin/env python3
"""Trim images by removing uniform background border or transparent border.

Usage:
  python scripts/trim_images.py --images-dir ./images --output-dir ./out --padding 4

The script will:
 - Walk `--images-dir` (non-recursive by default, use `--recursive` to include subfolders)
 - For each image, detect the bounding box of non-background pixels
   - If the image has an alpha channel, non-transparent pixels are considered foreground
   - Otherwise the color of the top-left pixel is considered the background color
 - Apply `--padding` pixels around the bounding box (clamped to image bounds)
 - Save the cropped image to `--output-dir` preserving the filename

Options:
  --images-dir   Path to directory containing images (required)
  --output-dir   Directory to write trimmed images (required)
  --padding      Number of pixels to pad around trimmed area (default 0)
  --recursive    Recurse into subdirectories
  --overwrite    Overwrite existing files in output dir

This is intentionally lightweight and avoids extra dependencies beyond Pillow.
"""

from PIL import Image, ImageChops
import argparse
import os
import sys


def find_bbox_for_image(im: Image.Image):
    """Return bounding box (left, upper, right, lower) of non-background area or None."""
    # Work on a copy in RGBA to inspect alpha reliably
    im_rgba = im.convert('RGBA')
    r, g, b, a = im_rgba.split()

    # If any alpha is not fully opaque, use alpha channel to find bbox
    try:
        alpha_bbox = a.getbbox()
    except Exception:
        alpha_bbox = None

    if alpha_bbox:
        return alpha_bbox

    # No alpha (or fully opaque). Treat top-left pixel as background color.
    bg_color = im_rgba.getpixel((0, 0))[:3]
    img_rgb = im_rgba.convert('RGB')
    bg = Image.new('RGB', img_rgb.size, bg_color)
    diff = ImageChops.difference(img_rgb, bg)
    # Convert to L and getbbox where any channel differs
    bbox = diff.convert('L').point(lambda p: 255 if p else 0).getbbox()
    return bbox


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


def process_file(in_path, out_path, padding=0, overwrite=False):
    if not overwrite and os.path.exists(out_path):
        print(f"Skipping existing: {out_path}")
        return 'skipped'

    try:
        with Image.open(in_path) as im:
            bbox = find_bbox_for_image(im)
            if not bbox:
                # No content detected (all background). Save original (or skip)
                print(f"No foreground detected, copying original: {os.path.basename(in_path)}")
                im.save(out_path)
                return 'copied'

            left, upper, right, lower = bbox
            left = clamp(left - padding, 0, im.width)
            upper = clamp(upper - padding, 0, im.height)
            right = clamp(right + padding, 0, im.width)
            lower = clamp(lower + padding, 0, im.height)

            cropped = im.crop((left, upper, right, lower))
            # Ensure output dir exists
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            # Preserve format where possible
            save_kw = {}
            fmt = im.format if im.format else None
            if fmt:
                save_kw['format'] = fmt

            cropped.save(out_path, **save_kw)
            print(f"Saved trimmed: {out_path}")
            return 'trimmed'
    except Exception as e:
        print(f"ERROR processing {in_path}: {e}")
        return 'error'


def iter_images(images_dir, recursive=False, exts=None):
    if exts is None:
        exts = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'}

    if recursive:
        for root, dirs, files in os.walk(images_dir):
            for f in files:
                if os.path.splitext(f)[1].lower() in exts:
                    yield os.path.join(root, f)
    else:
        for f in os.listdir(images_dir):
            path = os.path.join(images_dir, f)
            if os.path.isfile(path) and os.path.splitext(f)[1].lower() in exts:
                yield path


def main(argv=None):
    parser = argparse.ArgumentParser(description='Trim images by removing uniform/transparent borders')
    parser.add_argument('--images-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--padding', type=int, default=0)
    parser.add_argument('--recursive', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args(argv)

    images_dir = args.images_dir
    output_dir = args.output_dir
    padding = args.padding

    if not os.path.isdir(images_dir):
        print(f"images-dir does not exist or is not a directory: {images_dir}")
        sys.exit(2)

    total = 0
    counts = {'trimmed': 0, 'copied': 0, 'skipped': 0, 'error': 0}

    for in_path in iter_images(images_dir, recursive=args.recursive):
        total += 1
        rel = os.path.relpath(in_path, images_dir)
        out_path = os.path.join(output_dir, rel)
        out_dir = os.path.dirname(out_path)
        os.makedirs(out_dir, exist_ok=True)

        result = process_file(in_path, out_path, padding=padding, overwrite=args.overwrite)
        if result in counts:
            counts[result] += 1
        else:
            counts['error'] += 1

    print('\nDone. Processed', total, 'files.')
    for k, v in counts.items():
        print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
