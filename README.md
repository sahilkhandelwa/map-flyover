# Map Flyover Animation

Three interactive map flyover animations using Mapbox GL JS.

## Styles
| File | Style | Description |
|---|---|---|
| `streets.html` | Mapbox Streets | Roads, labels, colorful |
| `satellite.html` | Mapbox Satellite | Real aerial imagery |
| `outdoors.html` | Mapbox Outdoors | Topographic, terrain |

## Route
**India → Iran → USA** (smooth 4s fly-through, 3s hold each, loops)

## Setup
1. Copy `config.example.js` → `config.js`
2. Replace `YOUR_MAPBOX_TOKEN_HERE` with your free token from [mapbox.com](https://account.mapbox.com/)
3. Open any `.html` in a browser (internet required)

## Timing
- Each country: 3 seconds hold
- Fly transition: 4 seconds
- Total loop: ~21 seconds
