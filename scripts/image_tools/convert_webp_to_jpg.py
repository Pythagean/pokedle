import os
import sys
import argparse
from PIL import Image

parser = argparse.ArgumentParser(description='Convert all .webp images in a directory to .jpg')
parser.add_argument('directory', help='Directory containing .webp files')
args = parser.parse_args()

dir_path = args.directory

if not os.path.isdir(dir_path):
    print(f"Directory not found: {dir_path}")
    sys.exit(1)

for fname in os.listdir(dir_path):
    if fname.lower().endswith('.webp'):
        webp_path = os.path.join(dir_path, fname)
        jpg_path = os.path.join(dir_path, os.path.splitext(fname)[0] + '.jpg')
        try:
            with Image.open(webp_path) as im:
                rgb_im = im.convert('RGB')
                rgb_im.save(jpg_path, 'JPEG')
            os.remove(webp_path)
            print(f"Converted and removed: {fname} -> {os.path.basename(jpg_path)}")
        except Exception as e:
            print(f"Failed to convert {fname}: {e}")
