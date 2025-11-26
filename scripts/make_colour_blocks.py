import webcolors
import csv
# --- Main processing ---
def closest_colour(requested_colour):
    min_colours = {}
    # Use webcolors.CSS3 for name-to-hex mapping (most compatible)
    # Custom color dictionary as per user request
    color_dict = {
        'red':    ['#ff0000', '#e32636', '#c41e3a', '#b22222'],
        'blue':   ['#0000ff', '#1e90ff', '#4682b4', '#4169e1'],
        'yellow': ['#ffff00', '#ffd700', '#fff700', '#F7E853', '#F5C021', '#FBF4A7'],
        'green':  ['#008000', '#228b22', '#00ff00', '#32cd32', '#358B8A'],
        'black':  ['#000000', '#222222'],
        'brown':  ['#a52a2a', '#8b4513', '#deb887', '#A6845A', '#855B40'],
        'purple': ['#800080', '#8a2be2', '#6a0dad', '#B46FBA'],
        'grey':   ['#808080', '#a9a9a9', '#d3d3d3'],
        'white':  ['#ffffff', '#f8f8ff', '#f5f5f5', '#EAE8F7'],
        'orange': ['#ffa500', '#ff8c00', '#ffb347', '#F99744', '#882A0C'],
        'pink':   ['#ffc0cb', '#ff69b4', '#ffb6c1', '#F7876F'],
    }
    for name, hex_list in color_dict.items():
        for hex in hex_list:
            r_c, g_c, b_c = webcolors.hex_to_rgb(hex)
            rd = (r_c - requested_colour[0]) ** 2
            gd = (g_c - requested_colour[1]) ** 2
            bd = (b_c - requested_colour[2]) ** 2
            min_colours[(rd + gd + bd)] = name
    return min_colours[min(min_colours.keys())]

def rgb_to_name(rgb):
    try:
        return webcolors.rgb_to_name(rgb, spec='css3')
    except ValueError:
        return closest_colour(rgb)
import os
import sys
import argparse
from collections import Counter
from PIL import Image
import numpy as np
from skimage.color import rgb2lab
from sklearn.cluster import KMeans

# --- Argument parsing ---
def parse_args():
    parser = argparse.ArgumentParser(description="Extract most common colors from images in a directory and create color block images.")
    parser.add_argument('src_dir', type=str, help='Directory containing input images (PNG)')
    parser.add_argument('--input-json', type=str, default=None, help='Path to pokemon_data.json (overrides default)')
    parser.add_argument('--verbose', action='store_true', help='Print verbose output')
    parser.add_argument('--partial', action='store_true', help='Only process 10 files')
    parser.add_argument('--sprites', action='store_true', help='Only process sprite files with "-front" in the filename')
    parser.add_argument('--num-colors', type=int, default=10, help='Number of colors to extract via KMeans (default: 10)')
    parser.add_argument('--num-blocks', type=int, default=None, help='Number of color blocks to produce in the output image (defaults to --num-colors)')
    parser.add_argument('--threshold', type=float, default=3.0, help='Lab distance threshold for considering colors similar (default: 3.0)')
    parser.add_argument('--jpg', action='store_true', help='Save color block images as JPEG instead of PNG')
    return parser.parse_args()

# --- Main processing ---
def is_similar(c1, c2, threshold=6):
    return all(abs(a - b) <= threshold for a, b in zip(c1, c2))

def rgb_to_lab(rgb):
    # rgb: tuple of ints 0-255
    arr = np.array([[rgb]], dtype=np.uint8) / 255.0
    lab = rgb2lab(arr)[0][0]
    return lab

def lab_distance(lab1, lab2):
    return np.linalg.norm(lab1 - lab2)

