import json
import csv

# Load the JSON data
with open('./data/pokemon_data.json', encoding='utf-8') as f:
    data = json.load(f)

# Prepare CSV output
with open('pokemon_id_name_colour.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['id', 'name', 'colour'])
    for p in data:
        writer.writerow([p.get('id', ''), p.get('name', ''), p.get('color', '')])

print('Exported pokemon_id_name_colour.csv')
