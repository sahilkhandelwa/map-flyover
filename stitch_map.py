import os
import requests
import sys
from PIL import Image
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor

# Zoom level 5 (8192x8192, ~50MB, high quality for country/city views)
ZOOM = 5
TILES_PER_SIDE = 2**ZOOM
TILE_SIZE = 256
IMG_SIZE = TILES_PER_SIDE * TILE_SIZE

print(f"Creating a {IMG_SIZE}x{IMG_SIZE} pixel image using parallel threads...", flush=True)
output_img = Image.new('RGB', (IMG_SIZE, IMG_SIZE))

URL_TEMPLATE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

def fetch_tile(coords):
    y, x = coords
    url = URL_TEMPLATE.format(z=ZOOM, y=y, x=x)
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            return (y, x, Image.open(BytesIO(response.content)))
    except Exception as e:
        print(f"Error {y}/{x}: {e}", flush=True)
    return (y, x, None)

coords_list = [(y, x) for y in range(TILES_PER_SIDE) for x in range(TILES_PER_SIDE)]

# Use 20 threads to speed up downloading
with ThreadPoolExecutor(max_workers=20) as executor:
    results = list(executor.map(fetch_tile, coords_list))

for y, x, tile in results:
    if tile:
        output_img.paste(tile, (x * TILE_SIZE, y * TILE_SIZE))

output_img.save("world_map.png")
print("Finished: world_map.png", flush=True)
