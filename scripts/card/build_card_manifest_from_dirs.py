#!/usr/bin/env python3
"""
Build a card manifest JSON from organized card image directories.

This script scans directories (full_art, normal, shiny, special) and organizes
filenames by their Pokemon ID (the first part before the dot).

Usage:
    python build_card_manifest_from_dirs.py --input-dir ./cards --output-json ./card_manifest.json
"""

import argparse
import json
import os
from pathlib import Path
from collections import defaultdict


def get_pokemon_id(filename):
    """Extract the Pokemon ID from a filename like '1-11.jpg' -> '1'"""
    return filename.split('-')[0] if '-' in filename else filename


def scan_directory(dir_path):
    """Scan a directory and return filenames grouped by Pokemon ID"""
    grouped = defaultdict(list)
    
    if not os.path.exists(dir_path):
        return grouped
    
    for filename in os.listdir(dir_path):
        # Skip directories and hidden files
        if os.path.isdir(os.path.join(dir_path, filename)) or filename.startswith('.'):
            continue
        
        # Get the Pokemon ID (first part before dot)
        pokemon_id = get_pokemon_id(filename)
        grouped[pokemon_id].append(filename)
    
    # Sort filenames within each Pokemon ID group
    for pokemon_id in grouped:
        grouped[pokemon_id].sort()
    
    return dict(sorted(grouped.items(), key=lambda x: int(x[0]) if x[0].isdigit() else x[0]))


def build_manifest(input_dir):
    """Build the complete manifest from all subdirectories"""
    manifest = {}
    
    # Folders to scan (in desired output order)
    # normal and shiny need to look in the /resized subdirectory
    folder_names = ['normal', 'full_art', 'shiny', 'special']
    
    for folder_name in folder_names:
        # For normal and shiny, look in the resized subdirectory
        if folder_name in ['normal', 'shiny']:
            folder_path = os.path.join(input_dir, folder_name, 'resized')
        else:
            folder_path = os.path.join(input_dir, folder_name)
        
        folder_data = scan_directory(folder_path)
        
        if folder_data:
            manifest[folder_name] = folder_data
        else:
            print(f"Warning: No files found in {folder_path}")
    
    return manifest


def main():
    parser = argparse.ArgumentParser(
        description='Build card manifest JSON from organized card directories'
    )
    parser.add_argument(
        '--input-dir',
        required=True,
        help='Directory containing card subfolders (full_art, normal, shiny, special)'
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
    
    print(f"Scanning directories in: {args.input_dir}")
    
    # Build manifest
    manifest = build_manifest(args.input_dir)
    
    if not manifest:
        print("Warning: No data found. Output will be empty.")
    else:
        # Print summary
        for folder_name, data in manifest.items():
            total_files = sum(len(files) for files in data.values())
            print(f"  {folder_name}: {len(data)} Pokemon IDs, {total_files} total files")
    
    # Write output JSON
    output_path = Path(args.output_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"\nManifest written to: {args.output_json}")
    return 0


if __name__ == '__main__':
    exit(main())
