import json
from collections import Counter

# Load the JSON data
with open('./data/pokemon_data.json', encoding='utf-8') as f:
    data = json.load(f)

genus_counter = Counter()
shape_counter = Counter()
abilities_counter = Counter()
held_items_counter = Counter()

for p in data:
    # Genus
    genus = p.get('genus')
    if genus:
        genus = genus.strip()
        genus_counter[genus] += 1
    # Shape
    shape = p.get('shape')
    if shape:
        shape = shape.strip()
        shape_counter[shape] += 1
    # Abilities
    abilities = p.get('abilities', [])
    for ab in abilities:
        ab = ab.strip()
        abilities_counter[ab] += 1
    # Held Items
    held_items = p.get('held_items', [])
    for item in held_items:
        item = item.strip()
        held_items_counter[item] += 1

print('Genus counts:')
for genus, count in genus_counter.most_common():
    print(f'{genus}: {count}')

print('\nShape counts:')
for shape, count in shape_counter.most_common():
    print(f'{shape}: {count}')

print('\nAbilities counts:')
for ab, count in abilities_counter.most_common():
    print(f'{ab}: {count}')

print('\nHeld Items counts:')
for item, count in held_items_counter.most_common():
    print(f'{item}: {count}')
