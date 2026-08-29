// main.js — Full-scale solar system model.
// Real orbital data, high-fidelity planet textures, moon systems, and a
// dropdown to navigate between the full system and individual planets.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  PLANETS, MOONS, DWARF_PLANETS, ASTEROIDS,
  planetOrbitRadius, planetWorldRadius, moonOrbitRadius, moonWorldRadius,
  SUN_RADIUS, AU_SCALE,
} from './data.js';

// procedural glow texture cache (declared at module top — used during init)
const _glowCache = {};

// ---------- Boot ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010208);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.0001, 5000);
camera.position.set(0, 60, 120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.01;
controls.maxDistance = 3000;

// ---------- Lighting ----------
// The Sun is the ONLY light source. No ambient light — the night side of every
// planet is genuinely dark, exactly as in reality.
// NOTE: decay=0 keeps sun illumination UNIFORM across the whole system. With
// default physical (1/r²) falloff, planets tens of AU out receive ~zero light
// and render as near-black spheres — indistinguishable from their night side
// even when you focus in. Real sunlight IS effectively parallel rays (the Sun
// is 109× the planets), so uniform directional-style intensity is the correct,
// visible model. The night side still gets nothing (no ambient).
const sunLight = new THREE.PointLight(0xfff3d6, 1.6, 0, 0);
sunLight.decay = 0;               // no distance falloff (parallel sunlight)
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ---------- Stars ----------
function buildStars() {
  const N = 6000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 500 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.cos(phi);
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    const b = 0.4 + Math.random() * 0.6;
    col[i*3] = b; col[i*3+1] = b; col[i*3+2] = b + Math.random() * 0.2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
  const s = new THREE.Points(g, m);
  s.frustumCulled = false;
  scene.add(s);
}
buildStars();

// ---------- Texture loader ----------
const loader = new THREE.TextureLoader();
loader.setPath('textures/planets/');
const texCache = {};
function getTexture(name) {
  if (!name) return null;
  if (!texCache[name]) texCache[name] = loader.load(name);
  return texCache[name];
}

// ---------- Sun ----------
function buildSun() {
  const geo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const sun = new THREE.Mesh(geo, mat);
  scene.add(sun);
  // corona glow
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(0xffa040), color: 0xffa040, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
  }));
  glow.scale.setScalar(SUN_RADIUS * 6);
  scene.add(glow);
  // outer halo
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(0xffd27a), color: 0xffd27a, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
  }));
  halo.scale.setScalar(SUN_RADIUS * 3);
  scene.add(halo);
  return sun;
}
const sun = buildSun();

// ---------- Procedural glow texture ----------
function makeGlowTexture(color) {
  const key = color.toString();
  if (_glowCache[key]) return _glowCache[key];
  const c = new THREE.Color(color);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.7)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  _glowCache[key] = tex;
  return tex;
}

// ---------- Orbit ring helper ----------
function makeOrbitRing(radius, color, opacity = 0.25, segments = 256) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.Line(g, m);
}

// Invisible, thick 3D hit-target ring so a tap anywhere on an orbit reliably
// registers. A Torus (donut) raycasts cleanly from ANY camera angle, unlike a
// flat disc which is edge-on and invisible to raycasts from most views.
function makeOrbitHitRing(radius, name, dwarf = false) {
  // Tube thickness scales gently with the orbit so inner rings stay tappable
  // and outer rings get a comfortably wide target.
  const tube = Math.max(0.9, radius * 0.02);
  const geom = new THREE.TorusGeometry(radius, tube, 10, 96);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false, depthTest: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = Math.PI / 2; // lay in the ecliptic plane (donut already axis-aligned Y)
  mesh.userData = { type: 'orbitRing', name, dwarf };
  return mesh;
}

// ---------- Planets ----------
const planetMeshes = {};   // name -> { mesh, orbitRadius, period, phase, e, i, moons:[] }
const planetGroups = {};   // name -> THREE.Group (for moon system)
const allSelectables = [];
const orbitRings = [];     // raycastable planet/dwarf orbit rings

