// Nova 18 Pro: a real-time 3D phone built from primitives (no model file).
// Units are roughly centimetres: 7.8 x 16.3 x 0.83, like a 6.9" phone.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const COLORS = {
  ember:   { name: 'Ember',   metal: 0x5b1e26, glass: 0x4a1820, screen: ['#2b0a10', '#b5384a'] },
  glacier: { name: 'Glacier', metal: 0xc9ccd1, glass: 0xd7d9dd, screen: ['#1b2433', '#9fb4d0'] },
  abyss:   { name: 'Abyss',   metal: 0x1f2a3d, glass: 0x18212f, screen: ['#05080f', '#3b5d9a'] },
};

const W = 7.8, H = 16.3, D = 0.83, R = 1.15, BEVEL = 0.16;

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ShapeGeometry UVs are in shape units; remap them to 0..1 so textures fit.
function planarUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return geo;
}

function extrudeRounded(w, h, r, depth, bevel, segs = 6) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(r - bevel, 0.01)), {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 24,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function wallpaper(colors, label) {
  const c = document.createElement('canvas');
  c.width = 780; c.height = 1630;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, colors[0]); grad.addColorStop(1, '#000');
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  // A soft folded-light shape in the finish colour, like a product wallpaper.
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const rg = g.createRadialGradient(390 + (i - 1) * 180, 980 + i * 120, 20, 390 + (i - 1) * 180, 980 + i * 120, 520 - i * 90);
    rg.addColorStop(0, colors[1]); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.55 - i * 0.12; g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.textAlign = 'center';
  g.font = '600 34px Inter, system-ui, sans-serif';
  g.fillText(label, 390, 250);
  g.font = '600 200px Inter, system-ui, sans-serif';
  g.fillText('10:08', 390, 450);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildPhone(colorKey = 'ember') {
  const col = COLORS[colorKey];
  const group = new THREE.Group();
  const mats = {
    metal: new THREE.MeshPhysicalMaterial({ color: col.metal, metalness: 0.9, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.25 }),
    back: new THREE.MeshPhysicalMaterial({ color: col.glass, metalness: 0.6, roughness: 0.46, clearcoat: 0.7, clearcoatRoughness: 0.4 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: col.metal, metalness: 0.92, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    ring: new THREE.MeshPhysicalMaterial({ color: 0x2a2a2d, metalness: 1, roughness: 0.18 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x05060a, metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 1, sheenColor: new THREE.Color(0x3a4aa0) }),
    inner: new THREE.MeshPhysicalMaterial({ color: 0x0b0d1a, metalness: 0.5, roughness: 0.1, iridescence: 1, iridescenceIOR: 1.6 }),
    glassBlack: new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0, roughness: 0.04, clearcoat: 1 }),
    screen: new THREE.MeshBasicMaterial({ map: wallpaper(col.screen, 'Saturday, October 3'), toneMapped: false }),
    flash: new THREE.MeshPhysicalMaterial({ color: 0xf2ead8, roughness: 0.3, transmission: 0.3 }),
    button: new THREE.MeshPhysicalMaterial({ color: col.metal, metalness: 0.95, roughness: 0.25 }),
  };

  // Body
  const body = new THREE.Mesh(extrudeRounded(W, H, R, D - BEVEL * 2, BEVEL), mats.metal);
  group.add(body);

  // Front glass and screen
  const front = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - 0.12, H - 0.12, R - 0.06), 24), mats.glassBlack);
  front.position.z = D / 2 + 0.002; group.add(front);
  const sw = W - 0.42, sh = H - 0.42;
  const screen = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(roundedRect(sw, sh, R - 0.22), 24), sw, sh), mats.screen);
  screen.position.z = D / 2 + 0.004; group.add(screen);
  const island = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(2.1, 0.62, 0.31), 16), mats.glassBlack);
  island.position.set(0, H / 2 - 0.85, D / 2 + 0.006); group.add(island);

  // Back panel (rotated to face -z)
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W - 0.14, H - 0.14, R - 0.07), 24), mats.back);
  back.rotation.y = Math.PI; back.position.z = -D / 2 - 0.002; group.add(back);

  // Full-width camera plateau
  const plateauH = 4.5, plateauD = 0.16;
  const plateau = new THREE.Mesh(extrudeRounded(W - 0.18, plateauH, R - 0.1, plateauD - 0.08, 0.04, 4), mats.plateau);
  plateau.position.set(0, H / 2 - plateauH / 2 - 0.09, -D / 2 - plateauD / 2);
  group.add(plateau);
  const camZ = -D / 2 - plateauD;

  // Three lenses in a triangle on the left, flash and sensor on the right.
  const lensSpots = [[-2.2, H / 2 - 1.25], [-2.2, H / 2 - 3.35], [-0.5, H / 2 - 2.3]];
  const cyl = (r, h, m) => { const g = new THREE.CylinderGeometry(r, r, h, 48); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, m); };
  for (const [x, y] of lensSpots) {
    const ring = cyl(0.98, 0.2, mats.ring); ring.position.set(x, y, camZ - 0.1); group.add(ring);
    const glass = cyl(0.76, 0.06, mats.lens); glass.position.set(x, y, camZ - 0.21); group.add(glass);
    const inner = cyl(0.32, 0.02, mats.inner); inner.position.set(x, y, camZ - 0.245); group.add(inner);
  }
  const flash = cyl(0.36, 0.06, mats.flash); flash.position.set(2.3, H / 2 - 1.25, camZ - 0.03); group.add(flash);
  const sensor = cyl(0.3, 0.06, mats.glassBlack); sensor.position.set(2.3, H / 2 - 3.35, camZ - 0.03); group.add(sensor);
  const mic = cyl(0.08, 0.04, mats.glassBlack); mic.position.set(2.3, H / 2 - 2.3, camZ - 0.02); group.add(mic);

  // Side buttons
  const btn = (w, h, x, y) => { const m = new THREE.Mesh(extrudeRounded(0.14, h, 0.06, 0.08, 0.03, 3), mats.button); m.rotation.y = Math.PI / 2; m.position.set(x, y, 0); group.add(m); };
  btn(0.14, 2.4, W / 2 + 0.03, 3.4);      // side button
  btn(0.14, 1.6, W / 2 + 0.03, -1.6);     // camera control
  btn(0.14, 0.9, -W / 2 - 0.03, 4.6);     // action button
  btn(0.14, 1.5, -W / 2 - 0.03, 2.8);     // volume up
  btn(0.14, 1.5, -W / 2 - 0.03, 1.0);     // volume down

  group.userData = { mats, colorKey };
  return group;
}

