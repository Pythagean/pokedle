Run the build_related_urls.py script to pull location urls for each Generation:

python .\build_related_urls.py --page-url https://bulbapedia.bulbagarden.net/wiki/Celadon_City --output ./gen1.txt
python .\build_related_urls.py --page-url https://bulbapedia.bulbagarden.net/wiki/New_Bark_Town --output ./gen2.txt
python .\build_related_urls.py --page-url https://bulbapedia.bulbagarden.net/wiki/Sky_Pillar --output ./gen3.txt

Compile them into 1 file, called location_urls.txt


Run the scrape_location_encounters script to pull pokemon data from the location web pages and output into csv

python .\scrape_location_encounters.py --input-urls .\location_urls.txt --output-csv encounters.csv --input-json ..\..\public\data\pokemon_data.json


python .\csv_to_json_encounters.py --input-csv .\encounters.csv --output-json ./encounters.json --pokemon-json ..\..\public\data\pokemon_data.json


python .\merge_encounters_into_pokemon_data.py --pokemon-json ..\..\public\data\pokemon_data.json --encounters-json .\encounters.json --output ..\..\public\data\pokemon_data_new.json


