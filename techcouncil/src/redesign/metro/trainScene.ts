import * as THREE from 'three';

/**
 * The metro hero: a sleek bullet train crossing Tashkent at night on an
 * elevated line. Built from code (no model files). It renders only when
 * asked (scroll changes or a resize), never on an idle loop.
 */

const PETALS = [0xf29839, 0x951e34, 0x07686e, 0x0897b6];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded train cross-section: flat floor, tall sides, a domed roof. */
function profile(w: number, h: number) {
  const s = new THREE.Shape();
  const r = w * 0.42;
  s.moveTo(-w / 2 + 0.06, 0);
  s.lineTo(w / 2 - 0.06, 0);
  s.quadraticCurveTo(w / 2, 0, w / 2, 0.08);
  s.lineTo(w / 2, h - r);
  s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h);
  s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.lineTo(-w / 2, 0.08);
  s.quadraticCurveTo(-w / 2, 0, -w / 2 + 0.06, 0);
  return s;
}

const W = 1.0; // body width
const H = 1.15; // body height

/** A straight car body, its length along +x. */
function carBody(len: number, mat: THREE.Material) {
  const g = new THREE.ExtrudeGeometry(profile(W, H), { depth: len, steps: 1, bevelEnabled: false, curveSegments: 10 });
  g.rotateY(Math.PI / 2); // extrude axis z -> x
  g.translate(0, 0, 0);
  return new THREE.Mesh(g, mat);
}

/**
 * The nose: the same section extruded, then pulled into a long low point
 * like a high-speed train, with the cab glass set into its slope.
 */
