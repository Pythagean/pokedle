#!/usr/bin/env python3
"""Create a region map overrides JSON from a simple CSV.

Usage:
  python scripts/tools/make_region_map_overrides.py overrides.csv --output region_map_overrides.json
"""
import argparse
import csv
import json


def main():
    p = argparse.ArgumentParser(description='Make region map overrides')
    p.add_argument('csv', help='CSV with two columns: substring,region')
    p.add_argument('--output', required=True)
    args = p.parse_args()

    out = {}
    with open(args.csv, encoding='utf-8') as fh:
        reader = csv.reader(fh)
        for row in reader:
            if not row:
                continue
            k = row[0].strip().lower()
            v = row[1].strip().lower() if len(row) > 1 else ''
            out[k] = v

    with open(args.output, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)

    print(f'Wrote overrides to {args.output}')


if __name__ == '__main__':
    main()