function buildPlanets() {
  PLANETS.forEach((p, idx) => {
    const worldR = planetWorldRadius(p.radius);
    const orbitR = planetOrbitRadius(p.a);
    const tex = getTexture(p.texture);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(worldR, 48, 48),
      new THREE.MeshPhongMaterial({ map: tex, shininess: 5 })
    );
    // Fixed-size glow marker so the tiny true-scale planet stays findable.
    // (At true scale Earth is ~0.018 world units — invisible without a marker.)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(p.color), color: p.color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    }));
    halo.scale.setScalar(0.5); // fixed world size, independent of planet radius
    mesh.add(halo);

    // Saturn rings — fixed size so they're visible at true scale
    if (p.name === 'Saturn') {
      const ringGeo = new THREE.RingGeometry(0.9, 1.6, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        map: getTexture('saturn_ring.jpg'), side: THREE.DoubleSide,
        transparent: true, opacity: 0.9, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }

    // orbit ring
    const orbitLine = makeOrbitRing(orbitR, p.color, 0.18);
    orbitLine.userData = { type: 'orbitRing', name: p.name };
    orbitRings.push(orbitLine);
    scene.add(orbitLine);
    // wide invisible tap-target ring for mobile
    const hitRing = makeOrbitHitRing(orbitR, p.name);
    orbitRings.push(hitRing);
    scene.add(hitRing);

    // group for moon system (positioned at planet's orbital position)
    const grp = new THREE.Group();
    grp.add(mesh);
    scene.add(grp);

    // store
    const rec = {
      mesh, grp, orbitR, period: p.period, e: p.e, i: p.i,
      phase: Math.random() * Math.PI * 2, worldR, color: p.color,
      name: p.name, info: p.info, radiusKm: p.radius, rotPeriod: p.rotPeriod,
      halo, moons: [],
    };
    planetMeshes[p.name] = rec;
    planetGroups[p.name] = grp;
    mesh.userData = { type: 'planet', name: p.name, rec };
    allSelectables.push(mesh);
  });
}
buildPlanets();

// ---------- Moons ----------
function buildMoons() {
  for (const [planetName, moonList] of Object.entries(MOONS)) {
    const rec = planetMeshes[planetName];
    if (!rec) continue;
    const planetR = rec.worldR;
    moonList.forEach((m) => {
      const orbitR = moonOrbitRadius(m.a, rec.radiusKm);
      const moonR = Math.max(0.004, moonWorldRadius(m.radius, rec.radiusKm));
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(moonR, 24, 24),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 3 })
      );
      // Moon gets its texture
      if (planetName === 'Earth' && m.name === 'Moon') {
        mesh.material.map = getTexture('moon.jpg');
        mesh.material.needsUpdate = true;
      }
      // fixed-size marker so the tiny moon stays findable
      const mhalo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(0x88aacc), color: 0x88aacc, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7,
      }));
      mhalo.scale.setScalar(0.12);
      mesh.add(mhalo);
      const orbitLine = makeOrbitRing(orbitR, 0x88aacc, 0.15);
      rec.grp.add(orbitLine);
      rec.grp.add(mesh);
      rec.moons.push({
        mesh, orbitR, period: m.period, e: m.e, phase: Math.random() * Math.PI * 2,
        name: m.name, radiusKm: m.radius,
      });
      mesh.userData = { type: 'moon', name: m.name, planet: planetName };
      allSelectables.push(mesh);
    });
  }
}
buildMoons();

// ---------- Dwarf planets (full-system view) ----------
const dwarfMeshes = [];
function buildDwarfs() {
  DWARF_PLANETS.forEach((d) => {
    const worldR = planetWorldRadius(d.radius); // true scale
    const orbitR = planetOrbitRadius(d.a);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(worldR, 24, 24),
      new THREE.MeshPhongMaterial({ color: d.color, shininess: 2 })
    );
    // fixed-size marker so the tiny dwarf planet stays findable
    const dhalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(d.color), color: d.color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8,
    }));
    dhalo.scale.setScalar(0.3);
    mesh.add(dhalo);
    const orbitLine = makeOrbitRing(orbitR, d.color, 0.12);
    orbitLine.userData = { type: 'orbitRing', name: d.name, dwarf: true };
    orbitRings.push(orbitLine);
    scene.add(orbitLine);
    // wide invisible tap-target ring for mobile
    const hitRing = makeOrbitHitRing(orbitR, d.name, true);
    orbitRings.push(hitRing);
    scene.add(hitRing);
    scene.add(mesh);
    dwarfMeshes.push({ mesh, orbitR, period: d.period, e: d.e, i: d.i, phase: Math.random() * Math.PI * 2, name: d.name, halo: dhalo });
    mesh.userData = { type: 'dwarf', name: d.name };
    allSelectables.push(mesh);
  });
}
buildDwarfs();

