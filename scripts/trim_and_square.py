#!/usr/bin/env python3
"""
Trim transparent whitespace around sprites and produce a square (1:1) image.

Usage:
  python scripts/trim_and_square.py --images-dir path/to/images --output-dir path/to/out --padding 4

Requirements:
  - Pillow (install with `pip install pillow`)

Behavior:
  - Finds the minimal bounding box around non-transparent pixels (or non-background
    pixels for images without alpha), expands it by `padding`, crops, then centers
    the crop on a square transparent background whose side length is the max of
    crop width/height. Outputs PNG files to the output directory, preserving
    filenames but converting to .png when necessary.
"""
from __future__ import annotations
import argparse
import os
from pathlib import Path
from PIL import Image, ImageChops
import sys


def find_bbox_of_nontransparent(im: Image.Image, threshold: int = 1):
    """Return bbox of non-transparent region.

    If image has an alpha channel, use it. Otherwise, convert to L and use a
    brightness threshold to determine non-background pixels.
    """
    if im.mode in ("RGBA", "LA") or ("transparency" in im.info):
        alpha = im.split()[-1]
        bbox = alpha.point(lambda p: 255 if p >= threshold else 0).getbbox()
        return bbox
    # No alpha: create a mask of "non-background" pixels using luminance
    gray = im.convert("L")
    # Treat near-white as background; threshold 250 (adjustable)
    mask = gray.point(lambda p: 0 if p >= 250 else 255)
    return mask.getbbox()


def trim_and_square_image(src_path: Path, dst_path: Path, padding: int = 0):
    im = Image.open(src_path).convert("RGBA")
    bbox = find_bbox_of_nontransparent(im)
    if bbox is None:
        # Image is fully transparent or fully background: create a small transparent square
        size = 1 + 2 * padding
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.save(dst_path, optimize=True)
        return True

    left, upper, right, lower = bbox
    left = max(0, left - padding)
    upper = max(0, upper - padding)
    right = min(im.width, right + padding)
    lower = min(im.height, lower + padding)

    cropped = im.crop((left, upper, right, lower))
    cw, ch = cropped.size
    side = max(cw, ch)

    # Create square background and paste centered
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    paste_x = (side - cw) // 2
    paste_y = (side - ch) // 2
    out.paste(cropped, (paste_x, paste_y), cropped)

    # Ensure parent directory exists
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_path, optimize=True)
    return True


def iter_image_files(images_dir: Path):
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
    for root, dirs, files in os.walk(images_dir):
        for f in files:
            if Path(f).suffix.lower() in exts:
                yield Path(root) / f


def iter_image_files_filtered(images_dir: Path, sprites_only: bool = False):
    """Iterate image files, optionally filtering to files that contain '-front' in the name."""
    for p in iter_image_files(images_dir):
        if sprites_only:
            if "-front" in p.stem:
                yield p
        else:
            yield p


def main(argv=None):
    p = argparse.ArgumentParser(description="Trim transparent whitespace and create squared sprites")
    p.add_argument("--images-dir", required=True, help="Directory containing input images")
    p.add_argument("--output-dir", required=True, help="Directory to write processed images")
    p.add_argument("--padding", type=int, default=0, help="Pixels of padding to preserve around trimmed sprite")
    p.add_argument("--overwrite", action="store_true", help="Overwrite existing files in output dir")
    p.add_argument("--sprites", action="store_true", help="Only process files with '-front' in the filename stem")
    args = p.parse_args(argv)

    images_dir = Path(args.images_dir)
    out_dir = Path(args.output_dir)
    padding = max(0, int(args.padding))

    if not images_dir.exists() or not images_dir.is_dir():
        print(f"images-dir not found: {images_dir}")
        return 2

    out_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    succeeded = 0
    for src in iter_image_files_filtered(images_dir, sprites_only=bool(getattr(args, 'sprites', False))):
        total += 1
        rel = src.relative_to(images_dir)
        dst = out_dir / rel.with_suffix('.png')
        if dst.exists() and not args.overwrite:
            print(f"Skipping (exists): {dst}")
            continue
        try:
            ok = trim_and_square_image(src, dst, padding=padding)
            if ok:
                print(f"Wrote: {dst}")
                succeeded += 1
            else:
                print(f"Failed: {src}")
        except Exception as e:
            print(f"Error processing {src}: {e}")

    print(f"Processed {succeeded}/{total} images into {out_dir}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