def get_most_common_colors(image_path, num_colors=10):
    with Image.open(image_path) as img:
        img = img.convert('RGBA')
        # Resize to speed up color counting
        small = img.resize((256, 256), Image.LANCZOS)
        # If verbose/debug mode is enabled, save the resized image to the debug dir
        try:
            if globals().get('VERBOSE', False):
                debug_dir = globals().get('DEBUG_RESIZED_DIR')
                if debug_dir:
                    small_rgb = small.convert('RGB')
                    base = os.path.basename(image_path)
                    name = os.path.splitext(base)[0] + '_resized.png'
                    small_rgb.save(os.path.join(debug_dir, name))
        except Exception as e:
            if globals().get('VERBOSE', False):
                print(f"Warning saving resized image for {image_path}: {e}", file=sys.stderr)
        arr = np.array(small)
        # Exclude fully transparent and near-black pixels
        mask = (arr[..., 3] > 0) & (arr[..., :3].sum(axis=-1) > 30)
        pixels = arr[..., :3][mask].reshape(-1, 3)
        if len(pixels) == 0:
            return [((255,255,255), 0)] * num_colors
        # KMeans clustering
        kmeans = KMeans(n_clusters=num_colors, n_init=5, random_state=42)
        labels = kmeans.fit_predict(pixels)
        centers = kmeans.cluster_centers_.astype(int)
        # Count pixels per cluster
        counts = np.bincount(labels, minlength=num_colors)
        # Sort by count descending
        order = np.argsort(-counts)
        result = [ (tuple(centers[i]), int(counts[i])) for i in order ]
        return result


def merge_similar_clusters(colors, threshold=3.0):
    """Merge clusters whose Lab distance is below `threshold`.
    colors: list of (rgb_tuple, count) ordered by frequency.
    Returns a new list of (rgb_tuple, count) ordered by frequency.
    """
    merged = []  # each item: {'rgb': (r,g,b), 'count': n, 'lab': lab}
    for rgb, count in colors:
        try:
            rgb_int = tuple(int(c) for c in rgb)
        except Exception:
            # fallback if rgb is already ints
            rgb_int = tuple(rgb)
        lab = rgb_to_lab(rgb_int)
        placed = False
        for m in merged:
            d = lab_distance(lab, m['lab'])
            if d < threshold:
                # merge into this cluster (weighted average)
                total = m['count'] + count
                m['rgb'] = tuple(int((m['rgb'][i] * m['count'] + rgb_int[i] * count) / total) for i in range(3))
                m['count'] = total
                m['lab'] = rgb_to_lab(m['rgb'])
                placed = True
                break
        if not placed:
            merged.append({'rgb': rgb_int, 'count': count, 'lab': lab})
    # Convert back to list of tuples and sort by count desc
    merged_list = [ (m['rgb'], m['count']) for m in merged ]
    merged_list.sort(key=lambda x: -x[1])
    return merged_list


def reduce_clusters_to_n(colors, n):
    """Agglomeratively merge the closest pair of clusters until `n` clusters remain.
    colors: list of (rgb_tuple, count) ordered by frequency
    Returns list of (rgb_tuple, count) ordered by frequency.
    """
    if n is None or n <= 0:
        return colors
    if len(colors) <= n:
        return colors
    # build mutable items with Lab precomputed
    items = []
    for rgb, count in colors:
        try:
            rgb_int = tuple(int(c) for c in rgb)
        except Exception:
            rgb_int = tuple(rgb)
        items.append({'rgb': rgb_int, 'count': count, 'lab': rgb_to_lab(rgb_int)})

    # Agglomerative merge: repeatedly merge the closest pair
    while len(items) > n:
        min_d = None
        pair = (0, 1)
        L = len(items)
        for i in range(L):
            for j in range(i + 1, L):
                d = lab_distance(items[i]['lab'], items[j]['lab'])
                if min_d is None or d < min_d:
                    min_d = d
                    pair = (i, j)
        i, j = pair
        a = items[i]
        b = items[j]
        total = a['count'] + b['count']
        new_rgb = tuple(int((a['rgb'][k] * a['count'] + b['rgb'][k] * b['count']) / total) for k in range(3))
        new_lab = rgb_to_lab(new_rgb)
        new_item = {'rgb': new_rgb, 'count': total, 'lab': new_lab}
        # remove higher index first
        for idx in sorted((i, j), reverse=True):
            items.pop(idx)
        items.append(new_item)

    items.sort(key=lambda x: -x['count'])
    return [(it['rgb'], it['count']) for it in items]

def is_similar(c1, c2, threshold=6):
    # Compare in Lab color space
    lab1 = rgb_to_lab(c1)
    lab2 = rgb_to_lab(c2)
    dist = lab_distance(lab1, lab2)
    result = dist < threshold
    # When verbose, print diagnostic info about the comparison
    try:
        # Avoid referencing args here; caller should pass verbose flag if needed
        if globals().get('VERBOSE', False):
            print(f"is_similar: {c1} vs {c2} -> lab_dist={dist:.3f} threshold={threshold} => {result}")
    except Exception:
        pass
    return result

