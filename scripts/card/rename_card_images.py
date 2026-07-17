import os
import re
import json
import shutil
import subprocess
import sys
import argparse
from PIL import Image


SUPPORTED_EXTENSIONS = {'.webp', '.jpg', '.jpeg', '.png'}


def get_mode(stem):
    """
    Determine the card mode from the filename stem.
    Checks are ordered longest-suffix-first to avoid partial matches.
    Returns one of: 'normal', 'special', 'full_art', 'shiny_regular', 'shiny_full'
    """
    if '-shiny_full' in stem:
        return 'shiny_full'
    if '-shiny' in stem:
        return 'shiny_regular'
    if '-full' in stem:
        return 'full_art'
    if '-spec' in stem:
        return 'special'
    return 'normal'


def get_pokemon_name(stem):
    """
    Strip mode suffixes and any trailing number from the stem to get the Pokémon name.
    e.g. 'pikachu-shiny2'      -> 'pikachu'
         'charizard-shiny_full' -> 'charizard'
         'bulbasaur3'           -> 'bulbasaur'
    """
    name = stem
    for suffix in ('-shiny_full', '-shiny', '-full', '-spec'):
        name = name.replace(suffix, '')
    # Remove any trailing digits
    name = re.sub(r'\d+$', '', name)
    return name.strip('-').strip()


def collect_used_indices(manifest, mode, pokemon_id_str):
    """Return the set of integer indices already used for (mode, pokemon_id) in the manifest."""
    if mode == 'normal':
        files = manifest.get('normal', {}).get(pokemon_id_str, [])
    elif mode == 'special':
        files = manifest.get('special', {}).get(pokemon_id_str, [])
    elif mode == 'full_art':
        files = manifest.get('full_art', {}).get(pokemon_id_str, [])
    elif mode == 'shiny_regular':
        files = manifest.get('shiny', {}).get(pokemon_id_str, {}).get('regular', [])
    elif mode == 'shiny_full':
        files = manifest.get('shiny', {}).get(pokemon_id_str, {}).get('full', [])
    else:
        files = []

    indices = set()
    for fname in files:
        stem = os.path.splitext(fname)[0]
        parts = stem.split('-')
        if len(parts) == 2:
            try:
                indices.add(int(parts[1]))
            except ValueError:
                pass
    return indices


def next_available_index(used_indices):
    """Find the lowest positive integer not already in used_indices."""
    i = 1
    while i in used_indices:
        i += 1
    return i


