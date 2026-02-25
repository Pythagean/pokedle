import requests
from bs4 import BeautifulSoup

response = requests.get('https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_shape')
soup = BeautifulSoup(response.content, 'html.parser')

# Find the "List of shapes" heading
print("Looking for 'List of shapes' heading...")
for heading in soup.find_all(['h2', 'h3', 'h4']):
    heading_text = heading.get_text(strip=True)
    if 'shape' in heading_text.lower():
        print(f"\nFound heading: {heading_text}")
        print(f"Tag: {heading.name}")
        
        # Look at next elements
        current = heading.find_next_sibling()
        for i in range(5):
            if current:
                print(f"  Next sibling {i}: {current.name} - {current.get_text(strip=True)[:80]}")
                
                if current.name == 'table':
                    print("\n  TABLE FOUND! Inspecting...")
                    rows = current.find_all('tr')[:5]
                    for j, row in enumerate(rows):
                        cells = row.find_all(['td', 'th'])
                        print(f"    Row {j}: {len(cells)} cells")
                        for k, cell in enumerate(cells):
                            text = cell.get_text(strip=True)[:60]
                            print(f"      Cell {k}: {text}")
                
                current = current.find_next_sibling()
