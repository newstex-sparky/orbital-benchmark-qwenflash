// main.js — Orbital Data Traffic: a realistic Earth + satellite constellation
// + comet-like data packets, rendered with high-quality bloom post-processing.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildSatelliteList, GROUND_STATIONS, CONSTELLATIONS, latLonToVec3, EARTH_RADIUS } from './data.js';

// procedural glow texture cache (declared at module top — used during init)
const _glowCache = {};

// ---------- Boot ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020409);
scene.fog = new THREE.FogExp2(0x020409, 0.0009);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(8.5, 4.5, 9.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = EARTH_RADIUS + 0.6;
controls.maxDistance = 24;
controls.autoRotate = false;

// ---------- Lighting ----------
scene.add(new THREE.AmbientLight(0x445566, 0.9));
const sun = new THREE.DirectionalLight(0xfff3d6, 2.6);
sun.position.set(20, 12, 8);
scene.add(sun);

// ---------- Stars ----------
function buildStars() {
  const N = 5200;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 150 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.cos(phi);
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    const b = 0.5 + Math.random() * 0.5;
    col[i*3] = b; col[i*3+1] = b; col[i*3+2] = b + Math.random() * 0.2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size: 0.09, vertexColors: true, sizeAttenuation: true,
    transparent: true, opacity: 0.9, depthWrite: false,
  });
  const s = new THREE.Points(g, m);
  s.frustumCulled = false;
  scene.add(s);
  return s;
}
buildStars();

// ---------- Earth ----------
const loader = new THREE.TextureLoader();
loader.setPath('textures/');
const texAtmos = loader.load('earth_atmos_2048.jpg');
const texNormal = loader.load('earth_normal_2048.jpg');
const texSpec = loader.load('earth_specular_2048.jpg');
const texClouds = loader.load('earth_clouds_1024.png');
const texLights = loader.load('earth_lights_2048.png');

const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
const earthMat = new THREE.MeshPhongMaterial({
  map: texAtmos,
  normalMap: texNormal,
  specularMap: texSpec,
  specular: new THREE.Color(0x223344),
  shininess: 8,
  emissiveMap: texLights,
  emissive: new THREE.Color(0xffe8b0),
  emissiveIntensity: 0.55,
});
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

// Cloud layer (transparent, slowly drifting, self-shadowed look via depth)
const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 96, 96);
const cloudMat = new THREE.MeshPhongMaterial({
  map: texClouds,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  blending: THREE.NormalBlending,
  color: 0xffffff,
});
const clouds = new THREE.Mesh(cloudGeo, cloudMat);
scene.add(clouds);

