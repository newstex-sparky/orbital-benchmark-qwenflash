# Orbital Data Traffic

A jaw-dropping 3D orbital data traffic model and tracker. Realistic Earth with
day/night terminator, night lights and cloud layer, an atmosphere glow, four
satellite constellations (LEO / MEO / GEO / Sun-synchronous), ground stations,
and **comet-like data packets** streaking between nodes across the network —
all rendered in WebGL (Three.js) with high-quality bloom.

**Live:** https://newstex-sparky.github.io/orbital-benchmark-qwenflash/

## What it shows

- **Realistic Earth** — NASA-style 2048px day map, normal map, specular, cloud
  layer, city night-lights, and a Fresnel atmosphere rim glow.
- **Satellite constellations** — 23 satellites in 4 orbital shells, each with a
  distinct color, moving at human-readable orbital speeds.
- **Ground stations** — 6 up-link markers (Vandenberg, McMurdo, Tromsø, etc.).
- **Comet data packets** — additive, elongated comet streaks whose tails stream
  behind their velocity (billboarded + screen-space oriented), arcing between
  ground stations and satellites. Paced so a human can follow each packet.
- **Bloom post-processing** — UnrealBloomPass for the glow.

## Controls

- **Drag** — orbit the camera
- **Scroll** — zoom
- **Click a node** — satellite / ground-station details panel
- **Space** — pause/resume the simulation

## Run locally

```bash
cd orbital-benchmark-qwenflash
python3 -m http.server 8123
# open http://localhost:8123
```

All assets are self-hosted (no runtime CDN dependence).

## Stack

- Three.js 0.160 (self-hosted `lib/`)
- Vanilla ES modules, no build step
- GitHub Pages via the `gh-pages` branch
