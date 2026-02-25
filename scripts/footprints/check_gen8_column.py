import requests
from bs4 import BeautifulSoup

response = requests.get('https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_footprint')
soup = BeautifulSoup(response.content, 'html.parser')

# Find the first roundtable
table = soup.find('table', class_='roundtable')

if table:
    # Get headers
    header_row = table.find('tr')
    headers = header_row.find_all('th')
    
    print(f'Found {len(headers)} headers:')
    for i, h in enumerate(headers):
        text = h.get_text(strip=True)
        print(f'  Column {i}: "{text}"')
    
    # Check for Gen VIII
    gen_viii_index = None
    for i, header in enumerate(headers):
        header_text = header.get_text(strip=True)
        if 'VIII' in header_text:
            gen_viii_index = i
            print(f'\nFound Gen VIII at index: {i}')
            break
    
    if gen_viii_index is None:
        print('\nGen VIII column not found!')
    
    # Check first few data rows
    print('\nFirst 3 data rows:')
    rows = table.find_all('tr')[1:4]
    for row_num, row in enumerate(rows):
        cells = row.find_all('td')
        print(f'  Row {row_num}: {len(cells)} cells')
        if len(cells) > 2:
            name_text = cells[2].get_text(strip=True) if len(cells) > 2 else 'N/A'
            print(f'    Pokemon: {name_text}')
            if gen_viii_index and len(cells) > gen_viii_index:
                img = cells[gen_viii_index].find('img')
                if img:
                    print(f'    Gen VIII image: {img.get("src", "N/A")[:80]}')
