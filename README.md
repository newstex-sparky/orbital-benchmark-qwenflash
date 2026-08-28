# Solar System — Full-Scale Model

A high-fidelity, full-scale 3D model of our solar system built with Three.js
WebGL. Real orbital data, high-resolution planet textures, moon systems, and a
dropdown to navigate between the full system and individual planets.

**Live:** https://newstex-sparky.github.io/orbital-benchmark-qwenflash/

## Features

- **Real orbital data** — J2000 mean elements (semi-major axis, eccentricity,
  inclination, orbital period) for all 8 planets and 5 dwarf planets, from
  NASA/JPL and Sky & Telescope.
- **High-fidelity textures** — 2K NASA-derived planet maps (Solar System Scope,
  CC BY 4.0) for Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune,
  and the Moon. Saturn has its ring system.
- **Moon systems** — Earth's Moon, Mars' Phobos & Deimos, Jupiter's 4 Galilean
  moons, Saturn's 7 major moons, Uranus' 5 major moons, Neptune's Triton, and
  Pluto's Charon — each orbiting its planet on real orbital periods.
- **Dropdown navigation** — select any planet or dwarf planet to fly the camera
  to it and see its moons; select "Full Solar System" to zoom out to the whole
  system with orbits around the Sun.
- **Asteroid belt** — 1,200 particles between Mars and Jupiter.
- **Bloom post-processing** — UnrealBloomPass for the Sun's glow and planet
  halos.
- **Keplerian orbits** — planets follow real elliptical orbits (solved via
  Kepler's equation), not simple circles.

## Controls

- **Dropdown (top-right)** — navigate between the full system and individual
  planets/dwarf planets
- **Drag** — orbit the camera
- **Scroll** — zoom
- **Click a body** — planet / moon / dwarf-planet details panel
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

## Data sources

- NASA/JPL planetary factsheet (orbital elements, radii, periods)
- Sky & Telescope "Moons of the Solar System" (moon orbital data)
- Solar System Scope textures (CC BY 4.0, NASA-derived)
