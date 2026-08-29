// appearance.js — Distinct visual recipe for every planet, moon, dwarf, and
// asteroid. Each body gets a unique procedural texture + optional atmosphere
// and/or polar auroras so no two look alike.
import { generateTexture, getBodyTexture, addAtmosphere, addAurora } from './textures.js';

// Returns { texture, atmosphere, aurora } for a body name.
// texture: THREE.Texture (procedural) or null (use real map file).
// atmosphere: { color, intensity, scale } or null.
// aurora: { color, intensity, radiusScale } or null.
export function bodyAppearance(name) {
  const cfg = RECIPES[name];
  if (!cfg) return { texture: null, atmosphere: null, aurora: null };
  const texture = cfg.texture
    ? getBodyTexture('body_' + name, () => generateTexture(cfg.texture))
    : null;
  return {
    texture,
    atmosphere: cfg.atmosphere || null,
    aurora: cfg.aurora || null,
  };
}

// ---------- recipes ----------
const RECIPES = {
  // ===== Planets =====
  Mercury: {
    texture: { type: 'rocky', base: '#8a8070', seed: 11, noiseScale: 7, craters: { scale: 9, thresh: 0.72, strength: 0.5 } },
  },
  Venus: {
    texture: { type: 'cloud', base: '#c8a06a', seed: 22, noiseScale: 5 },
    atmosphere: { color: 0xffd9a0, intensity: 0.35, scale: 1.05 },
  },
  Earth: {
    // real texture used in main.js; add atmosphere + auroras here
    atmosphere: { color: 0x5fa8ff, intensity: 0.5, scale: 1.06 },
    aurora: { color: 0x66ffcc, intensity: 0.5, radiusScale: 1.2 },
  },
  Mars: {
    texture: { type: 'rocky', base: '#b05a30', seed: 33, noiseScale: 6, craters: { scale: 7, thresh: 0.75, strength: 0.4 }, polarCap: '#e8e8e8', polarCapLat: 0.82, polarCapStrength: 0.9 },
    atmosphere: { color: 0xd97a4a, intensity: 0.12, scale: 1.02 },
  },
  Jupiter: {
    texture: {
      type: 'gas', base: '#b08050', seed: 44, turbulence: 0.6,
      bands: [
        { lat: -1.0, color: '#a87848' }, { lat: -0.7, color: '#d8c8a0' },
        { lat: -0.45, color: '#906840' }, { lat: -0.2, color: '#d8c8a0' },
        { lat: 0.0, color: '#a87848' }, { lat: 0.25, color: '#d8c8a0' },
        { lat: 0.5, color: '#906840' }, { lat: 0.75, color: '#d8c8a0' },
        { lat: 1.0, color: '#a87848' },
      ],
      spot: { lon: 0.35, lat: -0.25, color: '#a04028', strength: 0.9 },
      polarDark: 0.25,
    },
  },
  Saturn: {
    texture: {
      type: 'gas', base: '#c8b878', seed: 55, turbulence: 0.35,
      bands: [
        { lat: -1.0, color: '#c8b878' }, { lat: -0.6, color: '#d8d0a8' },
        { lat: -0.3, color: '#b0a068' }, { lat: 0.0, color: '#d8d0a8' },
        { lat: 0.3, color: '#b0a068' }, { lat: 0.6, color: '#d8d0a8' },
        { lat: 1.0, color: '#c8b878' },
      ],
      polarDark: 0.15,
    },
  },
  Uranus: {
    texture: { type: 'ice', base: '#78b8c8', seed: 66, noiseScale: 4, cracks: { color: '#58a0b8', scale: 6, thresh: 0.8, strength: 0.3 } },
    atmosphere: { color: 0x9ad8e8, intensity: 0.3, scale: 1.04 },
  },
  Neptune: {
    texture: {
      type: 'gas', base: '#3a58a8', seed: 77, turbulence: 0.8,
      bands: [
        { lat: -1.0, color: '#2a48a0' }, { lat: -0.5, color: '#3a58a8' },
        { lat: 0.0, color: '#4a68c0' }, { lat: 0.5, color: '#3a58a8' },
        { lat: 1.0, color: '#2a48a0' },
      ],
      spot: { lon: 0.6, lat: 0.3, color: '#1a2a68', strength: 0.8 },
      polarDark: 0.2,
    },
    atmosphere: { color: 0x5a7ad8, intensity: 0.3, scale: 1.04 },
  },

  // ===== Moons =====
  Moon: { texture: { type: 'rocky', base: '#b0b0b0', seed: 101, noiseScale: 6, craters: { scale: 8, thresh: 0.7, strength: 0.5 }, maria: { color: '#5a5a5a', thresh: 0.6, strength: 0.7 } } },
  Phobos: { texture: { type: 'rocky', base: '#6a5a4a', seed: 102, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
  Deimos: { texture: { type: 'rocky', base: '#8a7a6a', seed: 103, noiseScale: 7, craters: { scale: 9, thresh: 0.72, strength: 0.4 } } },
  Io: { texture: { type: 'sulfur', base: '#e8c850', seed: 104, spots: { color: '#8a3a1a', thresh: 0.7, strength: 0.8 } } },
  Europa: { texture: { type: 'ice', base: '#e8e0d0', seed: 105, noiseScale: 5, cracks: { color: '#a08060', scale: 7, thresh: 0.65, strength: 0.6 } } },
  Ganymede: { texture: { type: 'rocky', base: '#8a7a6a', seed: 106, noiseScale: 5, craters: { scale: 6, thresh: 0.72, strength: 0.4 }, maria: { color: '#4a4a4a', thresh: 0.62, strength: 0.5 } } },
  Callisto: { texture: { type: 'rocky', base: '#6a5a4a', seed: 107, noiseScale: 5, craters: { scale: 6, thresh: 0.68, strength: 0.6 } } },
  Mimas: { texture: { type: 'ice', base: '#d8d8d8', seed: 108, noiseScale: 6, craters: { scale: 8, thresh: 0.75, strength: 0.5 } } },
  Enceladus: { texture: { type: 'ice', base: '#f0f0f0', seed: 109, noiseScale: 6, cracks: { color: '#b0d8e8', scale: 8, thresh: 0.7, strength: 0.4 } } },
  Tethys: { texture: { type: 'ice', base: '#e0e0e0', seed: 110, noiseScale: 5, craters: { scale: 7, thresh: 0.72, strength: 0.4 } } },
  Dione: { texture: { type: 'ice', base: '#d8d0c8', seed: 111, noiseScale: 5, craters: { scale: 7, thresh: 0.72, strength: 0.4 } } },
  Rhea: { texture: { type: 'ice', base: '#d0d0d0', seed: 112, noiseScale: 5, craters: { scale: 7, thresh: 0.72, strength: 0.4 } } },
  Titan: { texture: { type: 'cloud', base: '#d8a050', seed: 113, noiseScale: 4 }, atmosphere: { color: 0xd8a050, intensity: 0.4, scale: 1.05 } },
  Iapetus: { texture: { type: 'twotone', base: '#e8e0d0', seed: 114, dark: '#3a3a3a' } },
  Miranda: { texture: { type: 'rocky', base: '#9a9a9a', seed: 115, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Ariel: { texture: { type: 'ice', base: '#c8d8d8', seed: 116, noiseScale: 5, cracks: { color: '#8a9a9a', scale: 7, thresh: 0.7, strength: 0.4 } } },
  Umbriel: { texture: { type: 'ice', base: '#6a6a6a', seed: 117, noiseScale: 5, craters: { scale: 7, thresh: 0.7, strength: 0.5 } } },
  Titania: { texture: { type: 'ice', base: '#c8c0b8', seed: 118, noiseScale: 5, craters: { scale: 7, thresh: 0.72, strength: 0.4 } } },
  Oberon: { texture: { type: 'ice', base: '#8a8a8a', seed: 119, noiseScale: 5, craters: { scale: 7, thresh: 0.7, strength: 0.5 } } },
  Proteus: { texture: { type: 'rocky', base: '#5a5a5a', seed: 120, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Triton: { texture: { type: 'ice', base: '#e8d8d0', seed: 121, noiseScale: 5, cracks: { color: '#c8a8a0', scale: 7, thresh: 0.7, strength: 0.4 } } },
  Nereid: { texture: { type: 'rocky', base: '#8a8a8a', seed: 122, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Charon: { texture: { type: 'rocky', base: '#9a8a7a', seed: 123, noiseScale: 6, craters: { scale: 8, thresh: 0.72, strength: 0.4 } } },
  Nix: { texture: { type: 'rocky', base: '#8a8a8a', seed: 124, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Hydra: { texture: { type: 'rocky', base: '#7a7a7a', seed: 125, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },

  // ===== Dwarf planets =====
  Ceres: { texture: { type: 'rocky', base: '#8a8a8a', seed: 201, noiseScale: 6, craters: { scale: 8, thresh: 0.7, strength: 0.5 } } },
  Pluto: { texture: { type: 'rocky', base: '#c8a878', seed: 202, noiseScale: 5, craters: { scale: 7, thresh: 0.75, strength: 0.3 }, maria: { color: '#8a6a4a', thresh: 0.6, strength: 0.5 }, polarCap: '#e8e0d0', polarCapLat: 0.8, polarCapStrength: 0.8 } },
  Haumea: { texture: { type: 'ice', base: '#b8b8c8', seed: 203, noiseScale: 5, cracks: { color: '#8a8a9a', scale: 7, thresh: 0.7, strength: 0.4 } } },
  Makemake: { texture: { type: 'rocky', base: '#d8a878', seed: 204, noiseScale: 5, craters: { scale: 7, thresh: 0.72, strength: 0.4 } } },
  Eris: { texture: { type: 'ice', base: '#d8d8e8', seed: 205, noiseScale: 5, cracks: { color: '#b0b0c8', scale: 7, thresh: 0.7, strength: 0.4 } } },

  // ===== Asteroids =====
  Vesta: { texture: { type: 'rocky', base: '#b8a898', seed: 301, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Pallas: { texture: { type: 'rocky', base: '#9a9a9a', seed: 302, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Hygiea: { texture: { type: 'rocky', base: '#8a8a8a', seed: 303, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Psyche: { texture: { type: 'rocky', base: '#9a8a7a', seed: 304, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.4 } } },
  Juno: { texture: { type: 'rocky', base: '#b8a888', seed: 305, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Eunomia: { texture: { type: 'rocky', base: '#9a9a9a', seed: 306, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Davida: { texture: { type: 'rocky', base: '#8a8a8a', seed: 307, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Interamnia: { texture: { type: 'rocky', base: '#9a9a9a', seed: 308, noiseScale: 7, craters: { scale: 9, thresh: 0.7, strength: 0.5 } } },
  Eros: { texture: { type: 'rocky', base: '#8a7a6a', seed: 309, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
  Apophis: { texture: { type: 'rocky', base: '#7a7a7a', seed: 310, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
  Bennu: { texture: { type: 'rocky', base: '#6a6a6a', seed: 311, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
  Gaspra: { texture: { type: 'rocky', base: '#8a7a6a', seed: 312, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
  Ida: { texture: { type: 'rocky', base: '#8a7a6a', seed: 313, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
  Itokawa: { texture: { type: 'rocky', base: '#7a6a5a', seed: 314, noiseScale: 8, craters: { scale: 10, thresh: 0.7, strength: 0.5 } } },
};
