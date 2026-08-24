#!/usr/bin/env python3
"""
Script to find missing IDs in a directory of {id}.png files.
Checks for files in the range 1-386.
"""

import os
import re
import sys
from pathlib import Path
from typing import Set, List


def find_missing_ids(directory: str, max_id: int = 386) -> dict:
    """
    Scan a directory for {id}.png files and find missing IDs.
    
    Args:
        directory: Path to directory containing {id}.png files
        max_id: Maximum ID to check for (default 386)
    
    Returns:
        Dictionary with 'present', 'missing', and 'stats'
    """
    directory_path = Path(directory)
    
    if not directory_path.exists():
        raise ValueError(f"Directory does not exist: {directory}")
    
    if not directory_path.is_dir():
        raise ValueError(f"Path is not a directory: {directory}")
    
    present_ids: Set[int] = set()
    
    # Find all {id}.png files
    pattern = re.compile(r'^(\d+)\.png$', re.IGNORECASE)
    
    for file in directory_path.iterdir():
        if file.is_file():
            match = pattern.match(file.name)
            if match:
                file_id = int(match.group(1))
                if 1 <= file_id <= max_id:
                    present_ids.add(file_id)
    
    # Find missing IDs
    all_ids = set(range(1, max_id + 1))
    missing_ids = sorted(all_ids - present_ids)
    
    return {
        'present': sorted(present_ids),
        'missing': missing_ids,
        'stats': {
            'total_expected': max_id,
            'found': len(present_ids),
            'missing_count': len(missing_ids),
            'percentage_complete': (len(present_ids) / max_id) * 100
        }
    }


def print_summary(results: dict) -> None:
    """Print a summary of the results."""
    stats = results['stats']
    missing = results['missing']
    
    print("\n" + "="*60)
    print("MISSING IDS REPORT")
    print("="*60)
    print(f"\nTotal Expected: {stats['total_expected']}")
    print(f"Found: {stats['found']}")
    print(f"Missing: {stats['missing_count']}")
    print(f"Completion: {stats['percentage_complete']:.1f}%")
    
    if missing:
        print(f"\n{stats['missing_count']} Missing IDs:")
        print("-" * 60)
        
        # Group missing IDs into ranges for easier reading
        ranges: List[List[int]] = []
        for id_num in missing:
            if ranges and ranges[-1][-1] + 1 == id_num:
                ranges[-1].append(id_num)
            else:
                ranges.append([id_num])
        
        for range_list in ranges:
            if len(range_list) == 1:
                print(f"  {range_list[0]}")
            else:
                print(f"  {range_list[0]}-{range_list[-1]}")
    else:
        print("\n✓ All IDs present!")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python find_missing_ids.py <directory> [max_id]")
        print("Example: python find_missing_ids.py ./my_images 386")
        sys.exit(1)
    
    directory = sys.argv[1]
    max_id = int(sys.argv[2]) if len(sys.argv) > 2 else 386
    
    try:
        results = find_missing_ids(directory, max_id)
        print_summary(results)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