def create_color_blocks(colors, out_path):
    total_pixels = sum(count for color, count in colors)
    img_height = 500
    img_width = 1000  # total width of the output image
    # Calculate block widths proportional to color frequency.
    # To avoid the last-block remainder looking disproportionately large due
    # to integer truncation, compute float widths then distribute the
    # leftover pixels according to the largest fractional remainders.
    block_widths = []
    if total_pixels <= 0:
        # fallback: equal widths
        n = len(colors)
        base = img_width // n if n > 0 else img_width
        block_widths = [base] * n
        # adjust last to fill exactly
        if block_widths:
            block_widths[-1] = img_width - sum(block_widths[:-1])
    else:
        float_widths = [ (count / total_pixels) * img_width for color, count in colors ]
        floors = [ int(w) for w in float_widths ]
        frac = [ w - f for w, f in zip(float_widths, floors) ]
        remaining = img_width - sum(floors)
        # Ensure every block is at least 1 pixel: if any floor is 0, give it 1 and reduce remaining
        for i in range(len(floors)):
            if floors[i] < 1:
                floors[i] = 1
        remaining = img_width - sum(floors)
        # Distribute remaining pixels to blocks with largest fractional parts
        if remaining > 0:
            # get indices sorted by fractional part descending
            indices = sorted(range(len(frac)), key=lambda i: frac[i], reverse=True)
            for i in range(remaining):
                floors[indices[i % len(indices)]] += 1
        block_widths = floors
    img = Image.new('RGB', (img_width, img_height), (255, 255, 255))
    x_start = 0
    for (color, count), width in zip(colors, block_widths):
        for x in range(x_start, x_start + width):
            for y in range(img_height):
                img.putpixel((x, y), color)
        x_start += width
    img.save(out_path)


