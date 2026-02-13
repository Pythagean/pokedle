#!/usr/bin/env python3
"""
Script to apply location name overrides to Pokemon data.

This script:
1. Reads location overrides from a CSV file
2. Replaces location names in the Pokemon data JSON
3. Removes entries where override is "XXX"
"""

import json
import csv
import argparse
import sys

def merge_locations(locations):
    """
    Merge locations with the same name, combining their games, methods, levels, and chances.
    
    Args:
        locations: List of location dictionaries
        
    Returns:
        List of deduplicated and merged location dictionaries
    """
    if not locations:
        return []
    
    # Use dict to group by location name
    location_map = {}
    
    for loc in locations:
        name = loc.get('name', '')
        if not name:
            continue
        
        if name not in location_map:
            # First time seeing this location
            location_map[name] = {
                'name': name,
                'region': loc.get('region'),
                'games': set(loc.get('games', [])),
                'method': loc.get('method', ''),
                'level_ranges': set(),
                'chances': set()
            }
            # Store level_range if present
            if 'level_range' in loc and loc['level_range']:
                location_map[name]['level_ranges'].add(loc['level_range'])
            # Store chance if present
            if 'chance' in loc and loc['chance']:
                location_map[name]['chances'].add(loc['chance'])
        else:
            # Merge with existing location
            existing = location_map[name]
            
            # Merge games
            existing['games'].update(loc.get('games', []))
            
            # Merge methods
            existing_method = existing['method']
            new_method = loc.get('method', '')
            
            if new_method and new_method != existing_method:
                # Combine methods if different and non-empty
                if existing_method:
                    # Split by comma, deduplicate, rejoin
                    methods = set()
                    for m in existing_method.split(', '):
                        methods.add(m.strip())
                    for m in new_method.split(', '):
                        methods.add(m.strip())
                    existing['method'] = ', '.join(sorted(methods))
                else:
                    existing['method'] = new_method
            
            # Merge level_range
            if 'level_range' in loc and loc['level_range']:
                existing['level_ranges'].add(loc['level_range'])
            
            # Merge chance
            if 'chance' in loc and loc['chance']:
                existing['chances'].add(loc['chance'])
    
    # Convert back to list format
    result = []
    for loc_data in location_map.values():
        entry = {
            'name': loc_data['name'],
            'region': loc_data['region'],
            'games': sorted(list(loc_data['games'])),
            'method': loc_data['method']
        }
        
        # Combine level ranges if present
        if loc_data['level_ranges']:
            level_ranges = sorted(loc_data['level_ranges'])
            if len(level_ranges) == 1:
                entry['level_range'] = level_ranges[0]
            else:
                # Merge multiple level ranges
                all_levels = set()
                for lr in level_ranges:
                    if '-' in lr:
                        min_val, max_val = lr.split('-')
                        all_levels.add(int(min_val))
                        all_levels.add(int(max_val))
                    else:
                        all_levels.add(int(lr))
                if all_levels:
                    min_level = min(all_levels)
                    max_level = max(all_levels)
                    if min_level == max_level:
                        entry['level_range'] = str(min_level)
                    else:
                        entry['level_range'] = f"{min_level}-{max_level}"
        
        # Combine chances if present
        if loc_data['chances']:
            chances = sorted(loc_data['chances'])
            if len(chances) == 1:
                entry['chance'] = chances[0]
            else:
                # Merge multiple chances
                all_chances = set()
                for ch in chances:
                    # Remove '%' and parse
                    ch_clean = ch.rstrip('%')
                    if '-' in ch_clean:
                        min_val, max_val = ch_clean.split('-')
                        all_chances.add(int(min_val))
                        all_chances.add(int(max_val))
                    else:
                        all_chances.add(int(ch_clean))
                if all_chances:
                    min_chance = min(all_chances)
                    max_chance = max(all_chances)
                    if min_chance == max_chance:
                        entry['chance'] = f"{min_chance}%"
                    else:
                        entry['chance'] = f"{min_chance}-{max_chance}%"
        
        result.append(entry)
    
    return result

