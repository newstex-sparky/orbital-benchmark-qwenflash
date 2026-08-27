// data.js — Sample orbital network dataset.
// Realistic-ish Keplerian-ish orbital parameters + a ground-station mesh,
// chosen to look correct and be readable at human speed. All values are
// illustrative sample data (not real satellite positions).

export const EARTH_RADIUS = 2.0;          // world units (visual scale)
export const SCALE = EARTH_RADIUS;        // 1 world unit ≈ 1 earth radius-ish

export const GROUND_STATIONS = [
  { name: 'Vandenberg', lat: 34.74, lon: -120.57, color: 0x7dffb0 },
  { name: 'McMurdo',    lat: -77.85, lon: 166.67, color: 0x7dffb0 },
  { name: 'Tromsø',     lat: 69.65,  lon: 18.96,  color: 0x7dffb0 },
  { name: 'Awarua',     lat: -46.00, lon: 168.30, color: 0x7dffb0 },
  { name: 'Singapore',  lat: 1.35,   lon: 103.82, color: 0x7dffb0 },
  { name: 'Mojave',     lat: 35.06,  lon: -118.16,color: 0x7dffb0 },
];

// Satellites grouped into constellations by orbital shell.
// Each orbit: { incl (deg), raan (deg), alt (earth-radii above surface), speed (rev/min),
//               phase (deg offset), count }.
export const CONSTELLATIONS = [
  {
    id: 'LEO-1', label: 'Low Earth Orbit', color: 0x5fd9ff, speedScale: 1.0,
    satellites: [
      // 8 sats, ~55deg inclination (Starlink-like), alt ~0.13R
      { name: 'LEO-A', incl: 53, raan: 0,  alt: 0.14, phase: 0 },
      { name: 'LEO-B', incl: 53, raan: 45, alt: 0.14, phase: 0 },
      { name: 'LEO-C', incl: 53, raan: 90, alt: 0.16, phase: 60 },
      { name: 'LEO-D', incl: 53, raan: 135,alt: 0.15, phase: 120 },
      { name: 'LEO-E', incl: 53, raan: 180,alt: 0.14, phase: 180 },
      { name: 'LEO-F', incl: 53, raan: 225,alt: 0.16, phase: 240 },
      { name: 'LEO-G', incl: 53, raan: 270,alt: 0.15, phase: 300 },
      { name: 'LEO-H', incl: 53, raan: 315,alt: 0.14, phase: 0 },
    ],
  },
  {
    id: 'MEO-1', label: 'Medium Earth Orbit', color: 0x8af2ff, speedScale: 0.28,
    satellites: [
      // 6 sats, ~55deg (GPS-like shell), alt ~0.5R
      { name: 'MEO-A', incl: 55, raan: 0,  alt: 0.52, phase: 0 },
      { name: 'MEO-B', incl: 55, raan: 60, alt: 0.55, phase: 45 },
      { name: 'MEO-C', incl: 55, raan: 120,alt: 0.52, phase: 90 },
      { name: 'MEO-D', incl: 55, raan: 180,alt: 0.54, phase: 135 },
      { name: 'MEO-E', incl: 55, raan: 240,alt: 0.52, phase: 180 },
      { name: 'MEO-F', incl: 55, raan: 300,alt: 0.55, phase: 225 },
    ],
  },
  {
    id: 'GEO-1', label: 'Geostationary', color: 0xc9a0ff, speedScale: 0.0,
    satellites: [
      // 4 geostationary sats over equator (incl ~0), alt ~2.1R
      { name: 'GEO-1', incl: 0, raan: 0,  alt: 2.15, phase: 0 },
      { name: 'GEO-2', incl: 0, raan: 90, alt: 2.15, phase: 0 },
      { name: 'GEO-3', incl: 0, raan: 180,alt: 2.15, phase: 0 },
      { name: 'GEO-4', incl: 0, raan: 270,alt: 2.15, phase: 0 },
    ],
  },
  {
    id: 'SSO', label: 'Sun-Synchronous', color: 0xffd9a0, speedScale: 0.75,
    satellites: [
      // 5 polar-ish sats, high inclination
      { name: 'SSO-A', incl: 97, raan: 0,   alt: 0.12, phase: 0 },
      { name: 'SSO-B', incl: 97, raan: 72,  alt: 0.12, phase: 0 },
      { name: 'SSO-C', incl: 97, raan: 144, alt: 0.12, phase: 0 },
      { name: 'SSO-D', incl: 97, raan: 216, alt: 0.12, phase: 0 },
      { name: 'SSO-E', incl: 97, raan: 288, alt: 0.12, phase: 0 },
    ],
  },
];

// Precompute a flat list of satellite descriptors with computed orbit params.
export function buildSatelliteList() {
  const list = [];
  for (const c of CONSTELLATIONS) {
    for (const s of c.satellites) {
      list.push({
        name: s.name,
        constellation: c.id,
        label: c.label,
        color: c.color,
        incl: s.incl * Math.PI / 180,
        raan: s.raan * Math.PI / 180,
        radius: EARTH_RADIUS + s.alt,
        phase: s.phase * Math.PI / 180,
        speedScale: c.speedScale,
        speed: (c.speedScale === 0 ? 0 : (0.0016 * c.speedScale)), // rad/frame @60fps → LEO full orbit ~65s
      });
    }
  }
  return list;
}

// Convert lat/lon (deg) to a point on the unit earth sphere.
export function latLonToVec3(latDeg, lonDeg, radius = EARTH_RADIUS) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const x = radius * Math.cos(lat) * Math.cos(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(lon);
  return { x, y, z };
}
