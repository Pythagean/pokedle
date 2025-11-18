import os
import sys
import argparse
from PIL import Image, ImageOps, ImageDraw
import numpy as np
import hashlib


def crop_to_silhouette(img, margin=5):
    # img is RGBA
    arr = np.array(img)
    # Find all non-transparent pixels (alpha > 0)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0 or len(ys) == 0:
        # No silhouette, return original
        return img
    min_x, max_x = xs.min(), xs.max()
    min_y, max_y = ys.min(), ys.max()
    # Add margin, but keep within bounds
    min_x = max(min_x - margin, 0)
    max_x = min(max_x + margin, arr.shape[1] - 1)
    min_y = max(min_y - margin, 0)
    max_y = min(max_y + margin, arr.shape[0] - 1)
    cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    return cropped


def make_silhouette(input_path, output_path, verbose=False, alpha_threshold=0, debug_dots=False):
    try:
        img = Image.open(input_path).convert('RGBA')
        datas = img.getdata()
        newData = []
        for item in datas:
            # item = (R, G, B, A)
            if item[3] == 0:
                # Transparent pixel, keep transparent
                newData.append((0, 0, 0, 0))
            else:
                # Preserve anti-aliased edge: keep original alpha
                newData.append((0, 0, 0, item[3]))
        silhouette = Image.new('RGBA', img.size)
        silhouette.putdata(newData)

        # Compute bounding box (before cropping) and per-edge focal points
        arr_full = np.array(silhouette)
        alpha = arr_full[:, :, 3]
        ys, xs = np.where(alpha > 0)
        h_full = arr_full.shape[0]
        w_full = arr_full.shape[1]
        if len(xs) == 0 or len(ys) == 0:
            min_x = min_y = 0
            max_x = w_full - 1
            max_y = h_full - 1
            # default edge points
            top_pt = {'x': 0.5, 'y': 0.0}
            bottom_pt = {'x': 0.5, 'y': 1.0}
            left_pt = {'x': 0.0, 'y': 0.5}
            right_pt = {'x': 1.0, 'y': 0.5}
        else:
            min_x, max_x = int(xs.min()), int(xs.max())
            min_y, max_y = int(ys.min()), int(ys.max())

            # For each edge, find a representative point near the extreme non-transparent pixels.
            # Use a small band (pad) from the extreme and compute the median coordinate to avoid outliers.
            pad_y = max(1, int(max(1, round(0.02 * h_full))))
            pad_x = max(1, int(max(1, round(0.02 * w_full))))

            # top: pixels with y <= min_y + pad_y
            mask_top = ys <= (min_y + pad_y)
            top_xs = xs[mask_top]
            if len(top_xs) == 0:
                top_x = (min_x + max_x) // 2
            else:
                top_x = int(np.median(top_xs))
            top_pt = {'x': top_x / float(w_full), 'y': min_y / float(h_full)}

            # bottom: pixels with y >= max_y - pad_y
            mask_bottom = ys >= (max_y - pad_y)
            bottom_xs = xs[mask_bottom]
            if len(bottom_xs) == 0:
                bottom_x = (min_x + max_x) // 2
            else:
                bottom_x = int(np.median(bottom_xs))
            bottom_pt = {'x': bottom_x / float(w_full), 'y': max_y / float(h_full)}

            # left: pixels with x <= min_x + pad_x
            mask_left = xs <= (min_x + pad_x)
            left_ys = ys[mask_left]
            if len(left_ys) == 0:
                left_y = (min_y + max_y) // 2
            else:
                left_y = int(np.median(left_ys))
            left_pt = {'x': min_x / float(w_full), 'y': left_y / float(h_full)}

            # right: pixels with x >= max_x - pad_x
            mask_right = xs >= (max_x - pad_x)
            right_ys = ys[mask_right]
            if len(right_ys) == 0:
                right_y = (min_y + max_y) // 2
            else:
                right_y = int(np.median(right_ys))
            right_pt = {'x': max_x / float(w_full), 'y': right_y / float(h_full)}

        # compute edge pixels: silhouette pixel with any 4-neighbour transparent
        # create boolean alpha mask (use a configurable threshold so semi-transparent
        # pixels can be treated as opaque if desired)
        alpha_bool = alpha > alpha_threshold
        # pad to avoid boundary checks
        pad = np.pad(alpha_bool, ((1,1),(1,1)), mode='constant', constant_values=False)
        # neighbors
        up = pad[:-2,1:-1]
        down = pad[2:,1:-1]
        left = pad[1:-1,:-2]
        right = pad[1:-1,2:]
        # an edge pixel is True where alpha_bool is True and any neighbor is False
        edge_mask = alpha_bool & (~(up & down & left & right))
        ys_e, xs_e = np.where(edge_mask)
        edge_points = []
        if len(xs_e) > 0:
            # sample up to 10 points deterministically per filename using a hash seed
            seed_str = os.path.splitext(os.path.basename(input_path))[0]
            seed_hash = int(hashlib.sha256(seed_str.encode('utf-8')).hexdigest()[:16], 16)
            rng = np.random.default_rng(seed_hash)
            idxs = rng.choice(len(xs_e), size=min(10, len(xs_e)), replace=False)
            for i in idxs:
                x = float(xs_e[i]) / float(w_full)
                y = float(ys_e[i]) / float(h_full)
                edge_points.append({'x': round(x, 4), 'y': round(y, 4)})
        else:
            # fallback: pick bbox center
            edge_points.append({'x': round((min_x+max_x)/2.0/float(w_full),4), 'y': round((min_y+max_y)/2.0/float(h_full),4)})

        # Crop silhouette to 5px margin and save. Compute crop offsets so we can
        # map normalized coordinates back into the cropped image for debug drawing.
        margin = 5
        crop_left = max(min_x - margin, 0)
        crop_top = max(min_y - margin, 0)
        crop_right = min(max_x + margin, arr_full.shape[1] - 1)
        crop_bottom = min(max_y + margin, arr_full.shape[0] - 1)
        silhouette_cropped = silhouette.crop((crop_left, crop_top, crop_right + 1, crop_bottom + 1))

        # Optionally draw debug dots on the cropped silhouette image
        if debug_dots:
            try:
                draw = ImageDraw.Draw(silhouette_cropped)
                r = max(2, int(round(min(silhouette_cropped.size) * 0.01)))
                # per-edge medians: top (magenta), right (orange), bottom (lime), left (cyan)
                colors = {
                    'edge_top': '#ff00ff',
                    'edge_right': '#ff9800',
                    'edge_bottom': '#00ff66',
                    'edge_left': '#00ffff'
                }
                med_keys = [('edge_top', top_pt), ('edge_right', right_pt), ('edge_bottom', bottom_pt), ('edge_left', left_pt)]
                for name, pt in med_keys:
                    if pt and isinstance(pt, dict) and 'x' in pt and 'y' in pt:
                        px = int(round(pt['x'] * float(w_full))) - crop_left
                        py = int(round(pt['y'] * float(h_full))) - crop_top
                        draw.ellipse((px - r, py - r, px + r, py + r), fill=colors.get(name, '#fff'))

                # draw sampled edge points (purple)
                for p in edge_points:
                    px = int(round(p['x'] * float(w_full))) - crop_left
                    py = int(round(p['y'] * float(h_full))) - crop_top
                    draw.ellipse((px - max(1, r//2), py - max(1, r//2), px + max(1, r//2), py + max(1, r//2)), fill='#800080')
            except Exception:
                # don't fail the pipeline if drawing debug dots errors
                pass

        silhouette_cropped.save(output_path)
        if verbose:
            print(f"Saved silhouette: {output_path}")

        # Return bounding-box and edge points for metadata writing
        return {
            'min_x': int(min_x), 'min_y': int(min_y),
            'max_x': int(max_x), 'max_y': int(max_y),
            'width': int(w_full), 'height': int(h_full),
            'edge_top': top_pt, 'edge_bottom': bottom_pt, 'edge_left': left_pt, 'edge_right': right_pt,
            'edge_points': edge_points
        }
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Convert images to silhouettes.")
    parser.add_argument('--verbose', action='store_true', help='Print progress messages')
    parser.add_argument('--partial', action='store_true', help='Only process 10 images')
    parser.add_argument('--alpha-threshold', type=int, default=0, help='Alpha threshold (0-255) to consider a pixel opaque for edge detection')
    parser.add_argument('--debug-dots', action='store_true', help='Draw debug dots onto the output silhouette images')
    parser.add_argument('--images-dir', help='Path to input images directory (overrides default)')
    parser.add_argument('--output-dir', help='Path to output silhouettes directory (overrides default)')
    parser.add_argument('--meta-out', help='Path to write silhouette_meta.json (overrides default)')
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    default_images_dir = os.path.join(base_dir, 'src', 'data', 'images')
    default_output_dir = os.path.join(base_dir, 'src', 'data', 'silhouettes')
    images_dir = os.path.abspath(args.images_dir) if args.images_dir else default_images_dir
    output_dir = os.path.abspath(args.output_dir) if args.output_dir else default_output_dir
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.isdir(images_dir):
        print(f"Images directory does not exist: {images_dir}")
        sys.exit(1)
    images = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if args.partial:
        images = images[:10]
    if args.verbose:
        print(f"Processing {len(images)} images from {images_dir} to {output_dir}")
    meta = {}
    for img_name in images:
        input_path = os.path.join(images_dir, img_name)
        output_path = os.path.join(output_dir, img_name)
        if args.verbose:
            print(f"Processing {img_name}...")
        bb = make_silhouette(input_path, output_path, verbose=args.verbose, alpha_threshold=args.alpha_threshold, debug_dots=args.debug_dots)
        # store normalized focal info keyed by filename without extension
        name_no_ext = os.path.splitext(img_name)[0]
        if bb:
            w = bb['width']
            h = bb['height']
            min_x = bb['min_x']; max_x = bb['max_x']
            min_y = bb['min_y']; max_y = bb['max_y']
            cx = (min_x + max_x) / 2.0 / w
            cy = (min_y + max_y) / 2.0 / h
            bw = (max_x - min_x + 1) / w
            bh = (max_y - min_y + 1) / h
            # include per-edge medians and sampled edge points when available
            entry = {
                'cx': round(cx, 4), 'cy': round(cy, 4), 'bw': round(bw, 4), 'bh': round(bh, 4)
            }
            # Copy edge metadata when available
            for k in ('edge_top', 'edge_right', 'edge_bottom', 'edge_left'):
                if k in bb and bb[k] is not None:
                    entry[k] = bb[k]
                else:
                    # ensure consistent schema: include key with null when not present
                    entry[k] = None
            # edge_points should always be present as a list (possibly empty)
            if 'edge_points' in bb and bb['edge_points'] is not None:
                entry['edge_points'] = bb['edge_points']
            else:
                entry['edge_points'] = []
            meta[name_no_ext] = entry
        else:
            meta[name_no_ext] = {'cx': 0.5, 'cy': 0.5, 'bw': 1.0, 'bh': 1.0}

    # Write metadata JSON for runtime. Default path is public/data/silhouette_meta.json
    default_meta_out = os.path.join(base_dir, 'public', 'data', 'silhouette_meta.json')
    out_meta_path = os.path.abspath(args.meta_out) if args.meta_out else default_meta_out
    meta_out_dir = os.path.dirname(out_meta_path)
    os.makedirs(meta_out_dir, exist_ok=True)
    try:
        import json
        with open(out_meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2)
        if args.verbose:
            print(f"Wrote silhouette metadata to {out_meta_path}")
    except Exception as e:
        print(f"Failed to write metadata: {e}")

if __name__ == '__main__':
    main()
