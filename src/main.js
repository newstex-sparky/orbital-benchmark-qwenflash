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
  PLANETS, MOONS, DWARF_PLANETS,
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

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 60, 120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.01;
controls.maxDistance = 1200;

// ---------- Lighting ----------
// The Sun is the ONLY light source. No ambient light — the night side of every
// planet is genuinely dark, exactly as in reality.
const sunLight = new THREE.PointLight(0xfff3d6, 3.0, 0, 0);
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

// ---------- Planets ----------
const planetMeshes = {};   // name -> { mesh, orbitRadius, period, phase, e, i, moons:[] }
const planetGroups = {};   // name -> THREE.Group (for moon system)
const allSelectables = [];

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
    scene.add(orbitLine);

    // group for moon system (positioned at planet's orbital position)
    const grp = new THREE.Group();
    grp.add(mesh);
    scene.add(grp);

    // store
    const rec = {
      mesh, grp, orbitR, period: p.period, e: p.e, i: p.i,
      phase: Math.random() * Math.PI * 2, worldR, color: p.color,
      name: p.name, info: p.info, radiusKm: p.radius, rotPeriod: p.rotPeriod,
      moons: [],
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
    scene.add(orbitLine);
    scene.add(mesh);
    dwarfMeshes.push({ mesh, orbitR, period: d.period, e: d.e, i: d.i, phase: Math.random() * Math.PI * 2, name: d.name });
    mesh.userData = { type: 'dwarf', name: d.name };
    allSelectables.push(mesh);
  });
}
buildDwarfs();

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

function setView(name) {
  currentView = name;
  if (name === 'system') {
    viewTarget.set(0, 0, 0);
    viewDistance = 1150; // fit the whole system incl. Eris (~1082)
  } else {
    const rec = planetMeshes[name];
    if (rec) {
      viewTarget.copy(rec.grp.position);
      // Zoom so the planet fills ~40% of the view (distance ≈ r / tan(20°)).
      // At true scale planets are tiny, so this is a very close approach.
      viewDistance = rec.worldR * 2.75 + 0.02;
    } else {
      // dwarf planet
      const d = dwarfMeshes.find(x => x.name === name);
      if (d) {
        viewTarget.copy(d.mesh.position);
        viewDistance = 3;
      }
    }
  }
  transitioning = true;
}

// ---------- UI: dropdown ----------
const select = document.getElementById('planet-select');
select.addEventListener('change', () => setView(select.value));

// ---------- Raycaster for selection ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const infoEl = document.getElementById('info');

renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allSelectables, true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && !obj.userData.name) obj = obj.parent;
    if (obj) {
      const d = obj.userData;
      if (d.type === 'planet') {
        const rec = d.rec;
        infoEl.innerHTML = `<h3 style="color:#5fd9ff;font-size:11px;letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 12px #5fd9ff">PLANET</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${rec.name}</div>
          <div><span style="color:#7fa3c4">Orbit</span> ${rec.orbitR.toFixed(1)} AU</div>
          <div><span style="color:#7fa3c4">Period</span> ${rec.period.toFixed(1)} days</div>
          <div><span style="color:#7fa3c4">Radius</span> ${rec.radiusKm.toLocaleString()} km</div>
          <div><span style="color:#7fa3c4">Moons</span> ${rec.moons.length}</div>
          <div style="margin-top:6px;color:#a8c4e0;font-size:11px">${rec.info}</div>`;
      } else if (d.type === 'moon') {
        infoEl.innerHTML = `<h3 style="color:#c9a0ff;font-size:11px;letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 12px #c9a0ff">MOON</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${d.name}</div>
          <div><span style="color:#7fa3c4">Of</span> ${d.planet}</div>`;
      } else if (d.type === 'dwarf') {
        infoEl.innerHTML = `<h3 style="color:#c8a878;font-size:11px;letter-spacing:2px;margin-bottom:6px">DWARF PLANET</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:14px;margin-bottom:6px">${d.name}</div>`;
      }
      infoEl.style.display = 'block';
    }
  } else {
    infoEl.style.display = 'none';
  }
});

// ---------- Animation ----------
let paused = false;
let lastTime = performance.now();
let simTime = 0; // simulated days
const DAYS_PER_SECOND = 2.0; // human-readable speed

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
    // rotate planet on its axis
    rec.mesh.rotation.y += 0.002;
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

  // smooth camera transition to selected view
  if (transitioning) {
    // re-fetch the live target each frame so we track a moving planet
    let target = viewTarget;
    if (currentView !== 'system') {
      const rec = planetMeshes[currentView];
      if (rec) target = rec.grp.position;
      else {
        const d = dwarfMeshes.find(x => x.name === currentView);
        if (d) target = d.mesh.position;
      }
    }
    const desired = viewDistance;
    // Approach from the sunlit side: place the camera between the sun and the
    // target so the lit hemisphere faces the viewer (sun is the only light).
    const sunDir = target.clone().normalize(); // from origin (sun) toward target
    const newPos = target.clone().addScaledVector(sunDir, -desired);
    camera.position.lerp(newPos, 0.08);
    controls.target.lerp(target, 0.08);
    if (camera.position.distanceTo(newPos) < 0.05) transitioning = false;
  }

  controls.update();
  composer.render();
}

// ---------- Post-processing ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.5, 0.2);
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
