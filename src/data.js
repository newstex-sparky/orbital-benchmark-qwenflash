// data.js — Real solar system orbital data (J2000 mean elements).
// Sources: NASA/JPL planetary factsheet, Sky & Telescope moon tables,
// Solar System Scope textures. Distances in AU (planets) and km (moons).

// ---- Scale model parameters ----
// Orbital distances are compressed so the whole system fits on screen while
// preserving relative ordering. Planet sizes are exaggerated vs. true scale
// (real planets are invisible at orbital scale) but keep correct relative
// proportions. Moon orbits are compressed relative to their planet.
export const AU_SCALE = 2.0;          // 1 AU -> world units
export const PLANET_SIZE_SCALE = 0.4; // Earth radius in world units
export const MOON_ORBIT_COMPRESS = 0.4; // moon orbit compression factor
export const SUN_RADIUS = 1.6;        // world units

// ---- Planets ----
// a: semi-major axis (AU), e: eccentricity, i: inclination (deg),
// period: sidereal orbital period (days), radius: equatorial radius (km),
// rotPeriod: rotation period (hours, negative = retrograde),
// color: base tint for the glow, texture: map file.
export const PLANETS = [
  {
    name: 'Mercury', a: 0.387, e: 0.2056, i: 7.005, period: 87.969,
    radius: 2439.7, rotPeriod: 1407.6, color: 0x9a8f7a, texture: 'mercury.jpg',
    info: 'Smallest planet, cratered, extreme temperature swings.',
  },
  {
    name: 'Venus', a: 0.723, e: 0.0068, i: 3.3947, period: 224.701,
    radius: 6051.8, rotPeriod: -5832.5, color: 0xe8c07a, texture: 'venus.jpg',
    info: 'Thick CO2 atmosphere, hottest planet, retrograde rotation.',
  },
  {
    name: 'Earth', a: 1.0, e: 0.0167, i: 0.0, period: 365.256,
    radius: 6371.0, rotPeriod: 23.93, color: 0x5fa8ff, texture: 'earth_atmos_2048.jpg',
    info: 'Our home — the only known world with life.',
  },
  {
    name: 'Mars', a: 1.524, e: 0.0934, i: 1.851, period: 686.98,
    radius: 3389.5, rotPeriod: 24.62, color: 0xd97a4a, texture: 'mars.jpg',
    info: 'The Red Planet, home to Olympus Mons and Valles Marineris.',
  },
  {
    name: 'Jupiter', a: 5.203, e: 0.0484, i: 1.305, period: 4332.589,
    radius: 69911.0, rotPeriod: 9.93, color: 0xd8a06a, texture: 'jupiter.jpg',
    info: 'Largest planet — a gas giant with the Great Red Spot.',
  },
  {
    name: 'Saturn', a: 9.537, e: 0.0542, i: 2.484, period: 10759.22,
    radius: 58232.0, rotPeriod: 10.66, color: 0xe8d8a0, texture: 'saturn.jpg',
    info: 'Ringed gas giant, lowest density — would float in water.',
  },
  {
    name: 'Uranus', a: 19.191, e: 0.0472, i: 0.77, period: 30688.5,
    radius: 25362.0, rotPeriod: -17.24, color: 0x9ad8e8, texture: 'uranus.jpg',
    info: 'Ice giant tilted 98° — rolls around the Sun on its side.',
  },
  {
    name: 'Neptune', a: 30.069, e: 0.0086, i: 1.769, period: 60182.0,
    radius: 24622.0, rotPeriod: 16.11, color: 0x5a7ad8, texture: 'neptune.jpg',
    info: 'Farthest planet, supersonic winds, deep blue methane.',
  },
];

