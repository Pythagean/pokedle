import os
import re
import argparse

def main():
    parser = argparse.ArgumentParser(description="Rename images in src/data/todo to <dex_number>.png format.")
    parser.add_argument('--verbose', action='store_true', help='Print progress messages')
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    todo_dir = os.path.join(base_dir, 'src', 'data', 'todo')
    if not os.path.exists(todo_dir):
        print(f"Directory not found: {todo_dir}")
        return

    for fname in os.listdir(todo_dir):
        match = re.match(r'0*([0-9]+)\s+.*\.(png|jpg|jpeg)$', fname, re.IGNORECASE)
        if match:
            dex_num = int(match.group(1))
            ext = match.group(2).lower()
            new_name = f"{dex_num}.{ext}"
            src = os.path.join(todo_dir, fname)
            dst = os.path.join(todo_dir, new_name)
            if args.verbose:
                print(f"Renaming {fname} -> {new_name}")
            os.rename(src, dst)
        else:
            if args.verbose:
                print(f"Skipping {fname} (does not match pattern)")

if __name__ == '__main__':
    main()