export function setPhoneColor(phone, key) {
  const col = COLORS[key], m = phone.userData.mats;
  m.metal.color.setHex(col.metal); m.plateau.color.setHex(col.metal); m.button.color.setHex(col.metal); m.back.color.setHex(col.glass);
  m.screen.map.dispose(); m.screen.map = wallpaper(col.screen, 'Saturday, October 3'); m.screen.needsUpdate = true;
  phone.userData.colorKey = key;
}

// A canvas viewer: renderer, studio lighting, camera, render-on-demand loop.
export function createViewer(canvas, { fov = 26, distance = 46, env = 0.6, keyLight = 2.0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = env;

  // Dark-studio look: a strong key from above-left, cool rim from behind-right.
  const key = new THREE.DirectionalLight(0xffffff, keyLight); key.position.set(-12, 20, 18); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd2ff, 2.6); rim.position.set(16, 6, -20); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(10, -8, 14); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(0, 0, distance);

  let dirty = true, visible = true;
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dirty = true;
  };
  new ResizeObserver(resize).observe(canvas);
  // Pause rendering while off screen (content never depends on this).
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) dirty = true; }).observe(canvas);
  resize();

  const loop = () => {
    if (visible && dirty) { renderer.render(scene, camera); dirty = false; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return { scene, camera, renderer, invalidate: () => { dirty = true; } };
}
