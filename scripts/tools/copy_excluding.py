#!/usr/bin/env python3
"""Copy files from src to dst excluding certain patterns.

Usage:
  python scripts/tools/copy_excluding.py src/ dst/ --exclude .git --exclude '*.tmp'
"""
import argparse
import fnmatch
import os
import shutil


def main():
    p = argparse.ArgumentParser(description='Copy files excluding patterns')
    p.add_argument('src')
    p.add_argument('dst')
    p.add_argument('--exclude', action='append', default=[], help='Glob pattern to exclude')
    args = p.parse_args()

    for root, dirs, files in os.walk(args.src):
        rel = os.path.relpath(root, args.src)
        dst_root = os.path.join(args.dst, rel) if rel != '.' else args.dst
        os.makedirs(dst_root, exist_ok=True)
        for f in files:
            skip = False
            for pat in args.exclude:
                if fnmatch.fnmatch(f, pat):
                    skip = True
                    break
            if skip:
                continue
            src_path = os.path.join(root, f)
            dst_path = os.path.join(dst_root, f)
            shutil.copy2(src_path, dst_path)

if __name__ == '__main__':
    main()
