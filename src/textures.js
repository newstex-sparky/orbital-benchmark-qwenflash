// textures.js — Procedural, distinct surface textures for every body.
// Generates realistic equirectangular canvas textures (rocky, gas, ice,
// sulfur, cloud, two-tone) so no two planets/moons look alike. Also exports
// helpers for atmosphere glow and polar auroras.
import * as THREE from 'three';

// ---------- deterministic PRNG ----------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- value noise ----------
function makeNoise(seed, size = 256) {
  const rand = mulberry32(seed);
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const smooth = (t) => t * t * (3 - 2 * t);
  function at(x, y) {
    x = ((x % size) + size) % size;
    y = ((y % size) + size) % size;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x1 = xi % size, x2 = (xi + 1) % size, y1 = yi % size, y2 = (yi + 1) % size;
    const a = grid[y1 * size + x1], b = grid[y1 * size + x2];
    const c = grid[y2 * size + x1], d = grid[y2 * size + x2];
    const u = smooth(xf), v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  return at;
}

// fractal Brownian motion
function fbm(noise, x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / norm;
}

// ---------- color helpers ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function mix(a, b, t) {
  t = clamp01(t);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function shade(c, amt) {
  return [clamp01(c[0] * amt), clamp01(c[1] * amt), clamp01(c[2] * amt)];
}
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
}

// ---------- texture cache ----------
const _cache = {};
export function getBodyTexture(key, gen) {
  if (!_cache[key]) _cache[key] = gen();
  return _cache[key];
}

