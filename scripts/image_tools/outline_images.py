#!/usr/bin/env python3
"""Outline image foregrounds and save results.

Creates an outline (stroke) around the detected foreground of each image in
`--images-dir` and writes to `--output-dir`. The script auto-pads the canvas so
the outline does not get clipped.

Usage example:

  python scripts/outline_images.py --images-dir ./images --output-dir ./out --outline-width 6 --outline-color '#000000' --recursive

Options:
  --images-dir     Directory containing images (required)
  --output-dir     Where to write outlined images (required)
  --outline-width  Outline/stroke width in pixels (default 4)
  --outline-color  Outline color as hex (e.g. #000000) or common name (default '#000')
  --recursive      Recurse into subdirectories
  --overwrite      Overwrite existing outputs

This uses Pillow only. It detects foreground by alpha when available; otherwise
it treats the top-left pixel as background color and finds differing pixels.
"""

from PIL import Image, ImageChops, ImageFilter, ImageOps
import argparse
import os
import sys
import re


def parse_color(col_str):
    # Accept '#RRGGBB' or common names (pass-through to Pillow may accept names)
    if not col_str:
        return (0, 0, 0)
    col_str = col_str.strip()
    if col_str.startswith('#'):
        hexv = col_str[1:]
        if len(hexv) == 3:
            hexv = ''.join([c*2 for c in hexv])
        if len(hexv) != 6:
            raise ValueError('Invalid hex colour')
        r = int(hexv[0:2], 16)
        g = int(hexv[2:4], 16)
        b = int(hexv[4:6], 16)
        return (r, g, b)
    # fallback: try to let Pillow resolve names by returning the string
    return col_str


def foreground_mask(im: Image.Image):
    """Return a binary mask (L mode) where foreground pixels are 255.

    Uses alpha channel if any non-zero alpha exists; otherwise uses top-left
    pixel as background and marks differing pixels as foreground.
    """
    im_rgba = im.convert('RGBA')
    r, g, b, a = im_rgba.split()
    try:
        alpha_bbox = a.getbbox()
    except Exception:
        alpha_bbox = None

    if alpha_bbox:
        # Use alpha channel: consider any non-zero as foreground
        return a.point(lambda p: 255 if p > 0 else 0).convert('L')

    # No meaningful alpha; treat top-left pixel as background color
    bg_color = im_rgba.getpixel((0, 0))[:3]
    img_rgb = im_rgba.convert('RGB')
    bg = Image.new('RGB', img_rgb.size, bg_color)
    diff = ImageChops.difference(img_rgb, bg)
    mask = diff.convert('L').point(lambda p: 255 if p > 0 else 0)
    return mask


def dilate_mask(mask: Image.Image, width: int):
    """Dilate binary mask by `width` pixels using repeated MaxFilter.

    MaxFilter with size=3 is roughly a 1-pixel dilation; repeat `width`
    times to grow the mask. For performance, we limit iterations to a
    reasonable maximum.
    """
    if width <= 0:
        return mask
    # Convert to 'L' and ensure binary
    m = mask.convert('L').point(lambda p: 255 if p > 0 else 0)
    # Cap iterations to avoid pathological runs
    max_iters = min(width, 200)
    for _ in range(max_iters):
        m = m.filter(ImageFilter.MaxFilter(3))
    return m


def outline_image(im: Image.Image, outline_width: int, outline_color, pad: bool = True, only_outline: bool = False):
    """Return a new RGBA image with an outline applied.

    If pad is True, the returned image includes padding so the outline isn't
    clipped; otherwise the outline may be clipped at edges.
    """
    im = im.convert('RGBA')
    mask = foreground_mask(im)

    if outline_width <= 0:
        return im

    dilated = dilate_mask(mask, outline_width)
    # outer ring = dilated - original
    outer = ImageChops.subtract(dilated, mask)

    w, h = im.size
    pad = outline_width if pad else 0
    new_w, new_h = w + 2 * pad, h + 2 * pad

    # Create base canvas with transparency
    canvas = Image.new('RGBA', (new_w, new_h), (0, 0, 0, 0))

    # Prepare colored outline image (solid color)
    if isinstance(outline_color, tuple):
        color_img = Image.new('RGBA', (new_w, new_h), outline_color + (255,))
    else:
        # allow Pillow to interpret color names
        color_img = Image.new('RGBA', (new_w, new_h), outline_color)

    # Build a padded mask the same size as the canvas and paste the outer ring into it
    outer_padded = Image.new('L', (new_w, new_h), 0)
    # outer is same size as original (w,h); paste it offset by pad
    outer_padded.paste(outer.convert('L'), (pad, pad))

    # Paste outline color using the padded outer mask
    canvas.paste(color_img, (0, 0), outer_padded)

    # Optionally paste the original image on top (offset by pad)
    if not only_outline:
        canvas.paste(im, (pad, pad), im)
    return canvas


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


def process_file(in_path, out_path, outline_width, outline_color, overwrite=False, only_outline=False):
    if not overwrite and os.path.exists(out_path):
        print(f"Skipping existing: {out_path}")
        return 'skipped'
    try:
        with Image.open(in_path) as im:
            result_im = outline_image(im, outline_width, outline_color, pad=True, only_outline=only_outline)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)

            # If user requested only the outline, ensure an alpha-capable extension/format
            ext = os.path.splitext(out_path)[1].lower()
            alpha_exts = {'.png': 'PNG', '.webp': 'WEBP', '.gif': 'GIF', '.tif': 'TIFF', '.tiff': 'TIFF'}
            save_kw = {}
            if only_outline:
                if ext not in alpha_exts:
                    # change to .png to preserve transparency
                    out_path = os.path.splitext(out_path)[0] + '.png'
                    fmt = 'PNG'
                    print(f"Only-outline requested; changing output to: {out_path}")
                else:
                    fmt = alpha_exts.get(ext, 'PNG')
            else:
                # prefer original format where available
                fmt = im.format if im.format else None

            if fmt:
                save_kw['format'] = fmt

            result_im.save(out_path, **save_kw)
            print(f"Saved outlined: {out_path}")
            return 'outlined'
    except Exception as e:
        print(f"ERROR processing {in_path}: {e}")
        return 'error'


def main(argv=None):
    parser = argparse.ArgumentParser(description='Add outline strokes to images')
    parser.add_argument('--images-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--outline-width', type=int, default=4)
    parser.add_argument('--outline-color', default='#000')
    parser.add_argument('--only-outline', action='store_true', help='Save only the outline on a transparent background (forces PNG output when necessary)')
    parser.add_argument('--recursive', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args(argv)

    images_dir = args.images_dir
    output_dir = args.output_dir
    outline_width = max(0, args.outline_width)
    outline_color = parse_color(args.outline_color)

    if not os.path.isdir(images_dir):
        print(f"images-dir does not exist or is not a directory: {images_dir}")
        sys.exit(2)

    total = 0
    counts = {'outlined': 0, 'skipped': 0, 'error': 0}

    for in_path in iter_images(images_dir, recursive=args.recursive):
        total += 1
        rel = os.path.relpath(in_path, images_dir)
        out_path = os.path.join(output_dir, rel)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        result = process_file(in_path, out_path, outline_width, outline_color, overwrite=args.overwrite, only_outline=args.only_outline)
        if result in counts:
            counts[result] += 1
        else:
            counts['error'] += 1

    print('\nDone. Processed', total, 'files.')
    for k, v in counts.items():
        print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
