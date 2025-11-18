# Renamed script: cull_cards.py
import os
import shutil
import argparse
from PIL import Image


parser = argparse.ArgumentParser(description='Cull card images in a directory by width or brightness.')
parser.add_argument('--directory', type=str, required=True, help='Directory containing images')
parser.add_argument('--width', type=int, default=None, help='Minimum width (inclusive) to keep (optional)')
parser.add_argument('--white-threshold', type=int, default=None, help='Cull images with >40%% pixels above this brightness (0-255, optional)')
parser.add_argument('--check', action='store_true', help="Don't delete, just show what would be deleted (optional)")
parser.add_argument('--full', type=int, default=None, help='Cull images with more than this many unique colors in the bottom half (optional)')
args = parser.parse_args()

dir_path = args.directory
min_width = args.width

deleted = 0
# Prepare cull directory
cull_dir = os.path.join(os.path.dirname(os.path.abspath(dir_path)), 'cards_to_cull')
if not args.check:
    os.makedirs(cull_dir, exist_ok=True)

for fname in os.listdir(dir_path):
    fpath = os.path.join(dir_path, fname)
    if not os.path.isfile(fpath):
        continue
    try:
        with Image.open(fpath) as img:
            width, _ = img.size
            # Cull by width
            if args.width is not None and width < args.width:
                if args.check:
                    print(f'Would move {fname} (width {width})')
                else:
                    shutil.move(fpath, os.path.join(cull_dir, fname))
                    print(f'Moved {fname} (width {width})')
                deleted += 1
                continue
            # Cull by white threshold (top half)
            arr = None
            if args.white_threshold is not None or args.full is not None:
                try:
                    import numpy as np
                    arr = np.asarray(img.convert('RGB'))
                except ImportError:
                    print('numpy is required for --white-threshold and --full functionality. Please install numpy.')
                    break
            if args.white_threshold is not None:
                # Only use the top half of the image
                h = arr.shape[0]
                arr_top = arr[:h//2, :, :]
                mask = (arr_top > args.white_threshold).all(axis=2)
                white_pct = mask.sum() / mask.size
                if white_pct > 0.4:
                    if args.check:
                        print(f'Would move {fname} (top half: {white_pct*100:.1f}% pixels > {args.white_threshold})')
                    else:
                        shutil.move(fpath, os.path.join(cull_dir, fname))
                        print(f'Moved {fname} (top half: {white_pct*100:.1f}% pixels > {args.white_threshold})')
                    deleted += 1
                    continue
            # Cull by number of unique colors in bottom half
            if args.full is not None:
                h = arr.shape[0]
                arr_bottom = arr[h//2:, :, :]
                # Reshape to (N, 3) and count unique rows
                flat = arr_bottom.reshape(-1, 3)
                n_colors = len(np.unique(flat, axis=0))
                if n_colors > args.full:
                    if args.check:
                        print(f'Would move {fname} (bottom half: {n_colors} unique colors > {args.full})')
                    else:
                        shutil.move(fpath, os.path.join(cull_dir, fname))
                        print(f'Moved {fname} (bottom half: {n_colors} unique colors > {args.full})')
                    deleted += 1
                    continue
    except Exception as e:
        print(f'Could not process {fname}: {e}')
if args.width is not None or args.white_threshold is not None:
    if args.check:
        print(f'Check mode: {deleted} images would be moved to {cull_dir}.')
    else:
        print(f'Done. Moved {deleted} images to {cull_dir}.')
else:
    print('No --width or --white-threshold specified, nothing to cull.')