// ---------- main generator ----------
// cfg: { type, base, seed, ...type-specific }
export function generateTexture(cfg) {
  const W = cfg.width || 512;
  const H = W / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const noise = makeNoise(cfg.seed || 1);
  const noise2 = makeNoise((cfg.seed || 1) + 999);

  const base = hexToRgb(cfg.base);
  const polarCap = cfg.polarCap ? hexToRgb(cfg.polarCap) : null;
  const polarCapLat = cfg.polarCapLat || 0.78; // latitude (0=equator,1=pole) where cap starts

  for (let y = 0; y < H; y++) {
    // latitude: -1 (south pole) .. 1 (north pole)
    const lat = 1 - (2 * y) / H;
    const latAbs = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * 2 * Math.PI;
      const u = x / W;
      let r, g, b;

      switch (cfg.type) {
        case 'rocky': {
          // fBm terrain with craters + optional maria + polar caps
          const n = fbm(noise, u * cfg.noiseScale || 6, lat * 3 + 0.5, 5);
          const n2 = fbm(noise2, u * 3, lat * 2 + 0.5, 3);
          let c = mix(base, shade(base, 0.55 + n * 0.9), 0.85);
          // maria (dark basaltic regions) — e.g. Moon
          if (cfg.maria) {
            const m = fbm(noise2, u * 2.2 + 7, lat * 1.8 + 3, 4);
            if (m > cfg.maria.thresh) c = mix(c, hexToRgb(cfg.maria.color), (m - cfg.maria.thresh) * cfg.maria.strength);
          }
          // craters
          if (cfg.craters) {
            const cr = fbm(noise, u * cfg.craters.scale, lat * cfg.craters.scale * 0.5 + 1, 4);
            if (cr > cfg.craters.thresh) c = mix(c, shade(c, 0.6), (cr - cfg.craters.thresh) * cfg.craters.strength);
          }
          // polar caps
          if (polarCap && latAbs > polarCapLat) {
            const t = clamp01((latAbs - polarCapLat) / (1 - polarCapLat));
            c = mix(c, polarCap, t * (cfg.polarCapStrength || 1));
          }
          r = c[0]; g = c[1]; b = c[2];
          break;
        }
        case 'gas': {
          // horizontal bands warped by turbulence + optional spot + polar darkening
          const bands = cfg.bands || [];
          const turb = fbm(noise, u * 4, lat * 6, 4) * (cfg.turbulence || 0.5);
          const bandPos = lat + turb * 0.5;
          // find band color
          let c = base;
          for (const bd of bands) {
            if (bandPos < bd.lat) { c = hexToRgb(bd.color); break; }
          }
          // subtle in-band variation
          const v = fbm(noise2, u * 8, lat * 10, 4);
          c = mix(c, shade(c, 0.8 + v * 0.4), 0.5);
          // Great Red Spot / storm
          if (cfg.spot) {
            const dx = (u - cfg.spot.lon) * 6;
            const dy = (lat - cfg.spot.lat) * 8;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 1) {
              const t = 1 - d;
              c = mix(c, hexToRgb(cfg.spot.color), t * t * cfg.spot.strength);
            }
          }
          // polar darkening (gas giants have darker poles)
          if (cfg.polarDark) {
            const t = Math.pow(latAbs, 2);
            c = mix(c, shade(c, 0.7), t * cfg.polarDark);
          }
          r = c[0]; g = c[1]; b = c[2];
          break;
        }
        case 'ice': {
          // bright ice with subtle cracks/ridges
          const n = fbm(noise, u * cfg.noiseScale || 8, lat * 4 + 0.5, 5);
          let c = mix(base, shade(base, 0.85 + n * 0.3), 0.7);
          if (cfg.cracks) {
            const cr = fbm(noise2, u * cfg.cracks.scale, lat * cfg.cracks.scale * 0.5, 4);
            if (cr > cfg.cracks.thresh) c = mix(c, hexToRgb(cfg.cracks.color), (cr - cfg.cracks.thresh) * cfg.cracks.strength);
          }
          r = c[0]; g = c[1]; b = c[2];
          break;
        }
        case 'sulfur': {
          // Io: yellow-orange sulfur plains with dark volcanic spots
          const n = fbm(noise, u * 5, lat * 3 + 0.5, 5);
          let c = mix(base, shade(base, 0.7 + n * 0.6), 0.8);
          if (cfg.spots) {
            const s = fbm(noise2, u * 3 + 5, lat * 2 + 2, 4);
            if (s > cfg.spots.thresh) c = mix(c, hexToRgb(cfg.spots.color), (s - cfg.spots.thresh) * cfg.spots.strength);
          }
          r = c[0]; g = c[1]; b = c[2];
          break;
        }
        case 'cloud': {
          // Venus/Titan: thick swirling cloud deck
          const n = fbm(noise, u * 4, lat * 3 + 0.5, 6);
          const swirl = fbm(noise2, u * 6 + n * 2, lat * 4 + n, 4);
          let c = mix(base, shade(base, 0.7 + swirl * 0.6), 0.8);
          r = c[0]; g = c[1]; b = c[2];
          break;
        }
        case 'twotone': {
          // Iapetus: bright trailing hemisphere, dark leading
          const leading = lon > Math.PI * 0.5 && lon < Math.PI * 1.5;
          const n = fbm(noise, u * 5, lat * 3 + 0.5, 5);
          let c = leading ? hexToRgb(cfg.dark) : base;
          c = mix(c, shade(c, 0.8 + n * 0.4), 0.6);
          r = c[0]; g = c[1]; b = c[2];
          break;
        }
        default: {
          r = base[0]; g = base[1]; b = base[2];
        }
      }

      const idx = (y * W + x) * 4;
      data[idx] = Math.round(r * 255);
      data[idx + 1] = Math.round(g * 255);
      data[idx + 2] = Math.round(b * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// ---------- atmosphere glow ----------
// A slightly-larger BackSide sphere that gives a soft atmospheric rim.
export function addAtmosphere(mesh, color, intensity = 0.5, scale = 1.06) {
  const r = mesh.geometry.parameters.radius;
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: intensity,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const atm = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 32, 32), mat);
  mesh.add(atm);
  return atm;
}

// ---------- polar auroras ----------
// Two additive glowing sprites at the poles that gently pulse.
export function addAurora(mesh, color, intensity = 0.5, radiusScale = 1.15) {
  const r = mesh.geometry.parameters.radius;
  const sprites = [];
  for (const pole of [1, -1]) {
    const mat = new THREE.SpriteMaterial({
      map: makeAuroraGlow(color), color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: intensity,
    });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(r * radiusScale * 2.2);
    s.position.set(0, pole * r * 0.95, 0);
    s.userData.baseOpacity = intensity;
    mesh.add(s);
    sprites.push(s);
  }
  return sprites;
}

// radial glow texture for aurora sprites
let _auroraGlow = null;
function makeAuroraGlow(color) {
  if (_auroraGlow) return _auroraGlow;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _auroraGlow = new THREE.CanvasTexture(canvas);
  return _auroraGlow;
}
