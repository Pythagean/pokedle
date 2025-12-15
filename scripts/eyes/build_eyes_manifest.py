#!/usr/bin/env python3
"""
Build an eyes manifest JSON from eye image files.

This script scans a directory of eye images and organizes
filenames by their Pokemon ID (the filename without extension).

Usage:
    python build_eyes_manifest.py --input-dir ./eyes/trimmed --output-json ./eyes_manifest.json
"""

import argparse
import json
import os
from pathlib import Path


def get_pokemon_id(filename):
    """Extract the Pokemon ID from a filename like '1.png' -> '1'"""
    # Remove extension
    name_without_ext = os.path.splitext(filename)[0]
    return name_without_ext


def scan_directory(dir_path):
    """Scan a directory and return list of filenames sorted by Pokemon ID"""
    files = []
    
    if not os.path.exists(dir_path):
        return files
    
    for filename in os.listdir(dir_path):
        # Skip directories and hidden files
        if os.path.isdir(os.path.join(dir_path, filename)) or filename.startswith('.'):
            continue
        
        # Only include image files
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            files.append(filename)
    
    # Sort by Pokemon ID (numeric)
    files.sort(key=lambda f: int(get_pokemon_id(f)) if get_pokemon_id(f).isdigit() else 999999)
    
    return files


def main():
    parser = argparse.ArgumentParser(
        description='Build eyes manifest JSON from eye image directory'
    )
    parser.add_argument(
        '--input-dir',
        required=True,
        help='Directory containing eye image files'
    )
    parser.add_argument(
        '--output-json',
        required=True,
        help='Output JSON file path'
    )
    
    args = parser.parse_args()
    
    # Validate input directory
    if not os.path.isdir(args.input_dir):
        print(f"Error: Input directory '{args.input_dir}' does not exist")
        return 1
    
    print(f"Scanning directory: {args.input_dir}")
    
    # Build manifest
    files = scan_directory(args.input_dir)
    
    if not files:
        print("Warning: No image files found. Output will be empty.")
    else:
        print(f"  Found {len(files)} eye image files")
    
    # Write output JSON
    output_path = Path(args.output_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(files, f, indent=2, ensure_ascii=False)
    
    print(f"\nManifest written to: {args.output_json}")
    return 0


if __name__ == '__main__':
    exit(main())