// ---------- Atmosphere glow (fresnel rim shader) ----------
const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.06, 64, 64);
const atmosMat = new THREE.ShaderMaterial({
  uniforms: {
    c: { value: 0.45 },
    p: { value: 4.5 },
    glowColor: { value: new THREE.Color(0x5fa8ff) },
    viewVector: { value: camera.position },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position,1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    uniform vec3 glowColor;
    uniform float c;
    uniform float p;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 viewDir = normalize(-vPosition);
      float intensity = pow(c - dot(vNormal, viewDir), p);
      gl_FragColor = vec4(glowColor, 1.0) * intensity;
    }`,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
});
const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
scene.add(atmosphere);

// ---------- Orbital ring guides (subtle) ----------
function addOrbitRing(radius, color, opacity, tiltX = 0) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(g, m);
  if (tiltX) line.rotation.x = tiltX;
  scene.add(line);
  return line;
}
// equatorial ring (GEO shell) + a tilted shell (MEO/LEO-ish)
const ringGeo = addOrbitRing(EARTH_RADIUS + 2.15, 0xc9a0ff, 0.16);
const ringMeo = addOrbitRing(EARTH_RADIUS + 0.53, 0x8af2ff, 0.10, Math.PI / 3);

// ---------- Satellites ----------
const satellites = [];
const satPoints = []; // THREE.Vector3 per sat for packet routing
const satGroups = {};
const satCols = {};

function buildSatellites() {
  buildSatelliteList().forEach((s, i) => {
    const grp = new THREE.Group();
    grp.userData = { ...s, idx: i };
    // core dot
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: s.color })
    );
    grp.add(core);
    // glow halo
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(s.color),
        color: s.color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.9,
      })
    );
    halo.scale.setScalar(0.28);
    grp.add(halo);
    scene.add(grp);
    satellites.push(grp);
    const v = new THREE.Vector3();
    satPoints.push(v);
    if (!satGroups[s.constellation]) satGroups[s.constellation] = [];
    satGroups[s.constellation].push(grp);
    satCols[s.name] = s.color;
  });
}
buildSatellites();

// ---------- Ground stations ----------
const stations = [];
const stationPoints = [];
function buildStations() {
  const icon = makeStationSprite();
  GROUND_STATIONS.forEach((st, i) => {
    const p = latLonToVec3(st.lat, st.lon, EARTH_RADIUS * 1.005);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: icon,
        color: st.color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    sprite.scale.setScalar(0.55);
    sprite.position.set(p.x, p.y, p.z);
    sprite.userData = { name: st.name, lat: st.lat, lon: st.lon, type: 'station', color: st.color };
    scene.add(sprite);
    // small marker dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: st.color })
    );
    dot.position.set(p.x, p.y, p.z);
    scene.add(dot);
    stations.push(sprite);
    stationPoints.push(new THREE.Vector3(p.x, p.y, p.z));
  });
}
buildStations();

// ---------- Procedural glow textures ----------
function makeGlowTexture(color) {
  const key = color.toString();
  if (_glowCache[key]) return _glowCache[key];
  const c = new THREE.Color(color);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, `rgba(255,255,255,1)`);
  g.addColorStop(0.3, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.7)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  _glowCache[key] = tex;
  return tex;
}
function makeStationSprite() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  // up-tick marker
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size/2, size-6); ctx.lineTo(size/2, 8);
  ctx.moveTo(size/2, 8); ctx.lineTo(size/2-8, 20);
  ctx.moveTo(size/2, 8); ctx.lineTo(size/2+8, 20);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

// ---------- Comet-like Data Packets ----------
// Each packet is an elongated, additive, tailed sprite flying between
// a source and a target node. The "comet" look = stretched glow with a
// trailing wake, achieved by orienting a cone/sprite along velocity + a
// particle trail.
const MAX_PACKETS = 320;
const packets = [];
const packetGeo = null;

function makeCometSprite() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  // elongated horizontal comet: bright head fading to a long tail to the right
  const g = ctx.createLinearGradient(size, 0, 0, 0);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.25, 'rgba(120,220,255,0)');
  g.addColorStop(0.45, 'rgba(160,235,255,0.55)');
  g.addColorStop(0.65, 'rgba(230,250,255,0.95)');
  g.addColorStop(0.8, 'rgba(255,255,255,1)');
  g.addColorStop(1.0, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Per-constellation comet texture tint
const cometTexByColor = {};
function cometTextureFor(color) {
  const key = color.toString();
  if (cometTexByColor[key]) return cometTexByColor[key];
  const base = makeCometSprite();
  // tint a copy
  const c = new THREE.Color(color);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base.image, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${c.r*255|0},${c.g*255|0},${c.b*255|0})`;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(120,200,255,0.5)';
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  cometTexByColor[key] = tex;
  return tex;
}

class Packet {
  constructor() {
    this.active = false;
    // comet body: a billboarded plane whose tail streams behind the velocity.
    // (A THREE.Sprite cannot be rotated, so we use a Plane mesh and orient it
    //  to face the camera while rotating it to align with screen-space velocity.)
    const g = new THREE.PlaneGeometry(2.4, 0.34);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: null, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.mesh.visible = false;
    scene.add(this.mesh);
    // bright comet head
    this.head = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.head.scale.setScalar(0.16);
    this.head.visible = false;
    scene.add(this.head);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.src = null;
    this.dst = null;
    this.speed = 0;
    this.t = 0;
    this.dist = 0;
    this.color = 0x5fd9ff;
    this.latencyMs = 0;
    this.id = 'PKT';
    // temp scratch
    this._toCam = new THREE.Vector3();
    this._vPerp = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._localX = new THREE.Vector3();
    this._cross = new THREE.Vector3();
  }
  launch(src, dst, color, latencyMs, id) {
    this.active = true;
    this.src = src.clone();
    this.dst = dst.clone();
    this.color = color;
    this.latencyMs = latencyMs;
    this.id = id;
    this.pos.copy(this.src);
    this.dist = this.src.distanceTo(this.dst) || 1;
    // speed chosen so a human can follow: ~0.6-1.4 world units/sec
    this.speed = 0.6 + Math.random() * 0.8;
    // gentle arc out of the chord for an orbital flight feel
    this.arc = 0.3 + Math.random() * 0.45;
    this.arcAxis = new THREE.Vector3(0, 1, 0);
    // travel direction (chord) — used to orient the tail
    this.vel.subVectors(this.dst, this.src).normalize();
    const tex = cometTextureFor(color);
    this.mesh.material.map = tex;
    this.mesh.material.needsUpdate = true;
    this.head.material.map = makeGlowTexture(color);
    this.head.material.needsUpdate = true;
    this.mesh.visible = true;
    this.head.visible = true;
    this.t = 0;
  }
  update(dt) {
    if (!this.active) return;
    const start = this.src;
    const end = this.dst;
    this.t += (dt * this.speed) / this.dist;
    if (this.t >= 1.0) {
      this.active = false;
      this.mesh.visible = false;
      this.head.visible = false;
      onPacketArrive(this);
      return;
    }
    const t = this.t;
    this.pos.lerpVectors(start, end, t);
    // arc bulge perpendicular to chord
    const dir = this.vel;
    this._cross.crossVectors(dir, this.arcAxis);
    if (this._cross.lengthSq() > 1e-6) this._cross.normalize();
    else this._cross.set(0, 1, 0);
    this.pos.addScaledVector(this._cross, Math.sin(Math.PI * t) * this.arc);
    this.mesh.position.copy(this.pos);
    this.head.position.copy(this.pos);

    // ---- orient the comet so its tail streams behind the velocity, while
    //      keeping it readable from any camera angle (billboard + screen-rot) ----
    this._toCam.subVectors(camera.position, this.pos).normalize();
    // face the camera: rotate +Z to point from plane toward camera
    this._q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this._toCam);
    this.mesh.quaternion.copy(this._q);
    // project velocity onto the camera plane to get screen-space travel dir
    this._vPerp.copy(this.vel);
    this._vPerp.addScaledVector(this._toCam, -this.vel.dot(this._toCam));
    if (this._vPerp.lengthSq() > 1e-4) {
      this._vPerp.normalize();
      // rotate about the view axis so local -X (tail) points opposite travel
      this._localX.set(1, 0, 0).applyQuaternion(this._q);
      const axis = this._toCam;
      this._cross.crossVectors(this._localX, this._vPerp);
      const angle = Math.atan2(this._cross.dot(axis), this._localX.dot(this._vPerp));
      this._q2.setFromAxisAngle(axis, angle);
      this.mesh.quaternion.premultiply(this._q2);
    }
    // pulse the tail + fade it near the destination
    const pulse = 0.9 + Math.sin(t * 18) * 0.12;
    this.mesh.scale.set(pulse, 1, 1);
    this.mesh.material.opacity = Math.max(0.4, 1 - t * 0.35);
    this.head.material.opacity = Math.max(0.6, 1 - t * 0.3);
    // keep the head at the leading edge of the streak
    this.head.position.addScaledVector(this.vel, 0.9);
  }
  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this.head.visible = false;
  }
}

