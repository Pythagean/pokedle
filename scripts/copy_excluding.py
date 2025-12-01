#!/usr/bin/env python3
"""Copy files from one directory to another excluding filenames that contain any of the given substrings.

Usage:
  python scripts/copy_excluding.py --src-dir ./src --dest-dir ./dst --exclude "tmp,backup" --recursive

Options:
  --src-dir     Source directory (required)
  --dest-dir    Destination directory (required)
  --exclude     Comma-separated list of substrings; files with filenames containing any substring will be skipped (required)
  --recursive   Recurse into subdirectories
  --overwrite   Overwrite files in destination
  --case-sensitive  Treat exclude matches as case-sensitive (default: case-insensitive)
  --dry-run     Show what would be copied without performing file copies

This is a small utility to help bulk-copy assets while skipping undesired files.
"""

import argparse
import os
import shutil
import sys


def should_exclude(filename: str, patterns, case_sensitive: bool) -> bool:
    hay = filename if case_sensitive else filename.lower()
    for p in patterns:
        pat = p if case_sensitive else p.lower()
        if pat in hay:
            return True
    return False


def iter_files(src_dir, recursive=False, exts=None):
    if recursive:
        for root, dirs, files in os.walk(src_dir):
            for f in files:
                yield os.path.join(root, f)
    else:
        for f in os.listdir(src_dir):
            path = os.path.join(src_dir, f)
            if os.path.isfile(path):
                yield path


def main(argv=None):
    parser = argparse.ArgumentParser(description='Copy files excluding by filename substrings')
    parser.add_argument('--src-dir', required=True)
    parser.add_argument('--dest-dir', required=True)
    parser.add_argument('--exclude', nargs='+', help='Comma-separated substrings to exclude (or provide multiple --exclude entries). Patterns starting with "-" may be interpreted as flags by some shells; use --exclude-list instead in that case.')
    parser.add_argument('--exclude-list', type=str, help='Comma-separated substrings to exclude in a single quoted string (safer for values starting with "-")')
    parser.add_argument('--include', nargs='+', help='Comma-separated substrings to include (or provide multiple --include entries). When provided, only files matching any include pattern are copied.')
    parser.add_argument('--include-list', type=str, help='Comma-separated substrings to include in a single quoted string (safer for values starting with "-")')
    parser.add_argument('--recursive', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument('--case-sensitive', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)

    src = args.src_dir
    dst = args.dest_dir
    # args.exclude may be a list (due to nargs='+') or a single string; flatten comma-separated entries
    # Build exclude patterns (flatten comma-separated inputs and multiple args)
    exclude_patterns = []
    if args.exclude:
        raw = args.exclude
        if isinstance(raw, list):
            for item in raw:
                exclude_patterns.extend([p.strip() for p in str(item).split(',') if p.strip()])
        else:
            exclude_patterns = [p.strip() for p in str(raw).split(',') if p.strip()]
    elif args.exclude_list:
        exclude_patterns = [p.strip() for p in str(args.exclude_list).split(',') if p.strip()]

    # Build include patterns (optional). If provided, only files matching any include pattern are copied.
    include_patterns = []
    if args.include:
        raw = args.include
        if isinstance(raw, list):
            for item in raw:
                include_patterns.extend([p.strip() for p in str(item).split(',') if p.strip()])
        else:
            include_patterns = [p.strip() for p in str(raw).split(',') if p.strip()]
    elif args.include_list:
        include_patterns = [p.strip() for p in str(args.include_list).split(',') if p.strip()]

    if not os.path.isdir(src):
        print(f"src-dir does not exist or is not a directory: {src}")
        sys.exit(2)

    total = 0
    copied = 0
    skipped = 0

    for path in iter_files(src, recursive=args.recursive):
        total += 1
        rel = os.path.relpath(path, src)
        filename = os.path.basename(path)
        # Exclude matches take priority
        if exclude_patterns and should_exclude(filename, exclude_patterns, args.case_sensitive):
            skipped += 1
            print(f"Skipping (exclude match): {rel}")
            continue

        # If include patterns are provided, only copy files that match at least one include pattern
        if include_patterns and not should_exclude(filename, include_patterns, args.case_sensitive):
            skipped += 1
            print(f"Skipping (no include match): {rel}")
            continue

        dest_path = os.path.join(dst, rel)
        dest_dir = os.path.dirname(dest_path)
        if not os.path.exists(dest_dir) and not args.dry_run:
            os.makedirs(dest_dir, exist_ok=True)

        if os.path.exists(dest_path) and not args.overwrite:
            skipped += 1
            print(f"Skipping (exists): {rel}")
            continue

        if args.dry_run:
            print(f"Would copy: {rel} -> {dest_path}")
            copied += 1
            continue

        shutil.copy2(path, dest_path)
        print(f"Copied: {rel} -> {dest_path}")
        copied += 1

    print('\nDone.')
    print(f"  total: {total}")
    print(f"  copied: {copied}")
    print(f"  skipped: {skipped}")


if __name__ == '__main__':
    main()