def main():
    args = parse_args()
    # Expose verbose to other helper functions for diagnostic printing
    global VERBOSE
    VERBOSE = bool(args.verbose)
    # If num_blocks not provided, default to num_colors
    if args.num_blocks is None:
        args.num_blocks = args.num_colors

    # When verbose, print the configured numbers the user requested
    if VERBOSE:
        try:
            print(f"Verbose mode: extracting {args.num_colors} colors per image; producing {args.num_blocks} blocks")
        except Exception:
            print("Verbose mode: extracting <num_colors> colors per image; producing <num_blocks> blocks")
    src_dir = os.path.abspath(args.src_dir)
    if not os.path.isdir(src_dir):
        print(f"Source directory does not exist: {src_dir}", file=sys.stderr)
        sys.exit(1)
    # Output dir: sibling to src_dir, with _colours suffix
    parent_dir = os.path.dirname(src_dir)
    src_base = os.path.basename(src_dir.rstrip(os.sep))
    out_dir = os.path.join(parent_dir, src_base + '_colours')
    os.makedirs(out_dir, exist_ok=True)
    # If verbose mode, create a debug directory for resized images
    if VERBOSE:
        global DEBUG_RESIZED_DIR
        DEBUG_RESIZED_DIR = os.path.join(out_dir, 'resized_debug')
        os.makedirs(DEBUG_RESIZED_DIR, exist_ok=True)
    # Choose which files to process
    if args.sprites:
        files = [f for f in os.listdir(src_dir) if f.lower().endswith('.png') and '-front' in f.lower()]
    else:
        files = [f for f in os.listdir(src_dir) if f.lower().endswith('.png')]
    if args.partial:
        files = files[:10]
    if args.verbose:
        if args.sprites:
            print(f"Selected sprite files only (-front). {len(files)} file(s) will be processed.")
        else:
            print(f"Selected all PNG files. {len(files)} file(s) will be processed.")

    import json
    # Load id->name mapping from JSON
    # Allow passing a custom JSON path via --input-json; otherwise use the repo default
    if args.input_json:
        data_json_path = os.path.abspath(args.input_json)
    else:
        data_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/pokemon_data.json'))
    with open(data_json_path, encoding='utf-8') as f:
        pokemon_data = json.load(f)
    id_to_name = {str(p['id']): p['name'] for p in pokemon_data}

    results = []

    for idx, fname in enumerate(files):
        in_path = os.path.join(src_dir, fname)
        # Remove '-front' from filename if present
        out_fname = fname.replace('-front', '')
        out_path = os.path.join(out_dir, out_fname)
        # If requested, change output extension to .jpg
        if args.jpg:
            out_path = os.path.splitext(out_path)[0] + '.jpg'
        if args.verbose:
            print(f"[{idx+1}/{len(files)}] Processing {fname} -> {out_fname} ...")
        try:
            colors = get_most_common_colors(in_path, args.num_colors)
            # Optionally merge visually-similar clusters before drawing blocks
            merged_colors = merge_similar_clusters(colors, threshold=args.threshold)
            # Reduce to requested number of blocks if necessary
            reduced_colors = reduce_clusters_to_n(merged_colors, args.num_blocks)
            if args.verbose:
                print("    After merging/reducing clusters:")
                for i, (c, cnt) in enumerate(reduced_colors, start=1):
                    try:
                        rgb = tuple(int(v) for v in c)
                    except Exception:
                        rgb = c
                    print(f"      {i}: {rgb} - {cnt} px")
            create_color_blocks(reduced_colors, out_path)
            # Only consider top 5 colors (after merging/reducing), and select up to 3 visually distinct names with special rules
            top_colors = reduced_colors[:5]
            csv_colors = []  # (rgb, name) for csv
            csv_names = []   # just names for csv
            seen = set()
            for idx, (color, count) in enumerate(top_colors):
                name = rgb_to_name(color)
                # Check for visual similarity to already chosen CSV colors (stricter threshold)
                is_similar_to_csv = False
                for prev_rgb, prev_name in csv_colors:
                    if is_similar(color, prev_rgb, threshold=args.threshold):
                        is_similar_to_csv = True
                        break
                if is_similar_to_csv:
                    continue
                # Always take the most common color
                if idx == 0:
                    csv_colors.append((color, name))
                    csv_names.append(name)
                    seen.add(name)
                # Only take black if in first 2
                elif name == 'black':
                    if idx < 2 and name not in seen:
                        csv_colors.append((color, name))
                        csv_names.append(name)
                        seen.add(name)
                # Only take grey if first
                elif name == 'grey':
                    if idx == 0 and name not in seen:
                        csv_colors.append((color, name))
                        csv_names.append(name)
                        seen.add(name)
                # Otherwise, take if not seen and not black/grey
                elif name not in seen and name not in ('black', 'grey'):
                    csv_colors.append((color, name))
                    csv_names.append(name)
                    seen.add(name)
                if len(csv_names) == 3:
                    break
            # Remove '-front.png' from filename for CSV
            csv_id = fname.replace('-front.png', '')
            poke_name = id_to_name.get(csv_id, '')
            row = [csv_id, poke_name] + csv_names
            results.append(row)
            if args.verbose:
                total_pixels = sum(count for color, count in colors)
                # Print full cluster list (all requested colors) for verbose mode
                print("    All clusters (ordered by frequency):")
                for i, (color, count) in enumerate(colors, start=1):
                    # convert numpy ints to plain ints for nicer display
                    try:
                        rgb = tuple(int(c) for c in color)
                    except Exception:
                        rgb = color
                    percent = (count / total_pixels * 100) if total_pixels > 0 else 0
                    print(f"      {i}: {rgb} - {percent:.1f}% - {rgb_to_name(rgb)}")
                # Also print the top-5 summary for quick glance
                print("    Top 5 (summary):")
                for i, (color, count) in enumerate(top_colors, start=1):
                    try:
                        rgb = tuple(int(c) for c in color)
                    except Exception:
                        rgb = color
                    percent = (count / total_pixels * 100) if total_pixels > 0 else 0
                    print(f"      {i}: {rgb} - {percent:.1f}% - {rgb_to_name(rgb)}")
                print(f"    Saved to {out_path}")
        except Exception as e:
            print(f"Error processing {fname}: {e}", file=sys.stderr)

    # Sort results numerically by filename (first column)
    def numeric_key(row):
        try:
            return int(row[0])
        except Exception:
            return row[0]
    results_sorted = sorted(results, key=numeric_key)

    # Write CSV
    csv_path = os.path.join(out_dir, 'pokemon_colours.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        header = ['id', 'name', 'color1', 'color2', 'color3']
        writer.writerow(header)
        for row in results_sorted:
            # Pad with empty strings if fewer than 3 colors
            while len(row) < 5:
                row.append('')
            writer.writerow(row)
    print(f'Wrote CSV: {csv_path}')

if __name__ == '__main__':
    main()
