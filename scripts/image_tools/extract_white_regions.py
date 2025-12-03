#!/usr/bin/env python3
"""
Extract regions that are white (or near-white) and expand them until bounded by
black outlines; include the black outline pixels in the extracted region.

Outputs full-size RGBA PNGs for each found region using the naming convention
`{basename}-{index}.png` (same as other segmentation outputs).

Usage:
  python scripts/extract_white_regions.py -i path/to/image.png -o outdir

Options:
  --white-thresh   channel threshold for white detection (0-255, default 240)
  --black-thresh   grayscale threshold for outline detection (0-255, default 50)
  --min-area       minimum white-connected component area to keep (pixels)
  --morph-iter     morphological closing iterations applied to outline map
  --dilate-iter    dilation iterations applied to outline map
  --full-only      only write full-size outputs
  --debug          write debug intermediate images

Dependencies:
  pip install opencv-python numpy

"""

import argparse
from pathlib import Path
import cv2
import numpy as np
import os
import sys


def ensure_dir(p):
    Path(p).mkdir(parents=True, exist_ok=True)


def load_image(path):
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f"Failed to load image: {path}")
    return img


def save_png_with_alpha(path, rgba):
    cv2.imwrite(str(path), rgba)


def find_white_components(img_bgr, white_thresh=240):
    # white pixels where all channels >= white_thresh
    b, g, r = cv2.split(img_bgr[:, :, :3])
    white_mask = (b >= white_thresh) & (g >= white_thresh) & (r >= white_thresh)
    white_mask = (white_mask.astype('uint8') * 255)
    num, labels, stats, centroids = cv2.connectedComponentsWithStats(white_mask, connectivity=8)
    comps = []
    for label in range(1, num):
        area = stats[label, cv2.CC_STAT_AREA]
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        w = stats[label, cv2.CC_STAT_WIDTH]
        h = stats[label, cv2.CC_STAT_HEIGHT]
        mask = (labels == label).astype('uint8') * 255
        comps.append((mask, (x, y, w, h), area))
    return comps, white_mask


def compute_outline_mask(gray, black_thresh=50, morph_iter=2, dilate_iter=2):
    # Black outline detection: threshold dark pixels, then close and dilate to thicken
    _, th = cv2.threshold(gray, black_thresh, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((3, 3), np.uint8)
    closed = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel, iterations=morph_iter)
    if dilate_iter > 0:
        closed = cv2.dilate(closed, kernel, iterations=dilate_iter)
    # outline mask: white pixels where outlines are
    outline_mask = closed
    return outline_mask, th, closed


def reconstruct_region_until_outline(seed_mask, outline_mask):
    # seed_mask: uint8 0/255, outline_mask: uint8 0/255 (outline==255)
    # We allow expansion only where outline_mask == 0 (i.e., not outline)
    allow_mask = (outline_mask == 0).astype('uint8') * 255
    kernel = np.ones((3, 3), np.uint8)
    prev = np.zeros_like(seed_mask)
    curr = seed_mask.copy()
    iter_count = 0
    while True:
        iter_count += 1
        dilated = cv2.dilate(curr, kernel, iterations=1)
        # constrain expansion to allowed pixels
        curr = cv2.bitwise_and(dilated, allow_mask)
        if np.array_equal(curr, prev) or iter_count > 10000:
            break
        prev = curr.copy()
    return curr


def extract_regions_from_image(img, white_thresh=240, black_thresh=50, min_area=300, morph_iter=2, dilate_iter=2, debug_dir=None):
    orig = img.copy()
    h, w = orig.shape[:2]
    gray = cv2.cvtColor(orig[:, :, :3], cv2.COLOR_BGR2GRAY)

    # Outline detection
    outline_mask, th_inv, closed = compute_outline_mask(gray, black_thresh=black_thresh, morph_iter=morph_iter, dilate_iter=dilate_iter)

    # Find white connected components
    comps, white_mask_all = find_white_components(orig, white_thresh=white_thresh)

    regions = []
    for mask, bbox, area in comps:
        if area < min_area:
            continue
        # reconstruct region starting from white component until bounded by outline
        region_recon = reconstruct_region_until_outline(mask, outline_mask)
        # include outline pixels adjacent to region
        # get outline pixels that touch region (dilate region by 1 and intersect with outline)
        region_dil = cv2.dilate(region_recon, np.ones((3, 3), np.uint8), iterations=1)
        touching_outline = cv2.bitwise_and(region_dil, outline_mask)
        # final mask includes reconstructed region and touching outline pixels
        final_mask = cv2.bitwise_or(region_recon, touching_outline)
        # store both final mask and the touching outline mask so we can
        # optionally save the outline separately later
        regions.append((final_mask, bbox, int(np.sum(region_recon > 0)), touching_outline))

    # sort by region area desc
    regions.sort(key=lambda x: -x[2])

    if debug_dir:
        ensure_dir(debug_dir)
        cv2.imwrite(os.path.join(debug_dir, 'white_mask.png'), white_mask_all)
        cv2.imwrite(os.path.join(debug_dir, 'outline_mask.png'), outline_mask)
        cv2.imwrite(os.path.join(debug_dir, 'outline_th_closed.png'), closed)

    return regions, orig