// ---------- Asteroids (large / notable) ----------
const asteroidMeshes = [];
function buildAsteroids() {
  ASTEROIDS.forEach((a) => {
    const worldR = Math.max(0.004, planetWorldRadius(a.radius)); // true scale, min visible
    const orbitR = planetOrbitRadius(a.a);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(worldR, 16, 16),
      new THREE.MeshPhongMaterial({ color: a.color, shininess: 2 })
    );
    // fixed-size marker so the tiny asteroid stays findable
    const ahalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(a.color), color: a.color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6,
    }));
    ahalo.scale.setScalar(0.18);
    mesh.add(ahalo);
    const orbitLine = makeOrbitRing(orbitR, a.color, 0.1);
    orbitLine.userData = { type: 'orbitRing', name: a.name, asteroid: true };
    orbitRings.push(orbitLine);
    scene.add(orbitLine);
    // wide invisible tap-target ring for mobile
    const hitRing = makeOrbitHitRing(orbitR, a.name, true);
    orbitRings.push(hitRing);
    scene.add(hitRing);
    scene.add(mesh);
    asteroidMeshes.push({ mesh, orbitR, period: a.period, e: a.e, i: a.i, phase: Math.random() * Math.PI * 2, name: a.name, halo: ahalo, radiusKm: a.radius, color: a.color });
    mesh.userData = { type: 'asteroid', name: a.name };
    allSelectables.push(mesh);
  });
}
buildAsteroids();

// ---------- Asteroid belt (visual richness) ----------
function buildAsteroidBelt() {
  const N = 1200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = planetOrbitRadius(2.2) + Math.random() * planetOrbitRadius(1.0);
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 0.4;
    pos[i*3] = Math.cos(a) * r;
    pos[i*3+1] = y;
    pos[i*3+2] = Math.sin(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0x8a7a6a, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.6 });
  const belt = new THREE.Points(g, m);
  scene.add(belt);
}
buildAsteroidBelt();

// ---------- Camera / view management ----------
let currentView = 'system'; // 'system' or planet name
let viewTarget = new THREE.Vector3(0, 0, 0);
let viewDistance = 60;
let transitioning = false;
let isFocused = false;          // true when focused on a single planet/dwarf
let followPos = new THREE.Vector3(0, 0, 0);   // live planet position (focus follow)
let prevFollowPos = new THREE.Vector3();
let focusDist = 0;              // camera distance from planet while focused
let focusOffset = new THREE.Vector3(0, 0, 600); // eased camera offset from planet (start far, transition eases in)

// Show/hide the fixed-size marker halo when entering/leaving focus so the
// real planet body (not the findability glow) is what fills the close-up view.
function setFocusedHalo(name, on) {
  if (on) {
    const rec = planetMeshes[name];
    if (rec && rec.halo) rec.halo.visible = false;
    else {
      const d = dwarfMeshes.find(x => x.name === name);
      if (d && d.halo) d.halo.visible = false;
      else {
        const a = asteroidMeshes.find(x => x.name === name);
        if (a && a.halo) a.halo.visible = false;
      }
    }
  } else {
    // restore all halos
    for (const rec of Object.values(planetMeshes)) if (rec.halo) rec.halo.visible = true;
    for (const d of dwarfMeshes) if (d.halo) d.halo.visible = true;
    for (const a of asteroidMeshes) if (a.halo) a.halo.visible = true;
  }
}

