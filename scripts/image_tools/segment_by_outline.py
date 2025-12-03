#!/usr/bin/env python3
"""
Segment Pokémon artwork into separate parts using black outlines as boundaries.

This script uses OpenCV to detect dark outlines and then extracts connected regions
bounded by those outlines. It saves each region as a masked PNG and optionally
writes debug images (thresholds, contours, overlays).

Usage:
  python scripts/segment_by_outline.py -i path/to/image.png -o output_dir

Dependencies:
  pip install opencv-python numpy

Notes:
  - This is a heuristic approach that works best on art with clear black outlines.
  - Tune `--thresh`, `--min-area`, and `--morph-iter` for different art styles.
"""

import argparse
import os
import cv2
import numpy as np
from pathlib import Path


def ensure_dir(p):
    Path(p).mkdir(parents=True, exist_ok=True)


def load_image(path):
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f"Failed to load image: {path}")
    return img


def save_png_with_alpha(path, rgba):
    # rgba expected as HxWx4 uint8
    cv2.imwrite(str(path), rgba)


def visualize_overlay(img, mask, color=(0, 255, 0), alpha=0.5):
    # img BGR(A) uint8, mask single-channel 0/255
    overlay = img.copy()
    # Work only on color channels (ignore alpha channel if present)
    if overlay.ndim == 3 and overlay.shape[2] == 4:
        rgb = overlay[:, :, :3]
        has_alpha = True
    else:
        rgb = overlay
        has_alpha = False

    # Ensure color is a float array with 3 channels
    col = np.array(color, dtype=np.float32)

    # Blend only the pixels where mask > 0
    sel = mask > 0
    if sel.any():
        # perform blending on the selected pixels
        rgb_sel = rgb[sel].astype(np.float32)
        blended = (rgb_sel * (1.0 - alpha) + col * alpha).astype(np.uint8)
        rgb[sel] = blended

    # Write back into overlay and preserve alpha channel if present
    if has_alpha:
        overlay[:, :, :3] = rgb
    else:
        overlay = rgb

    return overlay


def segment_by_outline(img, thresh=50, min_area=500, morph_iter=2, dilate_iter=2, debug_dir=None):
    """
    img: BGR or BGRA image (numpy array)
    returns list of (mask, bbox)
    """
    orig = img.copy()
    h, w = orig.shape[:2]

    # Convert to grayscale
    gray = cv2.cvtColor(orig[:, :, :3], cv2.COLOR_BGR2GRAY)

    # Threshold to capture dark pixels (black outlines)
    # We invert so outlines become white on black background
    _, th = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY_INV)

    # Morphological close to connect outline gaps, then dilate to thicken
    kernel = np.ones((3, 3), np.uint8)
    closed = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel, iterations=morph_iter)
    if dilate_iter > 0:
        closed = cv2.dilate(closed, kernel, iterations=dilate_iter)

    # Find contours on the CLOSED outline image. We want the areas enclosed by the outlines,
    # so we invert "closed" to treat interior regions as foreground.
    inv = cv2.bitwise_not(closed)

    # Find connected components on inv. Each connected component corresponds to a region
    # bounded by the dark outlines (assuming outlines are closed).
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(inv, connectivity=8)

    regions = []
    for label in range(1, num_labels):
        area = stats[label, cv2.CC_STAT_AREA]
        if area < min_area:
            continue
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        ww = stats[label, cv2.CC_STAT_WIDTH]
        hh = stats[label, cv2.CC_STAT_HEIGHT]
        mask = (labels == label).astype('uint8') * 255
        regions.append((mask, (x, y, ww, hh), area))

    # Sort by descending area
    regions.sort(key=lambda x: -x[2])

    if debug_dir:
        # Save debug images
        ensure_dir(debug_dir)
        cv2.imwrite(os.path.join(debug_dir, 'gray.png'), gray)
        cv2.imwrite(os.path.join(debug_dir, 'thresh_inv.png'), th)
        cv2.imwrite(os.path.join(debug_dir, 'closed.png'), closed)
        cv2.imwrite(os.path.join(debug_dir, 'inv.png'), inv)
        # Overlay top regions
        overlay = orig.copy()
        drawn = np.zeros((h, w), dtype=np.uint8)
        for i, (mask, bbox, area) in enumerate(regions[:10]):
            color = tuple(int(c) for c in np.random.randint(80, 255, size=3))
            overlay = visualize_overlay(overlay, mask, color=color, alpha=0.4)
            drawn = np.maximum(drawn, mask)
        cv2.imwrite(os.path.join(debug_dir, 'overlay_regions.png'), overlay)
        cv2.imwrite(os.path.join(debug_dir, 'drawn.png'), drawn)

    return regions