// Packet spawn management
let packetPool = [];
for (let i = 0; i < MAX_PACKETS; i++) packetPool.push(new Packet());
let activePackets = 0;
let delivered = 0;
let pktCounter = 0;
let totalBytes = 0;

function spawnPacket() {
  // pick a random source/target
  const isDown = Math.random() < 0.45;
  let src, dst, color;
  // snapshot positions at launch so packets fly to a fixed target
  const snap = (sat) => sat.userData._worldPos.clone();
  if (isDown && stations.length) {
    // ground station -> satellite
    src = stationPoints[(Math.random() * stations.length) | 0].clone();
    const sat = satellites[(Math.random() * satellites.length) | 0];
    dst = snap(sat);
    color = sat.userData.color;
  } else {
    // satellite <-> satellite
    const a = satellites[(Math.random() * satellites.length) | 0];
    const b = satellites[(Math.random() * satellites.length) | 0];
    if (a === b) return;
    src = snap(a); dst = snap(b);
    color = a.userData.color;
  }
  const pkt = packetPool.find(p => !p.active);
  if (!pkt) return;
  const latency = 40 + Math.random() * 240;
  pkt.launch(src, dst, color, latency, `PKT-${++pktCounter}`);
  activePackets++;
  const bytes = 2 + Math.random() * 40; // MB
  totalBytes += bytes;
}