// Current-view indicator in the banner
const viewIndText = document.getElementById('view-ind-text');
const viewIndIcon = document.getElementById('view-ind-icon');
// Per-body icon + accent color for the indicator pill
const BODY_GLYPH = {
  Mercury: '☿', Venus: '♀', Earth: '⊕', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Ceres: '⚳', Pluto: '♇',
  Haumea: '☄', Makemake: '☄', Eris: '☄',
};
function updateViewIndicator(name) {
  if (name === 'system' || !viewIndText) {
    viewIndText.textContent = 'Full Solar System';
    viewIndIcon.textContent = '☀';
    viewIndIcon.style.color = '#ffd27a';
    return;
  }
  viewIndText.textContent = name;
  viewIndIcon.textContent = BODY_GLYPH[name] || '☉';
  const rec = planetMeshes[name];
  if (rec) viewIndIcon.style.color = '#' + rec.color.toString(16).padStart(6, '0');
  else {
    const d = dwarfMeshes.find(x => x.name === name);
    if (d) viewIndIcon.style.color = '#' + d.color.toString(16).padStart(6, '0');
    else {
      const a = asteroidMeshes.find(x => x.name === name);
      viewIndIcon.style.color = a ? '#' + a.color.toString(16).padStart(6, '0') : '#eaf7ff';
    }
  }
}

function setView(name) {
  // leave focus: restore any halos we hid
  if (isFocused && name === 'system') setFocusedHalo(currentView, false);
  currentView = name;
  updateViewIndicator(name);
  // Entering a focused view clears any lingering tap-highlight immediately
  if (name !== 'system') { clearHighlight(); setFocusedHalo(name, true); }
  isFocused = name !== 'system';
  if (name === 'system') {
    viewTarget.set(0, 0, 0);
    viewDistance = 1150; // fit the whole system incl. Eris (~1082)
  } else {
    const rec = planetMeshes[name];
    if (rec) {
      viewTarget.copy(rec.grp.position);
      // Zoom so the planet fills ~40% of the view (distance ≈ r / tan(20°)).
      // At true scale planets are tiny, so this is a very close approach.
      viewDistance = rec.worldR * 3;
      focusDist = viewDistance;
      // Start the eased offset far out (behind the planet on the sun side)
      // and let the transition pull it in to the close framing.
      const sunDir = viewTarget.clone().normalize().multiplyScalar(-1);
      focusOffset.copy(sunDir).multiplyScalar(viewDistance * 6);
    } else {
      // dwarf planet or asteroid
      const d = dwarfMeshes.find(x => x.name === name);
      const a = asteroidMeshes.find(x => x.name === name);
      const body = d || a;
      if (body) {
        viewTarget.copy(body.mesh.position);
        viewDistance = body.mesh.geometry.parameters.radius * 3;
        focusDist = viewDistance;
        const sunDir = viewTarget.clone().normalize().multiplyScalar(-1);
        focusOffset.copy(sunDir).multiplyScalar(viewDistance * 6);
      }
    }
  }
  prevFollowPos.copy(viewTarget);
  transitioning = true;
}

// ---------- UI: dropdown ----------
const select = document.getElementById('planet-select');
select.addEventListener('change', () => setView(select.value));

// ---------- Banner tap: cycle to the next planet ----------
// Build an ordered cycle list (system, then planets, then dwarf planets).
const cycleOrder = ['system', ...PLANETS.map(p => p.name), ...DWARF_PLANETS.map(d => d.name)];
const titleEl = document.getElementById('title');
titleEl.addEventListener('click', () => {
  const cur = select.value;
  const idx = cycleOrder.indexOf(cur);
  const next = cycleOrder[(idx + 1) % cycleOrder.length];
  select.value = next;
  setView(next);
});

// ---------- Mobile app-style body drawer ----------
const menuBtn = document.getElementById('menu-btn');
const drawer = document.getElementById('drawer');
const drawerScrim = document.getElementById('drawer-scrim');
const drawerList = document.getElementById('drawer-list');
const drawerSearch = document.getElementById('drawer-search-input');
const drawerClose = document.getElementById('drawer-close');

