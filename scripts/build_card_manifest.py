import os
import json
import argparse

# Map folder keys to their data directories
CARD_FOLDERS = {
    'normal': 'data/cards_normal/cropped',
    'full_art': 'data/cards_full_art/cropped',
    'shiny': 'data/cards_shiny/cropped',
    'special': 'data/cards_special/cropped',
}

def build_manifest():
    manifest = {k: {} for k in CARD_FOLDERS}
    for key, folder in CARD_FOLDERS.items():
        if not os.path.isdir(folder):
            continue
        for fname in os.listdir(folder):
            if not fname.lower().endswith('.jpg'):
                continue
            # Expecting {id}-{card_no}.jpg
            parts = fname.split('-')
            if len(parts) < 2:
                continue
            poke_id = parts[0]
            manifest[key].setdefault(poke_id, []).append(fname)
    return manifest

def main():
    parser = argparse.ArgumentParser(description='Build a manifest of available card images by type and pokemon id.')
    parser.add_argument('--output', default='data/card_manifest.json', help='Output manifest file path')
    args = parser.parse_args()
    manifest = build_manifest()
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f'Manifest written to {args.output}')

if __name__ == '__main__':
    main()