// ---- Moons ----
// host: planet name, a: semi-major axis (km), period: days, e: eccentricity,
// radius: km. Only the major/notable moons are included for readability.
export const MOONS = {
  Earth: [
    { name: 'Moon', a: 384400, period: 27.32, e: 0.055, radius: 1737.4 },
  ],
  Mars: [
    { name: 'Phobos', a: 9380, period: 0.32, e: 0.015, radius: 11.1 },
    { name: 'Deimos', a: 23460, period: 1.26, e: 0.000, radius: 6.2 },
  ],
  Jupiter: [
    { name: 'Io', a: 421800, period: 1.77, e: 0.004, radius: 1821.6 },
    { name: 'Europa', a: 671100, period: 3.55, e: 0.009, radius: 1560.8 },
    { name: 'Ganymede', a: 1070400, period: 7.15, e: 0.001, radius: 2634.1 },
    { name: 'Callisto', a: 1882700, period: 16.69, e: 0.007, radius: 2410.3 },
  ],
  Saturn: [
    { name: 'Mimas', a: 186000, period: 0.94, e: 0.020, radius: 198.2 },
    { name: 'Enceladus', a: 238400, period: 1.37, e: 0.005, radius: 252.1 },
    { name: 'Tethys', a: 295000, period: 1.89, e: 0.001, radius: 531.1 },
    { name: 'Dione', a: 377700, period: 2.74, e: 0.002, radius: 561.4 },
    { name: 'Rhea', a: 527200, period: 4.52, e: 0.001, radius: 763.8 },
    { name: 'Titan', a: 1221900, period: 15.95, e: 0.029, radius: 2574.7 },
    { name: 'Iapetus', a: 3561700, period: 79.33, e: 0.028, radius: 734.5 },
  ],
  Uranus: [
    { name: 'Miranda', a: 129900, period: 1.41, e: 0.001, radius: 235.8 },
    { name: 'Ariel', a: 190900, period: 2.52, e: 0.001, radius: 578.9 },
    { name: 'Umbriel', a: 266000, period: 4.14, e: 0.004, radius: 584.7 },
    { name: 'Titania', a: 436300, period: 8.71, e: 0.001, radius: 788.9 },
    { name: 'Oberon', a: 583500, period: 13.46, e: 0.001, radius: 761.4 },
  ],
  Neptune: [
    { name: 'Proteus', a: 117600, period: 1.12, e: 0.000, radius: 210.0 },
    { name: 'Triton', a: 354800, period: 5.88, e: 0.000, radius: 1353.4 },
    { name: 'Nereid', a: 5504000, period: 360.1, e: 0.749, radius: 170.0 },
  ],
  Pluto: [
    { name: 'Charon', a: 19600, period: 6.39, e: 0.000, radius: 606.0 },
    { name: 'Nix', a: 48700, period: 24.86, e: 0.000, radius: 22.5 },
    { name: 'Hydra', a: 64700, period: 38.2, e: 0.006, radius: 22.5 },
  ],
};

// ---- Dwarf planets (for the full-system view) ----
export const DWARF_PLANETS = [
  { name: 'Ceres', a: 2.77, e: 0.076, i: 10.59, period: 1680.5, radius: 473.0, color: 0x8a8a8a },
  { name: 'Pluto', a: 39.482, e: 0.2488, i: 17.14, period: 90560.0, radius: 1188.3, color: 0xc8a878 },
  { name: 'Haumea', a: 43.34, e: 0.189, i: 28.2, period: 104000.0, radius: 816.0, color: 0xb8b8c8 },
  { name: 'Makemake', a: 45.79, e: 0.159, i: 29.0, period: 111600.0, radius: 715.0, color: 0xd8a878 },
  { name: 'Eris', a: 67.67, e: 0.4418, i: 44.0, period: 203600.0, radius: 1163.0, color: 0xd8d8e8 },
];

// ---- Derived helpers ----
// Convert planet semi-major axis (AU) to world units.
export function planetOrbitRadius(au) {
  return au * AU_SCALE;
}
// Convert planet radius (km) to world units (exaggerated but proportional).
export function planetWorldRadius(radiusKm) {
  return (radiusKm / 6371.0) * PLANET_SIZE_SCALE;
}
// Convert moon semi-major axis (km) to world units relative to its planet.
// Moon orbit = planet's world radius × (real moon distance in planet radii) × compress.
export function moonOrbitRadius(moonAkm, planetRadiusKm) {
  return planetWorldRadius(planetRadiusKm) * (moonAkm / planetRadiusKm) * MOON_ORBIT_COMPRESS;
}
// Convert moon radius (km) to world units relative to its planet.
export function moonWorldRadius(moonRadiusKm, planetRadiusKm) {
  return (moonRadiusKm / planetRadiusKm) * PLANET_SIZE_SCALE;
}