// Build a flat, searchable list of every body (planets, moons, dwarfs, asteroids).
// Each entry: { name, type, glyph, color, meta, focusName }
function buildBodyIndex() {
  const list = [];
  // Full system first
  list.push({ name: 'Full Solar System', type: 'system', glyph: '☀', color: '#ffd27a', meta: 'All bodies', focusName: 'system' });
  // Planets
  for (const p of PLANETS) {
    const rec = planetMeshes[p.name];
    list.push({
      name: p.name, type: 'planet', glyph: BODY_GLYPH[p.name] || '☉',
      color: '#' + p.color.toString(16).padStart(6, '0'),
      meta: `${rec ? rec.moons.length : 0} moon${rec && rec.moons.length === 1 ? '' : 's'} · ${p.a} AU`,
      focusName: p.name,
    });
  }
  // Moons (grouped under their host planet)
  for (const [planetName, moonList] of Object.entries(MOONS)) {
    for (const m of moonList) {
      list.push({
        name: m.name, type: 'moon', glyph: '☾', color: '#c9a0ff',
        meta: `moon of ${planetName} · ${m.radius} km`, focusName: planetName,
      });
    }
  }
  // Dwarf planets
  for (const d of DWARF_PLANETS) {
    list.push({
      name: d.name, type: 'dwarf', glyph: BODY_GLYPH[d.name] || '☄',
      color: '#' + d.color.toString(16).padStart(6, '0'),
      meta: `dwarf planet · ${d.a} AU`, focusName: d.name,
    });
  }
  // Asteroids
  for (const a of ASTEROIDS) {
    list.push({
      name: a.name, type: 'asteroid', glyph: '✦', color: '#' + a.color.toString(16).padStart(6, '0'),
      meta: `asteroid · ${a.a} AU`, focusName: a.name,
    });
  }
  return list;
}
const bodyIndex = buildBodyIndex();

function openDrawer() {
  drawer.classList.remove('hidden');
  drawerScrim.classList.remove('hidden');
  renderDrawer('');
  drawerSearch.value = '';
  setTimeout(() => drawerSearch.focus(), 50);
}
function closeDrawer() {
  drawer.classList.add('hidden');
  drawerScrim.classList.add('hidden');
}
menuBtn.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerScrim.addEventListener('click', closeDrawer);

// Render the filtered list. Group by type when not searching.
function renderDrawer(query) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? bodyIndex.filter(b => b.name.toLowerCase().includes(q) || b.type.includes(q) || b.meta.toLowerCase().includes(q))
    : bodyIndex;

  let html = '';
  if (q) {
    // Flat results while searching
    for (const b of filtered) html += drawerItemHTML(b);
    if (!filtered.length) html = '<div class="drawer-group-label" style="text-align:center;padding:24px 0">No bodies match “' + query + '”</div>';
  } else {
    // Grouped by type
    const groups = [
      { label: 'System', items: filtered.filter(b => b.type === 'system') },
      { label: 'Planets', items: filtered.filter(b => b.type === 'planet') },
      { label: 'Moons', items: filtered.filter(b => b.type === 'moon') },
      { label: 'Dwarf Planets', items: filtered.filter(b => b.type === 'dwarf') },
      { label: 'Asteroids', items: filtered.filter(b => b.type === 'asteroid') },
    ];
    for (const g of groups) {
      if (!g.items.length) continue;
      html += `<div class="drawer-group-label">${g.label}</div>`;
      for (const b of g.items) html += drawerItemHTML(b);
    }
  }
  drawerList.innerHTML = html;

  // Wire clicks
  drawerList.querySelectorAll('.drawer-item').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.focus;
      select.value = name;
      setView(name);
      closeDrawer();
    });
  });
}

function drawerItemHTML(b) {
  const current = currentView === b.focusName;
  return `<div class="drawer-item${current ? ' current' : ''}" data-focus="${b.focusName}">
    <div class="glyph" style="background:${b.color};box-shadow:0 0 8px ${b.color}">${b.glyph}</div>
    <div class="name">${b.name}</div>
    <div class="meta">${b.meta}</div>
    <div class="chev">›</div>
  </div>`;
}

drawerSearch.addEventListener('input', () => renderDrawer(drawerSearch.value));
// Re-render when the focused body changes so the "current" highlight stays fresh
const _origSetView = setView;
setView = function (name) {
  _origSetView(name);
  if (!drawer.classList.contains('hidden')) renderDrawer(drawerSearch.value);
};

// ---------- Raycaster for selection ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const infoEl = document.getElementById('info');
const focusBtn = document.getElementById('focus-btn');
let pointerDownPos = null;
let focusTarget = null; // name of the planet the focus button is for
let ignoreNextPointer = false;

// Track pointer-down so we can distinguish a tap from a drag (mobile).
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.target === focusBtn) { ignoreNextPointer = true; return; }
  pointerDownPos = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.target === focusBtn || ignoreNextPointer) { ignoreNextPointer = false; return; }
  // Only treat as a tap if the pointer barely moved (not a drag/orbit).
  if (pointerDownPos) {
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    if (dx * dx + dy * dy > 25) { pointerDownPos = null; return; } // it was a drag
  }
  pointerDownPos = null;
  handleSelect(e.clientX, e.clientY);
});

