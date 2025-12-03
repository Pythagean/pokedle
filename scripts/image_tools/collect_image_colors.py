#!/usr/bin/env python3
"""
Collect and report most common colours per image in a directory.

Usage:
  python scripts/collect_image_colors.py --images-dir PATH [--output-dir PATH] [--top N]

For each image this prints the top N colours (hex + count + percentage).
If `--output-dir` is provided, writes a per-image colour-block PNG named
`<image_basename>_colors.png` containing the top N colour swatches.

Requires: Pillow
  pip install pillow
"""

import argparse
import os
from collections import Counter
from PIL import Image

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'}


def is_image_file(fn):
    return os.path.splitext(fn)[1].lower() in IMAGE_EXTS


def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(*rgb)


def collect_colors_from_image(path, max_dim=None, skip_transparent=True):
    """Open image, optionally downsample, and return Counter of (r,g,b) -> count.

    If skip_transparent is True, fully transparent pixels (a==0) are ignored.
    """
    try:
        im = Image.open(path).convert('RGBA')
    except Exception as e:
        raise RuntimeError(f'Failed to open {path}: {e}')

    # Optionally resize for performance while preserving aspect ratio
    if max_dim:
        w, h = im.size
        if max(w, h) > max_dim:
            scale = max_dim / float(max(w, h))
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    data = im.getdata()
    c = Counter()
    for px in data:
        r, g, b, a = px
        if skip_transparent and a == 0:
            continue
        c[(r, g, b)] += 1
    return c


def write_color_blocks(out_path, colors, block_size=100, cols=10, padding=4):
    """Write a small PNG showing colour blocks for the provided colours.

    `colors` should be an iterable of ((r,g,b), count).
    """
    if not colors:
        return
    top = len(colors)
    cols = min(cols, top)
    rows = (top + cols - 1) // cols
    width = cols * block_size + (cols + 1) * padding
    height = rows * block_size + (rows + 1) * padding
    out = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw_x = padding
    draw_y = padding
    i = 0
    for (rgb, cnt) in colors:
        col_img = Image.new('RGBA', (block_size, block_size), rgb + (255,))
        out.paste(col_img, (draw_x, draw_y))
        draw_x += block_size + padding
        i += 1
        if i % cols == 0:
            draw_x = padding
            draw_y += block_size + padding
    out.save(out_path)


def main():
    p = argparse.ArgumentParser(description='Collect top colours from images')
    p.add_argument('--images-dir', required=True, help='Directory with images')
    p.add_argument('--output-dir', required=False, help='Optional output dir to save per-image colour blocks')
    p.add_argument('--top', type=int, default=20, help='How many top colours to show per image')
    p.add_argument('--max-dim', type=int, default=800, help='If set, downsample images to this max dimension for counting')
    args = p.parse_args()

    images_dir = args.images_dir
    if not os.path.isdir(images_dir):
        print(f"Error: images dir not found: {images_dir}")
        return 2

    out_dir = args.output_dir
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    files = sorted(os.listdir(images_dir))
    img_files = [f for f in files if is_image_file(f)]
    if not img_files:
        print('No image files found in', images_dir)
        return 0

    for fname in img_files:
        path = os.path.join(images_dir, fname)
        try:
            ctr = collect_colors_from_image(path, max_dim=args.max_dim, skip_transparent=True)
        except Exception as e:
            print(f'ERROR reading {fname}: {e}')
            continue
        # Remove pure black and a few near-black artefacts from results entirely
        # Exclude these exact RGB tuples: #000000, #010101, #010000, #0a080b
        for bad in ((0, 0, 0), (1, 1, 1), (1, 0, 0), (10, 8, 11)):
            if bad in ctr:
                del ctr[bad]
        total = sum(ctr.values())
        print(f"\n{fname}  (pixels counted: {total})")
        if total == 0:
            print('  No opaque pixels found')
            continue
        topn = ctr.most_common(args.top)
        for i, (rgb, c) in enumerate(topn, start=1):
            print(f'  {i:2d}. {rgb_to_hex(rgb)}  count={c}  ({c/total:.2%})')

        if out_dir:
            safe_base = os.path.splitext(fname)[0]
            out_name = f"{safe_base}.png"
            out_path = os.path.join(out_dir, out_name)
            colors = [((r, g, b), cnt) for ((r, g, b), cnt) in topn]
            try:
                write_color_blocks(out_path, colors, block_size=100, cols=10)
            except Exception as e:
                print(f'  Failed to write color block for {fname}: {e}')
            else:
                print(f'  Wrote color blocks to {out_path}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
