import requests
from bs4 import BeautifulSoup

response = requests.get('https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_footprint')
soup = BeautifulSoup(response.content, 'html.parser')

# Find all tables
tables = soup.find_all('table')
print(f'Found {len(tables)} tables\n')

for i, table in enumerate(tables[:15]):
    classes = table.get('class', [])
    print(f'Table {i}: classes={classes}')
    
    # Get first row to see headers
    first_row = table.find('tr')
    if first_row:
        headers = first_row.find_all(['th', 'td'])
        header_text = [h.get_text(strip=True)[:30] for h in headers[:8]]
        print(f'  First row: {header_text}')
    print()