// Focus button: follow the planet close-up
focusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (focusTarget) {
    setView(focusTarget);
    select.value = focusTarget;
    focusBtn.classList.add('hidden');
    focusTarget = null;
  }
});

function showFocusButton(name) {
  focusTarget = name;
  focusBtn.textContent = 'Focus \u2192 ' + name;
  focusBtn.classList.remove('hidden');
  // Color the tap-highlight to match the planet
  const p = planetMeshes[name];
  if (p) highlightRing(name, p.color);
}

// ---------- Tapped-ring pulse highlight ----------
// A soft, faint glow that briefly pulses on the ring the user tapped, so they
// see which orbit they're about to focus. Deliberately subtle — it's a hint,
// not a spotlight.
const highlightMat = new THREE.MeshBasicMaterial({ color: 0x7fd9ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
const highlightMesh = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.02, 12, 128),
  highlightMat
);
highlightMesh.rotation.x = Math.PI / 2;
highlightMesh.visible = false;
scene.add(highlightMesh);
let highlightT = -1;        // -1 = inactive, else elapsed time of the pulse

function clearHighlight() {
  highlightT = -1;
  highlightMesh.visible = false;
  highlightMat.opacity = 0;
}

function highlightRing(name, color) {
  // Determine the orbit radius for the tapped body
  let radius = null;
  const p = planetMeshes[name];
  if (p) radius = p.orbitR;
  else {
    const d = dwarfMeshes.find(x => x.name === name);
    if (d) radius = d.orbitR;
    else {
      const a = asteroidMeshes.find(x => x.name === name);
      if (a) radius = a.orbitR;
    }
  }
  if (!radius) return;
  highlightMesh.geometry.dispose();
  // Thin, subtle tube — just enough to trace the ring, no heavy banding
  highlightMesh.geometry = new THREE.TorusGeometry(radius, radius * 0.012, 12, 128);
  highlightMesh.rotation.x = Math.PI / 2;
  highlightMat.color.setHex(color || 0x7fd9ff);
  highlightMesh.visible = true;
  highlightT = 0;
}

// Fade the pulse in the animation loop
function tickHighlight(dt) {
  if (highlightT < 0) return;
  highlightT += dt;
  const dur = 1.8; // a touch longer but gentler
  if (highlightT > dur) { clearHighlight(); return; }
  // gentle sine swell, low peak — a soft blink, not a flash
  const p = Math.sin((highlightT / dur) * Math.PI); // 0→1→0
  highlightMat.opacity = 0.12 + 0.35 * p;            // peak ~0.47
}