function satPos(sat) {
  const s = sat.userData;
  // recompute world pos from orbit params (kept in sync in update loop)
  return sat.userData._worldPos || sat.position;
}

function onPacketArrive(pkt) {
  activePackets--;
  delivered++;
  lastDeliveredBytes += 1 + Math.random() * 20;
  lastDeliveredLatency = pkt.latencyMs;
}
let lastDeliveredBytes = 0;
let lastDeliveredLatency = 0;
let tputAccum = 0;
let tputTimer = 0;

// ---------- Satellite position update (Keplerian-ish) ----------
function updateSatellitePositions(dt) {
  const now = performance.now() / 1000;
  satellites.forEach((sat) => {
    const d = sat.userData;
    // advance mean anomaly slowly; GEO stays put
    const speed = d.speed || 0;
    const angle = d.phase + now * (speed || 0) * 60; // scaled for human-readable
    // position on inclined orbit
    // RAAN rotation about Y, then inclination about X, then anomaly
    const r = d.radius;
    const x0 = r * Math.cos(angle);
    const z0 = r * Math.sin(angle);
    const y0 = 0;
    // inclination (tilt about X)
    const cosI = Math.cos(d.incl), sinI = Math.sin(d.incl);
    const y1 = y0 * cosI - z0 * sinI;
    const z1 = y0 * sinI + z0 * cosI;
    // RAAN (rotate about Y)
    const cosR = Math.cos(d.raan), sinR = Math.sin(d.raan);
    const x2 = x0 * cosR + z1 * sinR;
    const z2 = -x0 * sinR + z1 * cosR;
    sat.position.set(x2, y1, z2);
    d._worldPos = sat.position;
  });
}

// ---------- UI / clock ----------
const timeEl = document.getElementById('time');
const dateEl = document.getElementById('date');
const sFlight = document.getElementById('s-flight');
const sDelivered = document.getElementById('s-delivered');
const sTput = document.getElementById('s-tput');
const sLat = document.getElementById('s-lat');
const lPkts = document.getElementById('l-pkts');
const lSats = document.getElementById('l-sats');
const lStns = document.getElementById('l-stns');

function updateClock() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  dateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ---------- Post-processing (bloom) ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.1,   // strength
  0.6,   // radius
  0.25   // threshold
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- Raycaster for node selection ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const selectables = [...satellites, ...stations];
const infoEl = document.createElement('div');
infoEl.className = 'hud panel';
infoEl.id = 'info';
infoEl.style.cssText = 'top:70px;left:28px;width:240px;display:none;font-size:11.5px;line-height:1.6;';
app.appendChild(infoEl);

renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(selectables, true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && !obj.userData.name) obj = obj.parent;
    if (obj) {
      const d = obj.userData;
      if (d.type === 'station') {
        infoEl.innerHTML = `<h3 style="color:#7dffb0;font-size:11px;letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 12px #7dffb0">GROUND STATION</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:13px;margin-bottom:6px">${d.name}</div>
          <div><span style="color:#7fa3c4">Lat</span> ${d.lat.toFixed(2)}&deg;</div>
          <div><span style="color:#7fa3c4">Lon</span> ${d.lon.toFixed(2)}&deg;</div>`;
      } else {
        infoEl.innerHTML = `<h3 style="color:${'#'+d.color.toString(16).padStart(6,'0')};font-size:11px;letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 12px ${'#'+d.color.toString(16).padStart(6,'0')}">SATELLITE</h3>
          <div style="color:#eaf7ff;font-weight:600;font-size:13px;margin-bottom:6px">${d.name}</div>
          <div><span style="color:#7fa3c4">Constellation</span> ${d.label}</div>
          <div><span style="color:#7fa3c4">Inclination</span> ${(d.incl*180/Math.PI).toFixed(1)}&deg;</div>
          <div><span style="color:#7fa3c4">Altitude</span> ${(d.radius - EARTH_RADIUS).toFixed(2)} R</div>`;
      }
      infoEl.style.display = 'block';
    }
  } else {
    infoEl.style.display = 'none';
  }
});

// ---------- Loop ----------
let paused = false;
let lastTime = performance.now();
let packetTimer = 0;
let clockTimer = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!paused) {
    // clock
    clockTimer += dt;
    if (clockTimer > 1) { updateClock(); clockTimer = 0; }

    updateSatellitePositions(dt);
    clouds.rotation.y += dt * 0.0025;

    // spawn packets at a human-readable rate
    packetTimer -= dt;
    if (packetTimer <= 0) {
      spawnPacket();
      packetTimer = 0.5 + Math.random() * 0.8; // ~1-2/s
    }

    // update packets
    let inFlight = 0;
    for (const p of packetPool) { if (p.active) { p.update(dt); inFlight++; } }

    // telemetry
    tputAccum += lastDeliveredBytes;
    tputTimer += dt;
    if (tputTimer > 1) {
      // throughput in Mb/s (bytes * 8 / sec)
      sTput.textContent = (tputAccum * 8).toFixed(1) + ' Mb/s';
      tputAccum = 0; tputTimer = 0;
    }
    sFlight.textContent = inFlight;
    sDelivered.textContent = delivered.toLocaleString();
    sLat.textContent = lastDeliveredLatency ? lastDeliveredLatency.toFixed(0) + ' ms' : '—';
    lPkts.textContent = inFlight;
    lSats.textContent = satellites.length;
    lStns.textContent = stations.length;

    // atmosphere shader needs camera position
    atmosMat.uniforms.viewVector.value.copy(camera.position);
  }

  controls.update();
  composer.render();
}

// ---------- Pause toggle (Space) ----------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); paused = !paused; }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Init + veil ----------
updateClock();
const veil = document.getElementById('veil');
const veilBar = document.getElementById('veilbar');
const veilStatus = document.getElementById('veilstatus');
// Show loading progress, then reliably fade the veil once the first frames
// are rendering (with a hard fallback so it never gets stuck).
let loadedTex = 0, totalTex = 5;
function texLoaded() {
  loadedTex++;
  veilBar.style.width = Math.min(100, (loadedTex / totalTex) * 100) + '%';
}
function hideVeil() {
  veilStatus.textContent = 'Network online';
  veilBar.style.width = '100%';
  setTimeout(() => veil.classList.add('hidden'), 300);
}
// progress from texture loads
[texAtmos, texNormal, texSpec, texClouds, texLights].forEach(t => {
  if (t.image && t.image.complete) texLoaded();
  else t.addEventListener('load', texLoaded);
});
// force-hide once the animation loop is provably drawing (frame count)
let veilFrames = 0;
const veilTicker = setInterval(() => {
  veilFrames++;
  if (veilFrames >= 3) {
    clearInterval(veilTicker);
    hideVeil();
  }
}, 350);
// absolute fallback: never block the scene behind the veil
setTimeout(hideVeil, 6000);

requestAnimationFrame(animate);