def main():
    parser = argparse.ArgumentParser(
        description='Apply location name overrides to Pokemon data'
    )
    parser.add_argument(
        '--input-csv',
        required=True,
        help='Path to input CSV file with location overrides'
    )
    parser.add_argument(
        '--input-json',
        required=True,
        help='Path to input Pokemon data JSON file'
    )
    parser.add_argument(
        '--output-json',
        required=True,
        help='Path to output Pokemon data JSON file'
    )
    
    args = parser.parse_args()
    
    # Read location overrides from CSV
    print(f"Reading location overrides from: {args.input_csv}")
    overrides = {}
    remove_locations = []
    
    try:
        with open(args.input_csv, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                missing = row.get('missing_location', '').strip()
                override = row.get('location_override', '').strip()
                
                if not missing:
                    continue
                
                if override == 'XXX':
                    remove_locations.append(missing)
                elif override:
                    overrides[missing] = override
    except FileNotFoundError:
        print(f"Error: Input CSV file not found: {args.input_csv}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        sys.exit(1)
    
    print(f"Loaded {len(overrides)} location overrides")
    print(f"Loaded {len(remove_locations)} locations to remove")
    
    # Load Pokemon data JSON
    print(f"\nLoading Pokemon data from: {args.input_json}")
    try:
        with open(args.input_json, 'r', encoding='utf-8') as f:
            pokemon_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input JSON file not found: {args.input_json}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file: {e}")
        sys.exit(1)
    
    if not isinstance(pokemon_data, list):
        print("Error: Input JSON must be an array of Pokemon")
        sys.exit(1)
    
    print(f"Loaded {len(pokemon_data)} Pokemon")
    
    # Apply overrides and removals
    print("\nApplying location overrides...")
    replaced_count = 0
    removed_count = 0
    
    for pokemon in pokemon_data:
        # Process location_area_encounters
        if 'location_area_encounters' in pokemon:
            original_encounters = pokemon['location_area_encounters']
            filtered_encounters = []
            
            for encounter in original_encounters:
                location_name = encounter.get('name', '')
                
                # Check if this location should be removed
                if location_name in remove_locations:
                    removed_count += 1
                    continue
                
                # Check if this location should be replaced
                if location_name in overrides:
                    new_name = overrides[location_name]
                    encounter['name'] = new_name
                    # Update region (first word of new location)
                    encounter['region'] = new_name.split(' ')[0] if ' ' in new_name else new_name
                    replaced_count += 1
                
                filtered_encounters.append(encounter)
            
            pokemon['location_area_encounters'] = filtered_encounters
        
        # Process preevolution_location_area_encounters
        if 'preevolution_location_area_encounters' in pokemon:
            original_preevo = pokemon['preevolution_location_area_encounters']
            filtered_preevo = []
            
            for encounter in original_preevo:
                location_name = encounter.get('name', '')
                
                # Check if this location should be removed
                if location_name in remove_locations:
                    removed_count += 1
                    continue
                
                # Check if this location should be replaced
                if location_name in overrides:
                    new_name = overrides[location_name]
                    encounter['name'] = new_name
                    # Update region (first word of new location)
                    encounter['region'] = new_name.split(' ')[0] if ' ' in new_name else new_name
                    replaced_count += 1
                
                filtered_preevo.append(encounter)
            
            pokemon['preevolution_location_area_encounters'] = filtered_preevo
    
    # Deduplicate and merge locations
    print("\nDeduplicating and merging locations...")
    merged_count = 0
    
    for pokemon in pokemon_data:
        # Deduplicate location_area_encounters
        if 'location_area_encounters' in pokemon:
            merged = merge_locations(pokemon['location_area_encounters'])
            merged_count += len(pokemon['location_area_encounters']) - len(merged)
            pokemon['location_area_encounters'] = merged
        
        # Deduplicate preevolution_location_area_encounters
        if 'preevolution_location_area_encounters' in pokemon:
            merged = merge_locations(pokemon['preevolution_location_area_encounters'])
            merged_count += len(pokemon['preevolution_location_area_encounters']) - len(merged)
            pokemon['preevolution_location_area_encounters'] = merged
    
    # Save output JSON
    print(f"\nSaving results to: {args.output_json}")
    try:
        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(pokemon_data, f, indent=2, ensure_ascii=False)
        print("Successfully saved output file!")
    except IOError as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Locations replaced: {replaced_count}")
    print(f"Locations removed: {removed_count}")
    print(f"Locations merged: {merged_count}")
    print("\nProcessing complete!")

if __name__ == '__main__':
    main()
