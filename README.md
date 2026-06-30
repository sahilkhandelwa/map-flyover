# Map Flyover Animation

Three interactive map flyover animations using **Mapbox GL JS**.  
**India → Iran → USA** — smooth fly-through with 3s hold each.

## Styles
| File | Style |
|---|---|
| `streets.html` | Mapbox Streets — roads, labels, colorful |
| `satellite.html` | Mapbox Satellite — real aerial imagery |
| `outdoors.html` | Mapbox Outdoors — topographic with terrain |

## Run Locally
1. Copy `config.example.js` → `config.js`
2. Add your free token from [mapbox.com](https://account.mapbox.com/)
3. Open any `.html` in a browser

## Render MP4 Videos (GitHub Actions)
1. Go to repo **Settings → Secrets and variables → Actions**
2. Add a secret named `MAPBOX_TOKEN` with your Mapbox token
3. Go to **Actions → Render Map Flyover Videos → Run workflow**
4. Wait ~5 min, download the 3 MP4s from the artifact

## Timing
- t=0s: Map loads on India
- t=3s: India label appears
- t=10s: Fly to Iran (4s)
- t=17s: Fly to USA (4s)
- Loops back after USA
