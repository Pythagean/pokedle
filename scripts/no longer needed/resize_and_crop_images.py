import os
import argparse
from PIL import Image

def parse_args():
    parser = argparse.ArgumentParser(description='Resize and crop images in a directory.')
    parser.add_argument('directory', help='Directory containing images to process')
    parser.add_argument('--width', type=int, required=True, help='Resize width (maintain aspect ratio)')
    parser.add_argument('--crop-x', type=int, default=0, help='Crop start x (pixels)')
    parser.add_argument('--crop-y', type=int, default=0, help='Crop start y (pixels)')
    parser.add_argument('--crop-width', type=int, help='Crop width (pixels, default: to edge)')
    parser.add_argument('--crop-height', type=int, help='Crop height (pixels, default: to edge)')
    parser.add_argument('--partial', type=int, default=None, help='Only process N files')
    parser.add_argument('--verbose', action='store_true', help='Print detailed actions')
    return parser.parse_args()

def main():
    args = parse_args()
    src_dir = args.directory
    resized_dir = os.path.join(src_dir, 'resized')
    cropped_dir = os.path.join(src_dir, 'cropped')
    os.makedirs(resized_dir, exist_ok=True)
    os.makedirs(cropped_dir, exist_ok=True)
    files = [f for f in os.listdir(src_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    if args.partial:
        files = files[:args.partial]
        if args.verbose:
            print(f"[Partial] Only processing first {args.partial} files: {files}")
    for fname in files:
        src_path = os.path.join(src_dir, fname)
        resized_path = os.path.join(resized_dir, fname)
        cropped_path = os.path.join(cropped_dir, fname)
        try:
            with Image.open(src_path) as im:
                # Resize
                w_percent = args.width / float(im.size[0])
                h_size = int((float(im.size[1]) * float(w_percent)))
                im_resized = im.resize((args.width, h_size), Image.LANCZOS)
                im_resized.save(resized_path)
                if args.verbose:
                    print(f"Saved resized image to {resized_path}")
                # Crop
                crop_x = args.crop_x
                crop_y = args.crop_y
                crop_w = args.crop_width if args.crop_width else im_resized.width - crop_x
                crop_h = args.crop_height if args.crop_height else im_resized.height - crop_y
                box = (crop_x, crop_y, crop_x + crop_w, crop_y + crop_h)
                im_cropped = im_resized.crop(box)
                im_cropped.save(cropped_path)
            if args.verbose:
                print(f"Processed {fname}: resized to width {args.width}, cropped to box {box}, saved to {cropped_path}")
        except Exception as e:
            print(f"Failed to process {fname}: {e}")

if __name__ == '__main__':
    main()
