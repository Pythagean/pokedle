#!/usr/bin/env python3
"""Build a card manifest JSON from card images and a CSV summary.

Usage:
  python scripts/tools/build_card_manifest.py --images-dir ./images --csv summary.csv --output manifest.json

This is a lightweight helper used by the project to summarize card metadata.
"""
import argparse
import csv
import json
import os


def main():
    p = argparse.ArgumentParser(description='Build card manifest from images and CSV')
    p.add_argument('--images-dir', required=True)
    p.add_argument('--csv', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()

    rows = []
    with open(args.csv, encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            rows.append(r)

    manifest = {}
    for r in rows:
        fname = r.get('filename') or r.get('file')
        if not fname:
            continue
        path = os.path.join(args.images_dir, fname)
        manifest[fname] = r

    with open(args.output, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)

    print(f'Wrote manifest to {args.output}')


if __name__ == '__main__':
    main()
