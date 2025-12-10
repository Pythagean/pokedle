#!/usr/bin/env python3
"""
generate_background_manifest.py

Scan a directory recursively for image files and produce a JSON manifest grouped by folder.

Usage:
  python scripts/generate_background_manifest.py --input-dir path/to/backgrounds --output backgrounds_manifest.json

Output format:
{
  "folder_name_1": [
    "1.png",
    "2.png"
  ],
  "folder_name_2": [
    "3.png"
  ]
}

Keys are folder paths relative to the input directory ("." will be replaced with the input
directory basename). Filenames are basenames only.
"""

import argparse
import json
import os
from pathlib import Path
from typing import List, Dict


DEFAULT_EXTS = {'.png', '.jpg', '.jpeg', '.webp'}


def collect_images(input_dir: Path, exts: List[str]) -> Dict[str, List[str]]:
    mapping = {}
    input_dir = input_dir.resolve()
    for dirpath, dirnames, filenames in os.walk(input_dir):
        rel = os.path.relpath(dirpath, input_dir)
        # Normalize to forward slashes for manifest keys
        key = rel.replace('\\', '/')
        if key == '.':
            key = input_dir.name
        files = []
        for fn in sorted(filenames):
            lower = fn.lower()
            if any(lower.endswith(ext) for ext in exts):
                files.append(fn)
        if files:
            mapping[key] = files
    # Sort keys for deterministic output
    ordered = {k: mapping[k] for k in sorted(mapping.keys())}
    return ordered


def main():
    p = argparse.ArgumentParser(description='Generate a JSON manifest of background images grouped by folder')
    p.add_argument('--input-dir', '-i', required=True, help='Input directory to scan (recursively)')
    p.add_argument('--output', '-o', default='backgrounds_manifest.json', help='Output JSON file path')
    p.add_argument('--exts', help='Comma-separated list of extensions to include (defaults: png,jpg,jpeg,webp)')
    args = p.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists() or not input_dir.is_dir():
        print(f'Error: input directory not found: {input_dir}')
        raise SystemExit(2)

    if args.exts:
        exts = [e if e.startswith('.') else '.' + e for e in [x.strip().lower() for x in args.exts.split(',') if x.strip()]]
    else:
        exts = sorted(DEFAULT_EXTS)

    manifest = collect_images(input_dir, exts)

    out_path = Path(args.output)
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    with out_path.open('w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=4)

    print(f'Wrote manifest to: {out_path} ({len(manifest)} folders)')


if __name__ == '__main__':
    main()
