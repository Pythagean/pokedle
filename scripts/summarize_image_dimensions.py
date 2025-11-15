import os
from collections import Counter, defaultdict
from PIL import Image
import argparse


parser = argparse.ArgumentParser(description='Summarize image dimensions in a folder.')
parser.add_argument('folder', type=str, help='Folder containing images')
parser.add_argument('--output', type=str, default=None, help='Output CSV file (optional)')
args = parser.parse_args()

folder = args.folder

dim_counter = Counter()
file_dims = defaultdict(list)

for fname in os.listdir(folder):
    fpath = os.path.join(folder, fname)
    if not os.path.isfile(fpath):
        continue
    try:
        with Image.open(fpath) as img:
            dims = img.size  # (width, height)
            dim_counter[dims] += 1
            file_dims[dims].append(fname)
    except Exception as e:
        print(f'Could not process {fname}: {e}')


summary = [(dims, count) for dims, count in dim_counter.most_common() if count > 1]

print('Dimension summary (ordered by count, >1 images):')
for dims, count in summary:
    print(f'{dims}: {count} images')

if args.output:
    import csv
    with open(args.output, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['width', 'height', 'count'])
        for dims, count in summary:
            writer.writerow([dims[0], dims[1], count])
    print(f'CSV summary written to {args.output}')