function noseBody(len: number, mat: THREE.Material) {
  const g = new THREE.ExtrudeGeometry(profile(W, H), { depth: len, steps: 36, bevelEnabled: false, curveSegments: 12 });
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const t = Math.min(1, Math.max(0, z / len)); // 0 at the car, 1 at the tip
    const x = p.getX(i);
    let y = p.getY(i);
    // Height falls steeply then flattens into a beak near the rail.
    const hScale = Math.pow(Math.max(0, 1 - Math.pow(t, 1.6)), 0.9);
    const floor = 0.18 * Math.pow(t, 2);
    y = floor + (y - 0) * Math.max(0.06, hScale) * (1 - floor * 0.6);
    const wScale = Math.pow(Math.max(0, 1 - Math.pow(t, 2.4)), 0.55);
    p.setXYZ(i, x * Math.max(0.08, wScale), y, z);
  }
  g.computeVertexNormals();
  g.rotateY(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,240,210,0.6)');
  gr.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowsTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, 64, 128);
  const r = rng(seed);
  for (let y = 4; y < 124; y += 8)
    for (let x = 4; x < 60; x += 8) {
      if (r() < 0.38) {
        ctx.fillStyle = r() < 0.75 ? '#f6c46a' : '#cfe3ff';
        ctx.globalAlpha = 0.5 + r() * 0.5;
        ctx.fillRect(x, y, 4, 5);
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface TrainScene {
  /** p: 0..1 scroll progress through the hero. */
  render: (p: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function createTrainScene(canvas: HTMLCanvasElement, opts: { narrow: boolean }): TrainScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const night = new THREE.Color('#0a0e1c');
  scene.background = night;
  scene.fog = new THREE.Fog(night, 18, 90);

  // Sky: a dome graded from deep navy to a warm city glow at the horizon.
  {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const gr = ctx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#05070f');
    gr.addColorStop(0.55, '#121a33');
    gr.addColorStop(0.8, '#3a2a3f');
    gr.addColorStop(1, '#7a4a3a');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 12), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }));
    sky.rotation.x = Math.PI;
    scene.add(sky);
  }

  // Light: moonlit fill, a warm key from the city, cool rim.
  scene.add(new THREE.HemisphereLight(0x8fa6ff, 0x2a1a14, 0.55));
  const key = new THREE.DirectionalLight(0xffd2a0, 1.6);
  key.position.set(6, 5, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.2);
  rim.position.set(-8, 6, -6);
  scene.add(rim);

  // The viaduct and rails, running along x.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(400, 0.35, 2.6), new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.9 }));
  deck.position.set(0, -0.32, 0);
  scene.add(deck);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.9, roughness: 0.3 });
  for (const z of [-0.38, 0.38]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(400, 0.05, 0.05), railMat);
    rail.position.set(0, -0.12, z);
    scene.add(rail);
  }
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x1d1f25, roughness: 0.95 });
  const pierGeo = new THREE.BoxGeometry(0.9, 14, 1.4);
  const piers = new THREE.InstancedMesh(pierGeo, pierMat, 40);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) {
    m4.makeTranslation(-120 + i * 6, -7.5, 0);
    piers.setMatrixAt(i, m4);
  }
  scene.add(piers);

  // Lamps along the line: they streak past as the camera tracks the train.
  const glow = glowTexture();
  const lampMat = new THREE.SpriteMaterial({ map: glow, color: 0xffc27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  for (let i = 0; i < 70; i++) {
    const s = new THREE.Sprite(lampMat);
    s.position.set(-120 + i * 3.5, 1.9, i % 2 ? 2.2 : -2.2);
    s.scale.setScalar(0.9);
    scene.add(s);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.06), pierMat);
    post.position.set(s.position.x, 0.8, s.position.z);
    scene.add(post);
  }

  // Tashkent at night: blocks of lit windows, a TV-tower silhouette on the horizon.
  {
    const r = rng(11);
    const mats = [1, 2, 3].map((k) => new THREE.MeshStandardMaterial({ color: 0x0c0f16, emissive: 0xffffff, emissiveMap: windowsTexture(k), emissiveIntensity: 0.9, roughness: 1 }));
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const count = 260;
    const groups = mats.map((m) => new THREE.InstancedMesh(geo, m, count));
    const n = [0, 0, 0];
    for (let i = 0; i < count * 3; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const z = side * (8 + r() * 60);
      const x = -140 + r() * 280;
      const h = 3 + Math.pow(r(), 2) * (Math.abs(z) > 30 ? 22 : 12);
      const w = 2 + r() * 4;
      const k = i % 3;
      if (n[k]! >= count) continue;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, h / 2 - 14, z), new THREE.Quaternion(), new THREE.Vector3(w, h, 2 + r() * 4));
      groups[k]!.setMatrixAt(n[k]!++, m);
    }
    groups.forEach((g, k) => {
      g.count = n[k]!;
      scene.add(g);
    });
    // The Tashkent TV Tower, far off.
    const tower = new THREE.Group();
    const tMat = new THREE.MeshBasicMaterial({ color: 0x0d1020, fog: false });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 34, 8), tMat);
    shaft.position.y = 3;
    tower.add(shaft);
    const pod = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), tMat);
    pod.scale.y = 0.6;
    pod.position.y = 12;
    tower.add(pod);
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff3b3b, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    beacon.position.y = 20.5;
    beacon.scale.setScalar(2.2);
    tower.add(beacon);
    tower.position.set(30, -14, -95);
    scene.add(tower);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -14;
    scene.add(ground);
  }

  // The train.
  const train = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: 0xeef0f2, metalness: 0.35, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x14171d, metalness: 0.6, roughness: 0.15, clearcoat: 1 });
  const carLen = 6.2;
  const gap = 0.12;
  const noseLen = 3.4;
  const cars = 3;
  for (let c = 0; c < cars; c++) {
    const x0 = -(c + 1) * (carLen + gap);
    const car = carBody(carLen, body);
    car.position.x = x0;
    train.add(car);
    // Window band along each side.
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(carLen - 0.5, 0.26), dark);
      band.position.set(x0 + carLen / 2, 0.72, (s * W) / 2 + s * 0.004);
      band.rotation.y = s > 0 ? 0 : Math.PI;
      train.add(band);
      // Livery: the four petal colours run down the train.
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(carLen - 0.1, 0.07), new THREE.MeshStandardMaterial({ color: PETALS[c % 4], emissive: PETALS[c % 4], emissiveIntensity: 0.25 }));
      stripe.position.set(x0 + carLen / 2, 0.42, (s * W) / 2 + s * 0.005);
      stripe.rotation.y = s > 0 ? 0 : Math.PI;
      train.add(stripe);
    }
  }
  const nose = noseBody(noseLen, body);
  train.add(nose);
  // Cab glass and the livery sweeping into the nose.
  for (const s of [-1, 1]) {
    const sweep = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.07), new THREE.MeshStandardMaterial({ color: PETALS[0], emissive: PETALS[0], emissiveIntensity: 0.3 }));
    sweep.position.set(0.9, 0.38, (s * W) / 2 * 0.86 + s * 0.02);
    sweep.rotation.set(0, s > 0 ? -0.22 : Math.PI + 0.22, -0.16 * s * 0 - 0.14);
    train.add(sweep);
  }
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  glass.scale.set(0.95, 0.32, 0.4);
  glass.rotation.z = -0.5;
  glass.position.set(1.15, 0.86, 0);
  train.add(glass);
  // Headlights: two lamps and their glow on the line ahead.
  for (const z of [-0.26, 0.26]) {
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff3dd, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    lamp.position.set(noseLen - 0.45, 0.24, z);
    lamp.scale.setScalar(0.7);
    train.add(lamp);
  }
  const beam = new THREE.SpotLight(0xfff1d6, 30, 30, 0.35, 0.6, 1.5);
  beam.position.set(noseLen - 0.2, 0.3, 0);
  beam.target.position.set(noseLen + 10, -0.2, 0);
  train.add(beam, beam.target);
  // Cabin glow under the windows, so the train reads as lit inside.
  const inner = new THREE.PointLight(0xffd9a0, 4, 6);
  inner.position.set(-carLen, 0.7, 0);
  train.add(inner);
  scene.add(train);

  const camera = new THREE.PerspectiveCamera(opts.narrow ? 52 : 34, 1, 0.1, 400);

  const resize = (w: number, h: number) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const tmp = new THREE.Vector3();

  const render = (p: number) => {
    const t = ease(Math.min(1, Math.max(0, p)));
    // The train drives left to right across the city.
    const tx = lerp(-16, 22, t);
    train.position.x = tx;
    // Camera: starts low on the train's front quarter (the hero shot), then
    // swings out to a tracking side view as it passes, and lets it go.
    const front = { x: tx + 9.5, y: 0.7, z: 8.4 };
    const side = { x: lerp(-2, 12, t), y: 2.2, z: 11 };
    const k = Math.min(1, t * 1.6);
    camera.position.set(lerp(front.x, side.x, k), lerp(front.y, side.y, k), lerp(front.z, side.z, k));
    // At rest the train sits in the right half, clear of the headline.
    tmp.set(tx - lerp(opts.narrow ? 1.5 : 4.2, 4, k), lerp(opts.narrow ? -0.6 : 0.2, 0.55, k), 0);
    camera.lookAt(tmp);
    renderer.render(scene, camera);
  };

  const dispose = () => {
    renderer.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
  };

  return { render, resize, dispose };
}
