#!/usr/bin/env python3
"""
Generate random non-transparent sample points for images in a directory.

Usage:
    python scripts/generate_random_points.py --images-dir PATH --output-json out.json [--points 10] [--seed 123]

Output JSON format:
{
    "image_name_without_ext": [[x,y], [x,y], ...],
    ...
}

Notes:
- For each chosen point (x,y) the surrounding neighborhood centered at (x,y) must be fully opaque.
- The neighborhood size is controlled by `--alpha-area` (side-length in pixels, default 3 = 3x3).
- Images without an alpha channel are treated as fully opaque.
- Images smaller than 3x3 are skipped.
- Optionally rejects points where the surrounding pixels (sampled) are all essentially the same
    colour. Use `--area` to control how many surrounding pixels are sampled (default 20) and
    `--threshold` to control the maximum colour distance considered "similar" (default 10).
"""

import argparse
import json
import os
import random
from PIL import Image, ImageDraw


def has_full_alpha(img, x, y, alpha_area=3):
    """Return True if the square neighborhood centered at (x,y) is fully opaque.
    `alpha_area` is the side-length in pixels (eg. 3 => 3x3 area). If an even
    value is provided it is treated as the next lower odd number (eg. 4 -> 3).
    img is an RGBA PIL Image.
    """
    try:
        w, h = img.size
    except Exception:
        return False
    # sanitize area to odd integer >= 1
    try:
        area = int(alpha_area)
    except Exception:
        area = 3
    if area < 1:
        area = 1
    if area % 2 == 0:
        area -= 1
        if area < 1:
            area = 1
    r = area // 2
    # ensure neighbourhood is in bounds
    if x < r or x > (w - 1 - r) or y < r or y > (h - 1 - r):
        return False
    pixels = img.load()
    for yy in range(y - r, y + r + 1):
        for xx in range(x - r, x + r + 1):
            rgba = pixels[xx, yy]
            # Some image modes may return 3-tuples (no alpha) after convert('RGBA') should give 4
            a = rgba[3] if len(rgba) > 3 else 255
            if a == 0:
                return False
    return True


def color_dist_sq(c1, c2):
    """Squared Euclidean distance between two RGB tuples."""
    return (int(c1[0]) - int(c2[0])) ** 2 + (int(c1[1]) - int(c2[1])) ** 2 + (int(c1[2]) - int(c2[2])) ** 2


def is_surrounding_uniform(img, x, y, sample_count=20, threshold=10, verbose=False):
    """Return True if `sample_count` surrounding pixels are all within `threshold` colour distance
    of the centre pixel. The function expands a square neighbourhood until it contains at least
    `sample_count` candidates, then samples up to that many pixels (without replacement).
    If `verbose` is True, prints a short summary of the sampled distances for debugging.
    """
    w, h = img.size
    pixels = img.load()
    # centre rgb
    try:
        centre_rgb = pixels[x, y][:3]
    except Exception:
        return False

    # Build candidate neighbours by expanding square radius until we have enough
    neighbours = []
    max_radius = max(w, h)
    r = 1
    while r <= max_radius:
        neighbours = []
        for yy in range(max(0, y - r), min(h, y + r + 1)):
            for xx in range(max(0, x - r), min(w, x + r + 1)):
                if xx == x and yy == y:
                    continue
                neighbours.append((xx, yy))
        if len(neighbours) >= sample_count or (r >= max_radius):
            break
        r += 1

    if not neighbours:
        return False

    # sample up to sample_count neighbours
    sample_n = min(sample_count, len(neighbours))
    try:
        sampled = random.sample(neighbours, sample_n)
    except Exception:
        sampled = neighbours[:sample_n]

    # threshold compare (use squared distance for speed)
    thresh_sq = int(threshold) * int(threshold)
    centre_rgb = pixels[x, y][:3]
    dists = []
    for nx, ny in sampled:
        nb_rgb = pixels[nx, ny][:3]
        d = color_dist_sq(centre_rgb, nb_rgb)
        dists.append(d)
        if d > thresh_sq:
            if verbose:
                # show small debug snippet: centre rgb, sample count, first failing distance
                print(f"uniform-check @({x},{y}): centre={centre_rgb} sampled={len(sampled)} max_dist={max(dists)} thresh={threshold}")
            return False
    if verbose:
        print(f"uniform-check @({x},{y}): centre={centre_rgb} sampled={len(sampled)} max_dist={max(dists) if dists else 0} thresh={threshold}")
    return True


def choose_points_for_image(img_path, points=10, max_attempts=20000, sample_area=20, color_threshold=10, verbose=False, alpha_area=3):
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

    # Precompute possible candidate coordinates (centers where alpha-area fits)
    # Determine radius from alpha_area (ensure odd side-length handled)
    try:
        aa = int(alpha_area)
    except Exception:
        aa = 3
    if aa < 1:
        aa = 1
    if aa % 2 == 0:
        aa -= 1
        if aa < 1:
            aa = 1
    rad = aa // 2
    candidates = [(x, y) for x in range(rad, w - rad) for y in range(rad, h - rad)]
    if not candidates:
        raise RuntimeError(f"No candidates in image {img_path}")

    # Randomly sample without replacement if there are enough candidates
    # but we still check alpha; continue until points found or attempts exhausted.
    basename = os.path.basename(img_path)
    while len(chosen) < points and attempts < max_attempts:
        attempts += 1
        x, y = random.choice(candidates)
        if (x, y) in tried:
            continue
        tried.add((x, y))
        if not has_full_alpha(rgba, x, y, alpha_area=alpha_area):
            # point fails alpha check
            if verbose:
                print(f"{basename}: SKIP alpha fail at ({x},{y})")
            continue
        # Reject if surrounding sampled pixels are all the same (within threshold)
        try:
            if verbose:
                print(f"{basename}: CHECK uniform at ({x},{y}) area={sample_area} thr={color_threshold}")
            if is_surrounding_uniform(rgba, x, y, sample_count=sample_area, threshold=color_threshold, verbose=verbose):
                # skip this point (surrounding area is uniform)
                if verbose:
                    print(f"{basename}: SKIP uniform area at ({x},{y}) area={sample_area} thr={color_threshold}")
                continue
        except Exception as e:
            # On any error in the uniformity check, fall back to accepting the point
            if verbose:
                print(f"{basename}: uniform-check EXC at ({x},{y}): {e}")
        chosen.append([int(x), int(y)])
        if verbose:
            print(f"{basename}: ACCEPT ({x},{y}) attempts={attempts} chosen={len(chosen)}")
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
    p.add_argument('--area', type=int, default=20, help='Number of surrounding pixels to sample for uniformity check (default 20)')
    p.add_argument('--threshold', type=int, default=10, help='Color distance threshold for uniformity (default 10)')
    p.add_argument('--alpha-area', type=int, default=3, help='Side-length in pixels of alpha-check area (default 3 => 3x3)')
    p.add_argument('--verbose', action='store_true', help='Enable verbose logging of selection decisions')
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
            pts = choose_points_for_image(
                path,
                points=args.points,
                max_attempts=args.max_attempts,
                sample_area=args.area,
                color_threshold=args.threshold,
                verbose=args.verbose,
                alpha_area=args.alpha_area,
            )
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