def save_regions(orig_img, regions, out_dir, basename, full_only=False):
    ensure_dir(out_dir)
    saved = []
    h_full, w_full = orig_img.shape[:2]
    for i, region in enumerate(regions):
        # support region tuple with or without outline mask for backward compatibility
        if len(region) == 3:
            mask, bbox, area = region
            outline_only_mask = None
        else:
            mask, bbox, area, outline_only_mask = region
        # prepare full-size RGBA where pixels outside mask are transparent
        rgba_full = np.zeros((h_full, w_full, 4), dtype=np.uint8)
        rgba_full[:, :, :3] = orig_img[:, :, :3]
        rgba_full[:, :, 3] = 0
        rgba_full[mask > 0, :3] = orig_img[mask > 0, :3]
        rgba_full[mask > 0, 3] = 255
        out_path = os.path.join(out_dir, f"{basename}-{i+1}.png")
        save_png_with_alpha(out_path, rgba_full)
        saved.append(out_path)
        # if we have an outline-only mask, save it as its own image
        if outline_only_mask is not None:
            rgba_outline = np.zeros((h_full, w_full, 4), dtype=np.uint8)
            # use original colors for outline pixels (or black if you prefer)
            rgba_outline[outline_only_mask > 0, :3] = orig_img[outline_only_mask > 0, :3]
            rgba_outline[outline_only_mask > 0, 3] = 255
            out_path_outline = os.path.join(out_dir, f"{basename}-{i+1}-outline.png")
            save_png_with_alpha(out_path_outline, rgba_outline)
            saved.append(out_path_outline)
        if not full_only:
            # also save cropped mask (optional)
            x, y, w, h = bbox
            crop = rgba_full[y:y+h, x:x+w]
            out_crop = os.path.join(out_dir, f"{basename}-{i+1}-crop.png")
            save_png_with_alpha(out_crop, crop)
            saved.append(out_crop)
    return saved


def parse_args():
    p = argparse.ArgumentParser(description='Extract white regions bounded by black outlines')
    p.add_argument('-i', '--input', required=True, help='Input image file (or directory - not yet supported)')
    p.add_argument('-o', '--out', required=True, help='Output directory')
    p.add_argument('--white-thresh', type=int, default=240, help='Channel threshold for white detection (0-255)')
    p.add_argument('--black-thresh', type=int, default=50, help='Grayscale threshold for black outline detection (0-255)')
    p.add_argument('--min-area', type=int, default=300, help='Minimum white connected component area to keep')
    p.add_argument('--morph-iter', type=int, default=2, help='Morphology close iterations for outline map')
    p.add_argument('--dilate-iter', type=int, default=2, help='Dilation iterations for outline map')
    p.add_argument('--full-only', action='store_true', help='Only write full-size outputs')
    p.add_argument('--debug', action='store_true', help='Write debug intermediate images to output folder')
    return p.parse_args()


def main():
    args = parse_args()
    inp = Path(args.input)
    out_dir = Path(args.out)
    ensure_dir(out_dir)
    files = []
    if inp.is_dir():
        # process all PNG files in the directory (assume png as requested)
        files = sorted(inp.glob('*.png'))
        if not files:
            print(f'No PNG files found in directory: {inp}', file=sys.stderr)
            return
    else:
        if not inp.exists():
            print(f'Input path does not exist: {inp}', file=sys.stderr)
            return
        files = [inp]

    total_saved = 0
    for f in files:
        try:
            img = load_image(str(f))
            debug_dir = str(out_dir) if args.debug else None
            regions, orig = extract_regions_from_image(img, white_thresh=args.white_thresh, black_thresh=args.black_thresh, min_area=args.min_area, morph_iter=args.morph_iter, dilate_iter=args.dilate_iter, debug_dir=debug_dir)
            if not regions:
                print(f'No regions extracted for {f}')
                continue
            basename = Path(f).stem
            saved = save_regions(orig, regions, str(out_dir), basename, full_only=args.full_only)
            total_saved += len(saved)
            print(f'Wrote {len(saved)} files for {f} -> {out_dir}')
        except Exception as e:
            print(f'Error processing {f}: {e}', file=sys.stderr)
    print(f'Total files written: {total_saved}')

if __name__ == '__main__':
    main()
