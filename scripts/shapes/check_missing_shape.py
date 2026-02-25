import json

with open('public/data/pokemon_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

missing = [p for p in data if 'bulbapedia_shape' not in p]

print(f'Total Pokemon: {len(data)}')
print(f'Has bulbapedia_shape: {len(data) - len(missing)}')
print(f'Missing bulbapedia_shape: {len(missing)}')

if missing:
    print('\nPokemon missing bulbapedia_shape:')
    for p in missing:
        print(f"  {p['id']:3d}: {p['name']}")
else:
    print('\nAll Pokemon have the bulbapedia_shape field!')
