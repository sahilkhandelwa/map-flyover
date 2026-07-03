import requests, json, sys

# Natural Earth 1:110m countries GeoJSON - all countries simplified
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"

print("Downloading Natural Earth countries...", flush=True)
r = requests.get(URL, timeout=60)
data = r.json()

# Extract India, Iran, USA
targets = {"India", "Iran", "United States of America"}
result = {}

for feat in data["features"]:
    name = feat["properties"].get("NAME", "")
    if name in targets:
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            rings = [geom["coordinates"]]
        elif geom["type"] == "MultiPolygon":
            rings = geom["coordinates"]
        else:
            continue
        # Take the largest polygon (most points)
        largest = max(rings, key=lambda r: len(r[0]))
        # Outer ring coordinates (skip the closing point which equals the first)
        coords = largest[0][:-1]
        result[name] = coords
        print(f"  {name}: {len(coords)} points", flush=True)

# Output JS that defines the borders object
print("\n---- JS OUTPUT ----", flush=True)
js = "const NATURAL_BORDERS = {\n"
for name, coords in result.items():
    key = name.split()[0].lower()  # "India" -> "india", "Iran" -> "iran"
    if name == "United States of America":
        key = "usa"
    pts = ",\n".join([f"  [{c[1]}, {c[0]}]" for c in coords])
    js += f"  {key}: [\n{pts}\n  ],\n"
js += "};"
print(js)