def main():
    parser = argparse.ArgumentParser(
        description='Rename and convert Pokémon card images using card_manifest.json for unique IDs.'
    )
    parser.add_argument('folder', help='Folder containing the input image files')
    parser.add_argument(
        '--pokemon-data',
        default='public/data/pokemon_data.json',
        help='Path to pokemon_data.json (default: public/data/pokemon_data.json)',
    )
    parser.add_argument(
        '--card-manifest',
        default='public/data/card_manifest.json',
        help='Path to card_manifest.json (default: public/data/card_manifest.json)',
    )
    parser.add_argument(
        '--output',
        help='Output folder for converted files (default: <folder>/output)',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print what would happen without writing any files',
    )
    parser.add_argument('--verbose', action='store_true', help='Print detailed per-file info')

    # Resize / crop options (all optional — omit --resize-width to skip post-processing)
    resize_group = parser.add_argument_group('resize/crop (post-processing)')
    resize_group.add_argument('--resize-width', type=int, default=None,
                              help='Resize width passed to resize_and_crop_images.py (skips step if omitted)')
    resize_group.add_argument('--crop-x', type=int, default=0)
    resize_group.add_argument('--crop-y', type=int, default=0)
    resize_group.add_argument('--crop-width', type=int, default=None)
    resize_group.add_argument('--crop-height', type=int, default=None)
    args = parser.parse_args()

    output_dir = args.output or os.path.join(args.folder, 'output')

    MODE_SUBDIR = {
        'normal':       os.path.join('normal'),
        'special':      os.path.join('special'),
        'full_art':     os.path.join('full_art'),
        'shiny_regular': os.path.join('shiny', 'regular'),
        'shiny_full':   os.path.join('shiny', 'full'),
    }

    if not args.dry_run:
        for subdir in MODE_SUBDIR.values():
            os.makedirs(os.path.join(output_dir, subdir), exist_ok=True)

    # Load Pokémon data: build lowercase name -> id mapping
    with open(args.pokemon_data, encoding='utf-8') as f:
        pokemon_data = json.load(f)
    name_to_id = {p['name'].lower(): str(p['id']) for p in pokemon_data}

    # Load card manifest
    with open(args.card_manifest, encoding='utf-8') as f:
        manifest = json.load(f)

    # Track indices assigned during this run so we don't assign the same index twice
    # when processing multiple files for the same (mode, pokemon_id)
    # Key: (mode, pokemon_id_str) -> set of used indices (pre-populated from manifest)
    assigned = {}

    files = sorted(
        f for f in os.listdir(args.folder)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        print('No supported image files found in the input folder.')
        return

    failed = []

    for fname in files:
        stem, ext = os.path.splitext(fname)
        stem_lower = stem.lower()

        mode = get_mode(stem_lower)
        poke_name = get_pokemon_name(stem_lower)

        if args.verbose:
            print(f'\n[{fname}]')
            print(f'  Detected mode : {mode}')
            print(f'  Pokémon name  : {poke_name}')

        poke_id = name_to_id.get(poke_name)
        if not poke_id:
            print(f'  SKIP: No Pokémon found for name "{poke_name}" (file: {fname})')
            failed.append(fname)
            continue

        if args.verbose:
            print(f'  Pokémon ID    : {poke_id}')

        # Initialise used-index set for this (mode, id) on first encounter
        key = (mode, poke_id)
        if key not in assigned:
            assigned[key] = collect_used_indices(manifest, mode, poke_id)

        idx = next_available_index(assigned[key])
        assigned[key].add(idx)  # reserve it for subsequent files in this run

        new_fname = f'{poke_id}-{idx}.jpg'
        src_path = os.path.join(args.folder, fname)
        dst_path = os.path.join(output_dir, MODE_SUBDIR[mode], new_fname)

        if args.verbose:
            print(f'  Output file   : {MODE_SUBDIR[mode]}/{new_fname}  (manifest section: {mode})')

        if args.dry_run:
            print(f'[dry-run] {fname} -> {MODE_SUBDIR[mode]}/{new_fname}  (mode={mode}, id={poke_id})')
            continue

        try:
            with Image.open(src_path) as im:
                rgb = im.convert('RGB')
                rgb.save(dst_path, 'JPEG')
            print(f'OK  {fname} -> {MODE_SUBDIR[mode]}/{new_fname}  (mode={mode}, id={poke_id})')
        except Exception as e:
            print(f'FAIL {fname}: {e}')
            failed.append(fname)

    print(f'\nDone. {len(files) - len(failed)}/{len(files)} files processed successfully.')
    if failed:
        print(f'Failed ({len(failed)}): {chr(44).join(failed)}')

    # --- Post-processing: resize (and optionally crop) each mode directory ---
    if args.dry_run:
        return

    if args.resize_width is None:
        print('\n[resize] Skipping resize/crop step (--resize-width not provided).')
    else:
        # Modes whose cropped output we keep; all others have their cropped/ folder removed.
        KEEP_CROPPED = {'normal', 'shiny_regular'}

        resize_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resize_and_crop_images.py')

        for mode, subdir in MODE_SUBDIR.items():
            mode_dir = os.path.join(output_dir, subdir)
            # Skip directories that received no files this run
            jpgs = [f for f in os.listdir(mode_dir) if f.lower().endswith('.jpg')]
            if not jpgs:
                if args.verbose:
                    print(f'[resize] Skipping {subdir}/ — no files.')
                continue

            cmd = [
                sys.executable, resize_script, mode_dir,
                '--width', str(args.resize_width),
                '--crop-x', str(args.crop_x),
                '--crop-y', str(args.crop_y),
            ]
            if args.crop_width is not None:
                cmd += ['--crop-width', str(args.crop_width)]
            if args.crop_height is not None:
                cmd += ['--crop-height', str(args.crop_height)]
            if args.verbose:
                cmd.append('--verbose')

            print(f'\n[resize] Processing {subdir}/ ({len(jpgs)} files)...')
            subprocess.run(cmd, check=True)

            # 1. Delete the temporary converted-but-not-yet-processed files from the mode dir root
            for fname in jpgs:
                fpath = os.path.join(mode_dir, fname)
                if os.path.exists(fpath):
                    os.remove(fpath)
            if args.verbose:
                print(f'[resize] Removed {len(jpgs)} temp file(s) from {subdir}/')

            # 2. Remove cropped output for modes that don't need it
            if mode not in KEEP_CROPPED:
                cropped_subdir = os.path.join(mode_dir, 'cropped')
                if os.path.isdir(cropped_subdir):
                    shutil.rmtree(cropped_subdir)
                    if args.verbose:
                        print(f'[resize] Removed {subdir}/cropped/ (not needed for {mode})')

            # 3. Promote resized files directly into the mode dir root (for all modes except normal)
            if mode != 'normal':
                resized_subdir = os.path.join(mode_dir, 'resized')
                if os.path.isdir(resized_subdir):
                    for f in os.listdir(resized_subdir):
                        shutil.move(os.path.join(resized_subdir, f), os.path.join(mode_dir, f))
                    os.rmdir(resized_subdir)
                    if args.verbose:
                        print(f'[resize] Promoted resized files into {subdir}/')

            # 4. For shiny_regular, move cropped files up to shiny/cropped/
            if mode == 'shiny_regular':
                cropped_subdir = os.path.join(mode_dir, 'cropped')
                shiny_cropped_dir = os.path.join(os.path.dirname(mode_dir), 'cropped')
                if os.path.isdir(cropped_subdir):
                    os.makedirs(shiny_cropped_dir, exist_ok=True)
                    for f in os.listdir(cropped_subdir):
                        shutil.move(os.path.join(cropped_subdir, f), os.path.join(shiny_cropped_dir, f))
                    os.rmdir(cropped_subdir)
                    if args.verbose:
                        print(f'[resize] Moved shiny/regular/cropped/ -> shiny/cropped/')

        print('\nResize/crop complete.')

    # --- Final steps: move assets, rebuild manifest, summarize ---
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    scripts_card = os.path.join(project_root, 'scripts', 'card')
    assets_cards_dir = os.path.join(os.path.dirname(project_root), 'pokedle_assets', 'cards')
    card_manifest_path = os.path.join(project_root, 'public', 'data', 'card_manifest.json')
    pokemon_data_path = os.path.join(project_root, 'public', 'data', 'pokemon_data.json')
    card_summary_path = os.path.join(scripts_card, 'card_summary.csv')

    print('\n[move] Moving images to pokedle_assets...')
    subprocess.run([
        sys.executable, os.path.join(scripts_card, 'move_images.py'),
        '--input-dir', output_dir,
        '--output-dir', assets_cards_dir,
        '--verbose',
    ], check=True)

    print('\n[manifest] Rebuilding card manifest...')
    subprocess.run([
        sys.executable, os.path.join(scripts_card, 'build_card_manifest_from_dirs.py'),
        '--input-dir', assets_cards_dir,
        '--output-json', card_manifest_path,
    ], check=True)

    print('\n[summarize] Summarizing card manifest...')
    subprocess.run([
        sys.executable, os.path.join(scripts_card, 'summarize_card_manifest.py'),
        '--input-json', card_manifest_path,
        '--output-csv', card_summary_path,
        '--pokemon-data', pokemon_data_path,
    ], check=True)

    print('\nAll done.')


if __name__ == '__main__':
    main()
