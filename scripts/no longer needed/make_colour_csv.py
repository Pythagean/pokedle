import os
import sys
import json
import csv
import argparse
import numpy as np
from collections import Counter
from PIL import Image

def main():
    # Color name mapping
    color_dict = {
        'red':    ['#ff0000', '#e32636', '#c41e3a', '#b22222', '#cd3939', '#ff524a'],
        'blue':   ['#0000ff', '#1e90ff', '#4682b4', '#4169e1', '#8bc5cd'],
        'yellow': ['#ffff00', '#ffd700', '#fff700', '#F7E853', '#F5C021', '#FBF4A7', '#d5b44a', '#cdb400'],
        'green':  ['#008000', '#228b22', '#00ff00', '#32cd32', '#358B8A', '#71e0bc'],
        'black':  ['#000000'],
        'brown':  ['#a52a2a', '#8b4513', '#deb887', '#A6845A', '#855B40'],
        'purple': ['#800080', '#8a2be2', '#6a0dad', '#B46FBA'],
        'grey':   ['#808080', '#a9a9a9', '#d3d3d3'],
        'white':  ['#ffffff', '#f8f8ff', '#f5f5f5', '#EAE8F7'],
        'orange': ['#ffa500', '#ff8c00', '#ffb347', '#F99744', '#882A0C', '#cd5241', '#f9b11e'],
        'pink':   ['#ffc0cb', '#ff69b4', '#ffb6c1', '#F7876F'],
    }
    import webcolors
    def hex_to_rgb_tuple(hex):
        return webcolors.hex_to_rgb(hex)
    def closest_color_name(rgb):
        min_dist = float('inf')
        best_name = None
        for name, hexes in color_dict.items():
            for hex in hexes:
                c = hex_to_rgb_tuple(hex)
                dist = np.linalg.norm(np.array(rgb) - np.array(c))
                if dist < min_dist:
                    min_dist = dist
                    best_name = name
        return best_name
    parser = argparse.ArgumentParser(description="Generate pokemon_colours.csv from original images and pokemon_data.json.")
    parser.add_argument('--images_dir', type=str, required=True, help='Directory containing input images (PNG)')
    parser.add_argument('--pokemon_json', type=str, required=True, help='Path to pokemon_data.json')
    parser.add_argument('--output', type=str, default='pokemon_colours.csv', help='Output CSV file path')
    parser.add_argument('--threshold', type=float, default=20.0, help='Color similarity threshold (Euclidean distance in RGB)')
    parser.add_argument('--debug', action='store_true', help='Include percentages and hex codes in CSV output')
    args = parser.parse_args()

    # Load id->name mapping from JSON
    with open(args.pokemon_json, encoding='utf-8') as f:
        pokemon_data = json.load(f)
    id_to_name = {str(p['id']): p['name'] for p in pokemon_data}

    files = [f for f in os.listdir(args.images_dir) if f.lower().endswith('.png') and 'front' in f.lower()]
    results = []

    def rgb_distance(c1, c2):
        return np.linalg.norm(np.array(c1) - np.array(c2))

    for fname in files:
        # Extract id from filename (remove -front.png)
        poke_id = fname.replace('-front.png', '')
        poke_name = id_to_name.get(poke_id, '')
        path = os.path.join(args.images_dir, fname)
        with Image.open(path) as img:
            img = img.convert('RGBA')
            arr = np.array(img)
            # Only count non-transparent pixels
            mask = (arr[..., 3] > 0)
            pixels = arr[..., :3][mask].reshape(-1, 3)
            total_pixels = len(pixels)
            # Count RGB colors
            rgb_tuples = [tuple(rgb) for rgb in pixels]
            counter = Counter(rgb_tuples)
            # Merge similar colors
            merged = []  # list of [ [sum_r, sum_g, sum_b], total_count ]
            for rgb, count in counter.items():
                rgb = tuple(int(x) for x in rgb)
                count = int(count)
                found = False
                for entry in merged:
                    avg_rgb, total = entry[0], entry[1]
                    dist = rgb_distance(rgb, tuple(int(round(x/total)) for x in avg_rgb))
                    if dist < args.threshold:
                        # Merge
                        entry[0][0] = int(entry[0][0]) + rgb[0] * count
                        entry[0][1] = int(entry[0][1]) + rgb[1] * count
                        entry[0][2] = int(entry[0][2]) + rgb[2] * count
                        entry[1] = int(entry[1]) + count
                        found = True
                        break
                if not found:
                    merged.append([[rgb[0]*count, rgb[1]*count, rgb[2]*count], count])
            # Compute average RGB and sort by count
            merged_colors = []
            for avg_rgb, total in merged:
                avg = tuple(int(round(x/total)) for x in avg_rgb)
                merged_colors.append( (avg, total) )
            merged_colors.sort(key=lambda x: -x[1])
            top_colors = merged_colors[:10]
        color_names = []
        color_pcts = []
        color_hexes = []
        seen_names = set()
        color_count = 0
        filtered_colors = []
        for rgb, count in top_colors:
            name = closest_color_name(rgb)
            pct = int(round((count / total_pixels * 100))) if total_pixels > 0 else 0
            hexval = "#%02x%02x%02x" % rgb
            if pct > 10 and name not in seen_names:
                filtered_colors.append((name, pct, hexval))
                seen_names.add(name)

        # Now apply black rule
        final_colors = []
        if filtered_colors:
            # Always allow first color (even if black)
            final_colors.append(filtered_colors[0])
            first_name, first_pct, _ = filtered_colors[0]
            # Track if black is already included
            black_included = (first_name == 'black')
            # For the rest, only allow black if within 5 percent of first, and only as second color
            for name, pct, hexval in filtered_colors[1:]:
                if len(final_colors) == 1:
                    # Second color slot
                    if name == 'black':
                        if not black_included and abs(pct - first_pct) <= 3:
                            final_colors.append((name, pct, hexval))
                            black_included = True
                    else:
                        final_colors.append((name, pct, hexval))
                elif len(final_colors) == 2:
                    # Third color slot: skip black
                    if name != 'black':
                        final_colors.append((name, pct, hexval))
                if len(final_colors) == 3:
                    break

        # Only keep first and second colors, and exclude black if hex is exactly #000000
        filtered_final = []
        for name, pct, hexval in final_colors:
            if not (name == 'black' and hexval.lower() == '#000000'):
                filtered_final.append((name, pct, hexval))
            if len(filtered_final) == 2:
                break
        while len(filtered_final) < 2:
            filtered_final.append(('', '', ''))
        color_names = [c[0] for c in filtered_final]
        color_pcts = [str(c[1]) if c[1] != '' else '' for c in filtered_final]
        color_hexes = [c[2] for c in filtered_final]
        # Pad with empty strings if fewer than 2 colors
        while len(color_names) < 2:
            color_names.append('')
        while len(color_pcts) < 2:
            color_pcts.append('')
        while len(color_hexes) < 2:
            color_hexes.append('')
        row = [poke_id, poke_name] + color_names + color_pcts + color_hexes
        results.append(row)

    # Sort numerically by id
    def numeric_key(row):
        try:
            return int(row[0])
        except Exception:
            return row[0]
    results_sorted = sorted(results, key=numeric_key)

    # Write CSV
    with open(args.output, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        if args.debug:
            header = ['id', 'name', 'color1', 'color2', 'color1_pct', 'color2_pct', 'color1_hex', 'color2_hex']
            writer.writerow(header)
            for row in results_sorted:
                writer.writerow(row[:2+2+2+2])  # id, name, 2 colors, 2 pcts, 2 hexes
        else:
            header = ['id', 'name', 'color1', 'color2']
            writer.writerow(header)
            for row in results_sorted:
                writer.writerow(row[:4])
    print(f'Wrote CSV: {args.output}')

if __name__ == '__main__':
    main()
