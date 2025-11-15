import os
import csv
import re
import json

# Folders to check
folders = {
    'Normal': 'data/cards_normal',
    'Full Art': 'data/cards_full_art',
    'Mega': 'data/cards_mega',
    'Shiny': 'data/cards_shiny',
    'Special': 'data/cards_special',
}

# Load pokemon data for id->name mapping
with open('data/pokemon_data.json', encoding='utf-8') as f:
    pokemon_data = json.load(f)
    id_to_name = {str(p['id']): p['name'] for p in pokemon_data}

# Build a dict: {id: {type: count}}
summary = {}
pattern = re.compile(r'^(\d+)-\d+\.jpg$', re.IGNORECASE)

for card_type, folder in folders.items():
    if not os.path.isdir(folder):
        continue
    for fname in os.listdir(folder):
        m = pattern.match(fname)
        if not m:
            continue
        poke_id = m.group(1)
        if poke_id not in summary:
            summary[poke_id] = {k: 0 for k in folders}
        summary[poke_id][card_type] += 1

# Write CSV
with open('card_summary.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['Pokemon ID', 'Pokemon Name', 'Normal', 'Full Art', 'Mega', 'Shiny', 'Special'])
    for poke_id in sorted(summary, key=lambda x: int(x)):
        name = id_to_name.get(poke_id, '')
        row = [poke_id, name]
        for k in ['Normal', 'Full Art', 'Mega', 'Shiny', 'Special']:
            row.append(summary[poke_id][k])
        writer.writerow(row)
print('Wrote card_summary.csv')
