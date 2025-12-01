#!/usr/bin/env python3
"""Keep only near-black pixels in images and make the rest transparent.

This script walks an images directory and, for each image, writes a new image
where pixels considered "black" are preserved as fully opaque black and all
other pixels are transparent. The threshold determines how close to black a
pixel must be; it's applied to the luma (brightness) channel.

Usage:
  python scripts/keep_black_pixels.py --images-dir ./images --output-dir ./out --threshold 48 --recursive

Options:
  --images-dir   Directory containing images (required)
  --output-dir   Directory to save processed images (required)
  --threshold    Luma threshold (0-255) — pixels with luma <= threshold are kept (default 48)
  --recursive    Recurse into subdirectories
  --overwrite    Overwrite existing outputs

Notes:
 - The script uses Pillow only. It preserves existing alpha by AND-ing the
   computed black mask with the original alpha channel if present.
 - Output will be PNG if the chosen output extension doesn't support alpha.
"""

from PIL import Image, ImageChops
import argparse
import os
import sys


def keep_black_image(im: Image.Image, threshold: int):
    """Return an RGBA image where only near-black pixels are kept (black on transparent)."""
    im_rgba = im.convert('RGBA')
    w, h = im_rgba.size

    # Convert to luma (Pillow's 'L' uses the standard coefficients)
    luma = im_rgba.convert('L')

    # Binary mask where luma <= threshold -> 255 else 0
    mask = luma.point(lambda p: 255 if p <= threshold else 0)

    # Combine with original alpha so we don't resurrect fully transparent pixels
    orig_alpha = im_rgba.split()[3]
    # Use darker (min) to perform logical AND on 0/255 images
    combined = ImageChops.darker(orig_alpha, mask)

    # Create black image and apply combined as alpha
    black = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    black.putalpha(combined)
    return black


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


def process_file(in_path, out_path, threshold, overwrite=False):
    if not overwrite and os.path.exists(out_path):
        print(f"Skipping existing: {out_path}")
        return 'skipped'
    try:
        with Image.open(in_path) as im:
            result = keep_black_image(im, threshold)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)

            # Ensure alpha-capable output (force PNG if necessary)
            ext = os.path.splitext(out_path)[1].lower()
            alpha_exts = {'.png': 'PNG', '.webp': 'WEBP', '.gif': 'GIF', '.tif': 'TIFF', '.tiff': 'TIFF'}
            save_kw = {}
            if ext not in alpha_exts:
                out_path = os.path.splitext(out_path)[0] + '.png'
                fmt = 'PNG'
            else:
                fmt = alpha_exts.get(ext, 'PNG')
            save_kw['format'] = fmt

            result.save(out_path, **save_kw)
            print(f"Saved: {out_path}")
            return 'saved'
    except Exception as e:
        print(f"ERROR processing {in_path}: {e}")
        return 'error'


def main(argv=None):
    parser = argparse.ArgumentParser(description='Keep only near-black pixels (make rest transparent)')
    parser.add_argument('--images-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--threshold', type=int, default=48, help='Luma threshold (0-255)')
    parser.add_argument('--recursive', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args(argv)

    images_dir = args.images_dir
    output_dir = args.output_dir
    threshold = max(0, min(255, args.threshold))

    if not os.path.isdir(images_dir):
        print(f"images-dir does not exist or is not a directory: {images_dir}")
        sys.exit(2)

    total = 0
    counts = {'saved': 0, 'skipped': 0, 'error': 0}

    for in_path in iter_images(images_dir, recursive=args.recursive):
        total += 1
        rel = os.path.relpath(in_path, images_dir)
        out_path = os.path.join(output_dir, rel)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        result = process_file(in_path, out_path, threshold, overwrite=args.overwrite)
        if result in counts:
            counts[result] += 1
        else:
            counts['error'] += 1

    print('\nDone. Processed', total, 'files.')
    for k, v in counts.items():
        print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