function handleSelect(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allSelectables, true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && !obj.userData.name) obj = obj.parent;
    if (obj) {
      const d = obj.userData;
      if (d.type === 'planet') {
        const rec = d.rec;
        focusBtn.classList.add('hidden');
        infoEl.innerHTML = `<h3 style="color:#5fd9ff;font-size:11px;letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 12px #5fd9ff">PLANET</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${rec.name}</div>
          <div><span style="color:#7fa3c4">Orbit</span> ${rec.orbitR.toFixed(1)} AU</div>
          <div><span style="color:#7fa3c4">Period</span> ${rec.period.toFixed(1)} days</div>
          <div><span style="color:#7fa3c4">Radius</span> ${rec.radiusKm.toLocaleString()} km</div>
          <div><span style="color:#7fa3c4">Moons</span> ${rec.moons.length}</div>
          <div style="margin-top:6px;color:#a8c4e0;font-size:11px">${rec.info}</div>
          <div style="margin-top:10px"><button class="mini-btn">Focus \u2192 ${rec.name}</button></div>`;
        infoEl.style.display = 'block';
        const mini = infoEl.querySelector('.mini-btn');
        if (mini) mini.addEventListener('click', (ev) => {
          ev.stopPropagation();
          setView(rec.name); select.value = rec.name; infoEl.style.display = 'none';
        });
      } else if (d.type === 'moon') {
        focusBtn.classList.add('hidden');
        infoEl.innerHTML = `<h3 style="color:#c9a0ff;font-size:11px;letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 12px #c9a0ff">MOON</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${d.name}</div>
          <div><span style="color:#7fa3c4">Of</span> ${d.planet}</div>`;
        infoEl.style.display = 'block';
      } else if (d.type === 'dwarf') {
        focusBtn.classList.add('hidden');
        infoEl.innerHTML = `<h3 style="color:#c8a878;font-size:11px;letter-spacing:2px;margin-bottom:6px">DWARF PLANET</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${d.name}</div>`;
        infoEl.style.display = 'block';
      } else if (d.type === 'asteroid') {
        focusBtn.classList.add('hidden');
        const a = asteroidMeshes.find(x => x.name === d.name);
        infoEl.innerHTML = `<h3 style="color:#b8a888;font-size:11px;letter-spacing:2px;margin-bottom:6px">ASTEROID</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${d.name}</div>
          <div><span style="color:#7fa3c4">Orbit</span> ${a ? a.orbitR.toFixed(1) : '—'} AU</div>
          <div><span style="color:#7fa3c4">Period</span> ${a ? a.period.toFixed(0) : '—'} days</div>
          <div><span style="color:#7fa3c4">Radius</span> ${a ? a.radiusKm.toFixed(1) : '—'} km</div>
          <div style="margin-top:10px"><button class="mini-btn">Focus \u2192 ${d.name}</button></div>`;
        infoEl.style.display = 'block';
        const mini = infoEl.querySelector('.mini-btn');
        if (mini) mini.addEventListener('click', (ev) => {
          ev.stopPropagation();
          setView(d.name); select.value = d.name; infoEl.style.display = 'none';
        });
      }
      return;
    }
  }

  // No body hit — check orbit rings (so tapping a ring focuses its planet)
  const ringHits = raycaster.intersectObjects(orbitRings, false);
  if (ringHits.length && ringHits[0].object.userData.name) {
    const ring = ringHits[0].object.userData;
    infoEl.style.display = 'none';
    showFocusButton(ring.name);
    highlightRing(ring.name);
    return;
  }

  // Empty space — hide both
  infoEl.style.display = 'none';
  focusBtn.classList.add('hidden');
}

// ---------- Animation ----------
let paused = false;
let lastTime = performance.now();
let simTime = 0; // simulated days
let DAYS_PER_SECOND = 1.0; // human-readable speed (days of sim per real second)

// Time-speed slider (logarithmic: 0.01 → 1000 days/s)
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
function setSpeedFromSlider(v) {
  const pct = v / 100; // 0..1
  DAYS_PER_SECOND = Math.pow(10, -2 + pct * 5); // 0.01 .. 1000
  speedVal.textContent = DAYS_PER_SECOND < 1
    ? (DAYS_PER_SECOND * 24).toFixed(1) + ' hr/s'
    : DAYS_PER_SECOND.toFixed(DAYS_PER_SECOND < 10 ? 1 : 0) + ' day/s';
}
speedSlider.addEventListener('input', () => setSpeedFromSlider(parseFloat(speedSlider.value)));
setSpeedFromSlider(parseFloat(speedSlider.value));

// Keplerian position on an elliptical orbit
function keplerPos(rec, t) {
  const M = rec.phase + (2 * Math.PI * t) / rec.period; // mean anomaly
  // solve Kepler's equation for eccentric anomaly E (Newton)
  let E = M;
  for (let k = 0; k < 6; k++) E = E - (E - rec.e * Math.sin(E) - M) / (1 - rec.e * Math.cos(E));
  // true anomaly
  const nu = 2 * Math.atan2(Math.sqrt(1 + rec.e) * Math.sin(E / 2), Math.sqrt(1 - rec.e) * Math.cos(E / 2));
  const r = rec.orbitR * (1 - rec.e * Math.cos(E));
  const x = r * Math.cos(nu);
  const z = r * Math.sin(nu);
  // inclination (tilt about X)
  const iRad = (rec.i || 0) * Math.PI / 180;
  const y = -z * Math.sin(iRad);
  const z2 = z * Math.cos(iRad);
  return new THREE.Vector3(x, y, z2);
}

