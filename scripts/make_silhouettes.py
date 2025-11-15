import os
import sys
import argparse
from PIL import Image, ImageOps
import numpy as np


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


def make_silhouette(input_path, output_path, verbose=False):
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
        # Crop silhouette to 5px margin
        silhouette = crop_to_silhouette(silhouette, margin=5)
        silhouette.save(output_path)
        if verbose:
            print(f"Saved silhouette: {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Convert images to silhouettes.")
    parser.add_argument('--verbose', action='store_true', help='Print progress messages')
    parser.add_argument('--partial', action='store_true', help='Only process 10 images')
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    images_dir = os.path.join(base_dir, 'src', 'data', 'images')
    output_dir = os.path.join(base_dir, 'src', 'data', 'silhouettes')
    os.makedirs(output_dir, exist_ok=True)

    images = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if args.partial:
        images = images[:10]
    if args.verbose:
        print(f"Processing {len(images)} images from {images_dir} to {output_dir}")
    for img_name in images:
        input_path = os.path.join(images_dir, img_name)
        output_path = os.path.join(output_dir, img_name)
        if args.verbose:
            print(f"Processing {img_name}...")
        make_silhouette(input_path, output_path, verbose=args.verbose)

if __name__ == '__main__':
    main()