def extract_and_save(orig_img, regions, out_dir, basename, full_only=False):
    ensure_dir(out_dir)
    saved = []
    for i, (mask, (x, y, w, h), area) in enumerate(regions):
        # If not full_only, save cropped region (legacy behavior)
        if not full_only:
            mask_crop = mask[y:y+h, x:x+w]
            img_crop = orig_img[y:y+h, x:x+w]
            bgr = img_crop[:, :, :3]
            alpha = mask_crop
            rgba_crop = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
            rgba_crop[:, :, 3] = alpha
            out_path_crop = os.path.join(out_dir, f"{basename}-{i+1}-crop.png")
            save_png_with_alpha(out_path_crop, rgba_crop)
            saved.append(out_path_crop)

        # Always save full-size masked image so parts can be layered back together
        h_full, w_full = orig_img.shape[:2]
        rgba_full = np.zeros((h_full, w_full, 4), dtype=np.uint8)
        # copy BGR channels (handle images with alpha)
        rgba_full[:, :, :3] = orig_img[:, :, :3]
        # set alpha to the mask (full-size)
        rgba_full[:, :, 3] = mask

        # (Optional) draw the outline for this region so the layer contains only
        # the outline surrounding *this* segment. We'll compute contours from the
        # mask and draw them into the full-size image as opaque outline pixels.
        try:
            # findContours return compatibility
            contours_info = cv2.findContours(mask.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contours = contours_info[0] if len(contours_info) == 2 else contours_info[1]
            if contours:
                # create an outline mask and draw contours
                outline_mask = np.zeros((h_full, w_full), dtype=np.uint8)
                # default thickness 2; if user provided outline width it will be applied later
                cv2.drawContours(outline_mask, contours, -1, 255, thickness=2)
                # apply outline: make outline pixels opaque and set color to black
                # Set outline color (black) - can be parameterized later
                outline_color = (0, 0, 0)
                rgba_full[outline_mask > 0, :3] = outline_color
                rgba_full[outline_mask > 0, 3] = 255
        except Exception:
            # ignore contour drawing failures and continue
            pass

        out_path_full = os.path.join(out_dir, f"{basename}-{i+1}.png")
        save_png_with_alpha(out_path_full, rgba_full)
        saved.append(out_path_full)
    return saved


def process_file(path, out_dir, args):
    img = load_image(path)
    regions = segment_by_outline(img, thresh=args.thresh, min_area=args.min_area, morph_iter=args.morph_iter, dilate_iter=args.dilate_iter, debug_dir=(out_dir if args.debug else None))
    if not regions:
        print(f"No regions found for {path}")
        return []
    basename = Path(path).stem
    saved = extract_and_save(img, regions, out_dir, basename, full_only=args.full_only)
    print(f"Saved {len(saved)} parts for {path} -> {out_dir}")
    return saved


def main():
    p = argparse.ArgumentParser(description="Segment artwork into parts using black outlines.")
    p.add_argument('-i', '--input', required=True, help='Input image file or directory')
    p.add_argument('-o', '--out', required=True, help='Output directory')
    p.add_argument('--thresh', type=int, default=50, help='Grayscale threshold to detect dark pixels (lower -> more dark areas detected)')
    p.add_argument('--min-area', type=int, default=300, help='Minimum region area (pixels) to keep')
    p.add_argument('--morph-iter', type=int, default=2, help='Morphology close iterations to bridge outline gaps')
    p.add_argument('--dilate-iter', type=int, default=2, help='Dilation iterations to thicken outlines')
    p.add_argument('--debug', action='store_true', help='Write debug images into output directory')
    p.add_argument('--full-only', action='store_true', help='Write only full-size masked outputs (skip cropped parts)')
    p.add_argument('--segments-only', action='store_true', help='Only write segment images (suppress debug and other files)')
    args = p.parse_args()

    inp = Path(args.input)
    out = Path(args.out)
    ensure_dir(out)

    files = []
    if inp.is_dir():
        for ext in ('.png', '.jpg', '.jpeg', '.webp'):
            files.extend(sorted(inp.glob(f'*{ext}')))
    else:
        files = [inp]

    if not files:
        print('No input files found')
        return

    for f in files:
        try:
            # If segments-only is requested, suppress debug outputs and force full-only segments
            if args.segments_only:
                # disable debug and force full-only
                args_debug = False
                args_full_only = True
            else:
                args_debug = args.debug
                args_full_only = args.full_only

            # pass debug_dir only when debug enabled and not segments-only
            debug_dir = str(out) if args_debug else None
            img = load_image(str(f))
            regions = segment_by_outline(img, thresh=args.thresh, min_area=args.min_area, morph_iter=args.morph_iter, dilate_iter=args.dilate_iter, debug_dir=debug_dir)
            if not regions:
                print(f"No regions found for {f}")
                continue
            basename = Path(f).stem
            extract_and_save(img, regions, str(out), basename, full_only=args_full_only)
        except Exception as e:
            print(f'Error processing {f}: {e}')

if __name__ == '__main__':
    main()