function updatePositions() {
  // planets
  for (const rec of Object.values(planetMeshes)) {
    const pos = keplerPos(rec, simTime);
    rec.grp.position.copy(pos);
    // Rotate on its axis at the REAL rate, tied to simTime so it scales with
    // the time-speed slider. rotPeriod is in hours → days = rotPeriod/24.
    // (Negative rotPeriod = retrograde rotation, e.g. Venus.)
    const rotDays = rec.rotPeriod / 24;
    rec.mesh.rotation.y = (2 * Math.PI * simTime) / rotDays;
    // moons orbit the planet
    for (const m of rec.moons) {
      const a = m.phase + (2 * Math.PI * simTime) / m.period;
      const r = m.orbitR;
      m.mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  // dwarf planets
  for (const d of dwarfMeshes) {
    const pos = keplerPos(d, simTime);
    d.mesh.position.copy(pos);
  }
  // asteroids
  for (const a of asteroidMeshes) {
    const pos = keplerPos(a, simTime);
    a.mesh.position.copy(pos);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!paused) {
    simTime += dt * DAYS_PER_SECOND;
    updatePositions();
    sun.rotation.y += dt * 0.01;
  }

  // smooth camera transition to selected view, then keep following the planet
  if (isFocused && currentView !== 'system') {
    // live position of the focused body
    const rec = planetMeshes[currentView];
    let live = null;
    if (rec) live = rec.grp.position;
    else {
      const d = dwarfMeshes.find(x => x.name === currentView);
      if (d) live = d.mesh.position;
      else {
        const a = asteroidMeshes.find(x => x.name === currentView);
        if (a) live = a.mesh.position;
      }
    }
    if (live) {
      const drift = live.clone().sub(prevFollowPos);
      if (transitioning) {
        // Ease the camera's OFFSET from the planet (not its absolute world pos).
        // Approach from the sunlit side: the goal offset puts the camera between
        // the sun and the planet so the viewer sees the lit hemisphere.
        const sunDir = live.clone().normalize();           // from sun toward planet
        const goal = sunDir.multiplyScalar(-focusDist);    // desired camera offset
        focusOffset.lerp(goal, 0.15);
        // Place the camera exactly at planet + eased offset every frame — this
        // converges even though the planet moves, unlike a slow world-lerp.
        camera.position.copy(live).add(focusOffset);
        controls.target.copy(live);
        if (focusOffset.distanceTo(goal) < focusDist * 0.02) {
          transitioning = false;
        }
      } else {
        // Transition done — translate camera + target by the planet's
        // frame-to-frame drift so the body stays framed, WITHOUT overriding the
        // user's one-finger orbit/zoom (their drag still rotates the view).
        camera.position.add(drift);
        controls.target.copy(live);
      }
      prevFollowPos.copy(live);
    }
  } else if (transitioning) {
    // System view (or leaving focus): center on the origin
    const newPos = viewTarget.clone().add(new THREE.Vector3(0, 0.35 * viewDistance, 0.78 * viewDistance));
    camera.position.lerp(newPos, 0.08);
    controls.target.lerp(viewTarget, 0.08);
    if (camera.position.distanceTo(newPos) < 0.5) transitioning = false;
  }

  tickHighlight(dt);
  controls.update();
  composer.render();
}

// ---------- Post-processing ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Pause (Space) ----------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); paused = !paused; }
});

// ---------- Veil ----------
const veil = document.getElementById('veil');
const veilBar = document.getElementById('veilbar');
const veilStatus = document.getElementById('veilstatus');
let loadedTex = 0, totalTex = 0;
const allTexNames = [...new Set(PLANETS.map(p => p.texture).concat(['moon.jpg', 'saturn_ring.jpg']))];
totalTex = allTexNames.length;
function texLoaded() {
  loadedTex++;
  veilBar.style.width = Math.min(100, (loadedTex / totalTex) * 100) + '%';
}
function hideVeil() {
  veilStatus.textContent = 'Solar system online';
  veilBar.style.width = '100%';
  setTimeout(() => veil.classList.add('hidden'), 300);
}
allTexNames.forEach(n => {
  const t = getTexture(n);
  if (t.image && t.image.complete) texLoaded();
  else t.addEventListener('load', texLoaded);
});
let veilFrames = 0;
const veilTicker = setInterval(() => {
  veilFrames++;
  if (veilFrames >= 3) { clearInterval(veilTicker); hideVeil(); }
}, 350);
setTimeout(hideVeil, 6000);

requestAnimationFrame(animate);
