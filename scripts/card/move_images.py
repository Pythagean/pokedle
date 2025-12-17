#!/usr/bin/env python3
"""
Move images from an input directory to an output directory preserving folder structure.

If a destination filename already exists, increment the numeric suffix after the
first '-' (e.g. `1-26.jpg` -> `1-27.jpg`) until a free name is found.

Usage: python move_images.py --input-dir IN --output-dir OUT [--dry-run] [--verbose]
"""
from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path
import sys


def find_available_name(dest_dir: Path, stem: str, ext: str) -> Path:
    """Given dest_dir, stem (without extension), and ext (including dot),
    return a Path that does not exist by incrementing the numeric suffix after
    the first '-' part. If no '-' or non-numeric suffix, append '-1' and increment.
    """
    # Example stem: '1-26'
    parts = stem.split('-', 1)
    if len(parts) == 2 and parts[1].isdigit():
        prefix = parts[0]
        num = int(parts[1])
        candidate = dest_dir / f"{prefix}-{num}{ext}"
        while candidate.exists():
            num += 1
            candidate = dest_dir / f"{prefix}-{num}{ext}"
        return candidate

    # Fallback: try stem-1, stem-2, ...
    num = 1
    candidate = dest_dir / f"{stem}-{num}{ext}"
    while candidate.exists():
        num += 1
        candidate = dest_dir / f"{stem}-{num}{ext}"
    return candidate


def move_files(input_dir: Path, output_dir: Path, dry_run: bool = False, verbose: bool = False) -> int:
    input_dir = input_dir.resolve()
    output_dir = output_dir.resolve()
    if not input_dir.is_dir():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 2

    moved = 0
    for root, dirs, files in os.walk(input_dir):
        root_path = Path(root)
        rel_root = root_path.relative_to(input_dir)
        target_root = output_dir.joinpath(rel_root)
        # ensure target dir exists
        if not dry_run:
            target_root.mkdir(parents=True, exist_ok=True)

        for fname in files:
            src = root_path / fname
            # compute target path preserving relative path
            dest = target_root / fname
            if dest.exists():
                stem = Path(fname).stem
                ext = Path(fname).suffix
                available = find_available_name(target_root, stem, ext)
                if verbose:
                    print(f"Destination exists. Will try: {available.name}")
                dest = available
            if dry_run:
                print(f"DRY RUN: would move: {src} -> {dest}")
            else:
                try:
                    shutil.move(str(src), str(dest))
                    moved += 1
                    if verbose:
                        print(f"Moved: {src} -> {dest}")
                except Exception as e:
                    print(f"Failed to move {src} -> {dest}: {e}", file=sys.stderr)

    if verbose:
        print(f"Done. Files moved: {moved}")
    return 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Move images preserving folder structure and avoiding name collisions.")
    p.add_argument('--input-dir', '-i', required=True, help='Input directory')
    p.add_argument('--output-dir', '-o', required=True, help='Output directory')
    p.add_argument('--dry-run', action='store_true', help='Show actions without moving files')
    p.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    return p.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    return move_files(input_dir, output_dir, dry_run=args.dry_run, verbose=args.verbose)


if __name__ == '__main__':
    raise SystemExit(main())
