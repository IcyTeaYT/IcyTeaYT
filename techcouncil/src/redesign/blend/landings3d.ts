import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Four cinematic landings, each one camera move in a lit 3D scene, finished
 * like film (bloom, vignette, grain). `p` is the landing's scroll progress
 * (0 → 1: the move ends filling the frame); `t` is time in seconds, for
 * the life in the shot while the page rests.
 */
export type Landing3D = 'silk' | 'bluedome' | 'rishtan' | 'silkroad';

export interface LandingScene {
  render(p: number, t: number): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shared GLSL: hash, value noise and fbm. */
const NOISE = /* glsl */ `
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
`;

/** The film finish: vignette, a touch of warmth, grain, and a fade to black. */
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFade: { value: 0 }, uVig: { value: 1.1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uFade; uniform float uVig; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = vUv - 0.5;
      c *= 1.0 - uVig * dot(q, q) * 1.6;
      c = mix(c, c * vec3(1.04, 1.0, 0.95), 0.6);
      c += (h(vUv * 900.0 + fract(uTime) * 37.0) - 0.5) * 0.045;
      gl_FragColor = vec4(c * (1.0 - uFade), 1.0);
    }`,
};

function setup(canvas: HTMLCanvasElement, bloom: [number, number, number]) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 2000);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom[0], bloom[1], bloom[2]);
  composer.addPass(bloomPass);
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  const resize = (w: number, h: number) => {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    composer.dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, composer, finish, bloomPass, resize, dispose };
}

function stars(n: number, radius: number, seed = 3) {
  const pos = new Float32Array(n * 3);
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const th = r() * Math.PI * 2;
    const ph = Math.acos(lerp(0.05, 1, r()));
    pos.set([radius * Math.sin(ph) * Math.cos(th), radius * Math.cos(ph), radius * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.75, depthWrite: false }));
}

function glowSprite(color: string, size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color.replace('1)', '0.45)'));
  g.addColorStop(1, color.replace('1)', '0)'));
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1);
  return s;
}

/* ------------------------------------------------------------------ */
/* 1. Flowing ikat silk                                                 */
/* ------------------------------------------------------------------ */

function silk(canvas: HTMLCanvasElement, narrow: boolean): LandingScene {
  const k = setup(canvas, [0.22, 0.5, 0.9]);
  const uni = { uTime: { value: 0 }, uWind: { value: 1 } };
  const W = 16;
  const H = 9;
  const geo = new THREE.PlaneGeometry(W, H, 220, 130);
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uWind;
      varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      float h(vec2 p){
        float t = uTime;
        float a = 0.62 * sin(p.x * 0.42 + t * 0.55) * (0.6 + 0.4 * sin(p.y * 0.33 + t * 0.21));
        a += 0.34 * sin(p.x * 0.85 - p.y * 0.55 + t * 0.95);
        a += 0.16 * sin(p.x * 1.7 + p.y * 1.25 - t * 1.45);
        a += 0.22 * sin(p.y * 0.75 + t * 0.42 + p.x * 0.15);
        return a * uWind;
      }
      void main(){
        vUv = uv;
        vec3 p = position;
        float e = 0.02;
        float z = h(p.xy);
        vec3 dx = vec3(e, 0.0, h(p.xy + vec2(e, 0.0)) - z);
        vec3 dy = vec3(0.0, e, h(p.xy + vec2(0.0, e)) - z);
        p.z += z;
        vN = normalize(normalMatrix * normalize(cross(dx, dy)));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      vec3 ikat(vec2 uv){
        // Warp ikat: motifs run along the warp (v), their edges feathered where the dye bled into the threads.
        float thread = (noise(vec2(uv.x * 420.0, uv.y * 3.0)) - 0.5) * 0.055 + (noise(vec2(uv.x * 60.0, uv.y * 1.5)) - 0.5) * 0.05;
        float u = uv.x * 7.0;
        float col = floor(u);
        float fu = fract(u);
        float zig = abs(fract(uv.y * 5.0 + abs(fu - 0.5) * 0.9 + col * 0.37) - 0.5) * 2.0 + thread;
        float diamond = abs(fu - 0.5) * 2.0 + abs(fract(uv.y * 5.0 + 0.25) - 0.5) * 1.3 + thread;
        vec3 cream = vec3(0.93, 0.86, 0.72), indigo = vec3(0.07, 0.09, 0.22);
        vec3 orange = vec3(0.95, 0.58, 0.20), maroon = vec3(0.58, 0.10, 0.20), teal = vec3(0.04, 0.42, 0.44), cyan = vec3(0.05, 0.60, 0.74);
        vec3 band = mod(col, 4.0) < 1.0 ? orange : mod(col, 4.0) < 2.0 ? maroon : mod(col, 4.0) < 3.0 ? teal : cyan;
        vec3 c = indigo;
        c = mix(c, band, smoothstep(0.62, 0.52, zig));
        c = mix(c, cream, smoothstep(0.3, 0.2, zig));
        c = mix(c, mod(col, 2.0) < 1.0 ? cyan : orange, smoothstep(0.42, 0.32, diamond));
        c = mix(c, indigo, smoothstep(0.16, 0.08, diamond));
        return c;
      }
      void main(){
        vec3 n = normalize(vN);
        vec3 v = normalize(-vP);
        if (dot(n, v) < 0.0) n = -n;
        vec3 base = ikat(vUv);
        vec3 key = normalize(vec3(-0.5, 0.8, 0.6));
        vec3 rimL = normalize(vec3(0.7, -0.2, -0.6));
        float wrap = clamp((dot(n, key) + 0.35) / 1.35, 0.0, 1.0);
        vec3 hv = normalize(key + v);
        // Satin: a long, soft highlight along the folds, and a sheen at grazing angles.
        float spec = pow(max(dot(n, hv), 0.0), 48.0) * 0.45 + pow(max(dot(n, hv), 0.0), 8.0) * 0.05;
        float sheen = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.3;
        float rim = pow(max(dot(n, rimL), 0.0), 2.0) * 0.25;
        vec3 c = base * (0.06 + 0.8 * wrap) + vec3(1.0, 0.92, 0.8) * spec + base * sheen + vec3(0.3, 0.6, 0.8) * rim;
        float fall = smoothstep(26.0, 8.0, length(vP));
        gl_FragColor = vec4(c * fall, 1.0);
      }`,
  });
  const cloth = new THREE.Mesh(geo, mat);
  cloth.rotation.set(-0.42, 0.28, 0.12);
  k.scene.add(cloth);
  return {
    render(p, t) {
      uni.uTime.value = t + p * 6;
      uni.uWind.value = 1 + p * 0.6;
      // Wide, a little low → in close over the folds → through one, into the dark.
      const a = inOut(seg(p, 0, 0.7));
      const d = inOut(seg(p, 0.62, 1));
      const dist = lerp(narrow ? 15 : 11.5, 4.6, a) * lerp(1, 0.12, d);
      k.camera.fov = lerp(35, 48, d);
      k.camera.updateProjectionMatrix();
      k.camera.position.set(lerp(-2.5, 0.6, a), lerp(-1.6, 0.4, a), dist);
      k.camera.lookAt(lerp(0.6, 0, a), lerp(0.2, 0, a), 0);
      k.finish.uniforms.uTime!.value = t;
      k.finish.uniforms.uFade!.value = seg(p, 0.86, 1);
      k.composer.render();
    },
    resize: k.resize,
    dispose: k.dispose,
  };
}

/* ------------------------------------------------------------------ */
/* 2. The blue dome at night (after Gur-e-Amir)                          */
/* ------------------------------------------------------------------ */

function blueDome(canvas: HTMLCanvasElement, narrow: boolean): LandingScene {
  const k = setup(canvas, [0.55, 0.7, 0.75]);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){ float y = normalize(vP).y; vec3 c = mix(vec3(0.03, 0.05, 0.11), vec3(0.0, 0.005, 0.02), smoothstep(0.0, 0.6, y)); c = mix(vec3(0.07, 0.07, 0.1), c, smoothstep(-0.05, 0.12, y)); gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  k.scene.add(sky, stars(1400, 800));
  const moon = glowSprite('rgba(220,232,255,1)', 90);
  moon.position.set(-260, 330, -520);
  k.scene.add(moon);

  // The dome: a melon of 64 ribs on a drum, glazed turquoise, lit by the moon.
  const prof = [
    [0.0, 0.0],
    [1.12, 0.0],
    [1.28, 0.22],
    [1.36, 0.55],
    [1.3, 0.95],
    [1.08, 1.35],
    [0.72, 1.7],
    [0.36, 1.92],
    [0.08, 2.02],
    [0.0, 2.04],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const curve = new THREE.SplineCurve(prof);
  const domeGeo = new THREE.LatheGeometry(curve.getPoints(90), 360);
  const glazeVert = /* glsl */ `
    varying vec3 vN; varying vec3 vW; varying vec3 vO;
    uniform float uRibs;
    void main(){
      vec3 p = position;
      float phi = atan(p.z, p.x);
      float rib = pow(abs(cos(phi * uRibs * 0.5)), 0.7);
      float bulge = smoothstep(0.0, 0.3, p.y) * smoothstep(2.04, 1.4, p.y);
      p.xz *= 1.0 + 0.045 * rib * bulge;
      vO = p;
      vN = normalize(normalMatrix * normal);
      // Bend the normal across each rib so the light rolls over it.
      float d = -sin(phi * uRibs) * 0.55 * bulge;
      vec3 t = normalize(vec3(-sin(phi), 0.0, cos(phi)));
      vN = normalize(vN + normalMatrix * (t * d));
      vec4 w = modelMatrix * vec4(p, 1.0);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const domeMat = new THREE.ShaderMaterial({
    uniforms: { uRibs: { value: 64 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: glazeVert,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uCam; uniform float uRibs;
      varying vec3 vN; varying vec3 vW; varying vec3 vO;
      void main(){
        float phi = atan(vO.z, vO.x);
        vec2 tuv = vec2(phi * uRibs / 6.2831 * 3.0, vO.y * 30.0);
        vec2 f = fract(tuv) - 0.5;
        float joint = smoothstep(0.42, 0.5, max(abs(f.x), abs(f.y)));
        float tone = 0.85 + 0.3 * hash(floor(tuv));
        vec3 turq = vec3(0.12, 0.62, 0.66) * tone;
        // A white lozenge net in the glaze.
        float l = abs(fract(tuv.x * 0.25 + tuv.y * 0.125) - 0.5) + abs(fract(tuv.x * 0.25 - tuv.y * 0.125) - 0.5);
        turq = mix(turq, vec3(0.86, 0.9, 0.92), smoothstep(0.06, 0.0, abs(l - 0.5)) * 0.8);
        turq = mix(turq, turq * 0.4, joint);
        vec3 n = normalize(vN);
        vec3 v = normalize(uCam - vW);
        vec3 moon = normalize(vec3(-0.45, 0.6, -0.65));
        vec3 warm = normalize(vec3(0.6, 0.2, 0.75));
        vec3 hv = normalize(moon + v);
        float diff = max(dot(n, moon), 0.0) * 0.7 + max(dot(n, warm), 0.0) * 0.22 + 0.06;
        float spec = pow(max(dot(n, hv), 0.0), 90.0) * 1.6;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.35;
        vec3 c = turq * diff + vec3(0.85, 0.92, 1.0) * spec + vec3(0.25, 0.5, 0.7) * fres;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 1.55;
  k.scene.add(dome);

  // The drum: cobalt and white, a band of script-like glazed tile.
  const drumMat = new THREE.ShaderMaterial({
    uniforms: { uCam: domeMat.uniforms.uCam! },
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vO; void main(){ vO = position; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uCam; varying vec3 vN; varying vec3 vW; varying vec3 vO;
      void main(){
        float phi = atan(vO.z, vO.x);
        vec2 uv = vec2(phi * 4.0, vO.y * 2.4);
        vec3 c = vec3(0.08, 0.17, 0.42);
        float script = smoothstep(0.62, 0.66, fbm(vec2(uv.x * 6.0, uv.y * 14.0))) * step(0.35, fract(vO.y * 1.2 + 0.1)) * step(fract(vO.y * 1.2 + 0.1), 0.85);
        c = mix(c, vec3(0.9, 0.9, 0.86), script);
        float rule = smoothstep(0.03, 0.0, abs(fract(vO.y * 1.2 + 0.1) - 0.3)) + smoothstep(0.03, 0.0, abs(fract(vO.y * 1.2 + 0.1) - 0.9));
        c = mix(c, vec3(0.12, 0.6, 0.62), rule);
        vec3 n = normalize(vN); vec3 v = normalize(uCam - vW);
        vec3 moon = normalize(vec3(-0.45, 0.6, -0.65));
        float diff = max(dot(n, moon), 0.0) * 0.65 + 0.08 + max(dot(n, normalize(vec3(0.6,0.2,0.75))), 0.0) * 0.2;
        float spec = pow(max(dot(n, normalize(moon + v)), 0.0), 60.0) * 0.8;
        gl_FragColor = vec4(c * diff + vec3(0.8, 0.9, 1.0) * spec, 1.0);
      }`,
  });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.18, 1.6, 180, 1, true), drumMat);
  drum.position.y = 0.78;
  k.scene.add(drum);
  // A gold finial, and the mausoleum's body below in shadow.
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4ad5f, metalness: 1, roughness: 0.3, emissive: 0x3a2a10 });
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 0.5, 12), gold);
  fin.position.y = 3.8;
  k.scene.add(fin, new THREE.HemisphereLight(0x8fb3ff, 0x000000, 0.4));
  const moonLight = new THREE.DirectionalLight(0xcfe0ff, 1.4);
  moonLight.position.set(-4, 6, -6);
  k.scene.add(moonLight);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 3.4), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }));
  body.position.y = -0.82;
  k.scene.add(body);

  const target = new THREE.Vector3(0, 2.1, 0);
  return {
    render(p, t) {
      // Orbit round the dome under the stars, then a crash zoom into its glazed ribs.
      const orbit = inOut(seg(p, 0, 0.62));
      const crash = inOut(seg(p, 0.58, 0.95));
      const yaw = lerp(-0.9, 0.55, orbit) + t * 0.01;
      const r = lerp(narrow ? 10.5 : 8.2, 6.2, orbit) * lerp(1, 0.235, crash);
      const y = lerp(0.9, 2.6, orbit) + crash * 0.6;
      k.camera.position.set(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
      k.camera.fov = lerp(lerp(34, 30, orbit), 55, crash);
      k.camera.updateProjectionMatrix();
      k.camera.lookAt(target.x, lerp(target.y, 2.4, crash), target.z);
      domeMat.uniforms.uCam!.value.copy(k.camera.position);
      k.finish.uniforms.uTime!.value = t;
      k.finish.uniforms.uFade!.value = seg(p, 0.88, 1);
      k.composer.render();
    },
    resize: k.resize,
    dispose: k.dispose,
  };
}

/* ------------------------------------------------------------------ */
/* 3. A Rishtan plate on the wheel                                       */
/* ------------------------------------------------------------------ */

function rishtan(canvas: HTMLCanvasElement, narrow: boolean): LandingScene {
  const k = setup(canvas, [0.25, 0.5, 0.9]);
  const uni = { uPaint: { value: 0 }, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 } };
  const prof = [
    [0, 0.16],
    [1.5, 0.16],
    [1.9, 0.22],
    [2.08, 0.34],
    [2.12, 0.4],
    [2.18, 0.38],
    [2.0, 0.18],
    [1.6, 0.04],
    [0.9, 0.0],
    [0, 0.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const plateGeo = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(80), 220);
  const plateMat = new THREE.ShaderMaterial({
    uniforms: uni,
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vO; void main(){ vO = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uPaint; uniform vec3 uCam; uniform float uTime;
      varying vec3 vN; varying vec3 vW; varying vec3 vO;
      vec3 cobalt = vec3(0.07, 0.2, 0.52), ishkor = vec3(0.1, 0.55, 0.62), white = vec3(0.94, 0.92, 0.86), ochre = vec3(0.78, 0.5, 0.2), brown = vec3(0.25, 0.13, 0.07);
      vec3 pattern(float r, float a){
        vec3 c = ishkor;
        // Centre: an eight-petal rosette.
        float pet = r - 0.22 * (0.6 + 0.4 * abs(cos(a * 4.0)));
        c = mix(c, white, smoothstep(0.02, 0.0, pet));
        c = mix(c, cobalt, smoothstep(0.015, 0.0, r - 0.07));
        c = mix(c, brown, smoothstep(0.012, 0.0, abs(pet)) * 0.8);
        // Six pomegranates with leaves, around the well.
        float sa = mod(a + 3.14159 / 6.0, 3.14159 / 3.0) - 3.14159 / 6.0;
        vec2 q = vec2(cos(sa), sin(sa)) * r;
        float pom = length((q - vec2(0.52, 0.0)) * vec2(1.0, 1.25)) - 0.12;
        float leaf1 = length((q - vec2(0.5, 0.17)) * vec2(2.2, 1.0)) - 0.11;
        float leaf2 = length((q - vec2(0.5, -0.17)) * vec2(2.2, 1.0)) - 0.11;
        c = mix(c, cobalt, smoothstep(0.012, 0.0, min(leaf1, leaf2)));
        c = mix(c, ochre, smoothstep(0.012, 0.0, pom));
        c = mix(c, white, smoothstep(0.012, 0.0, pom + 0.06));
        c = mix(c, brown, smoothstep(0.01, 0.0, abs(pom)) * 0.9 + smoothstep(0.008, 0.0, abs(min(leaf1, leaf2))) * 0.7);
        // The border: a zigzag band between white rules, and a cobalt rim.
        float b = smoothstep(0.78, 0.785, r) * smoothstep(0.9, 0.895, r);
        float zz = abs(fract(a * 24.0 / 6.2831 + abs(fract((r - 0.78) * 9.0) - 0.5)) - 0.5);
        c = mix(c, mix(white, cobalt, step(0.25, zz)), b);
        c = mix(c, cobalt, smoothstep(0.92, 0.93, r));
        return c;
      }
      void main(){
        float r = length(vO.xz) / 2.18;
        float a = atan(vO.z, vO.x);
        vec3 bisque = vec3(0.82, 0.74, 0.62) * (0.9 + 0.1 * noise(vO.xz * 30.0));
        vec3 paint = pattern(r, a);
        // The brush paints outward from the centre; its wet edge glows a moment.
        float reach = uPaint * 1.15;
        float m = smoothstep(reach, reach - 0.04, r);
        vec3 c = mix(bisque, paint, m);
        vec3 n = normalize(vN); vec3 v = normalize(uCam - vW);
        vec3 key = normalize(vec3(-0.4, 1.0, 0.3));
        float diff = max(dot(n, key), 0.0) * 0.62 + 0.1;
        vec3 rf = reflect(-v, n);
        // Glaze: a soft studio window in the reflection, and a tight highlight.
        float window = smoothstep(0.75, 0.95, rf.y) * smoothstep(0.6, 0.2, abs(rf.x)) * smoothstep(0.6, 0.1, abs(rf.z)) * 0.18;
        float spec = pow(max(dot(n, normalize(key + v)), 0.0), 120.0) * 1.4;
        float glaze = m;
        vec3 col = c * diff + (vec3(1.0, 0.97, 0.9) * (spec + window)) * (0.25 + 0.75 * glaze);
        col += vec3(1.0, 0.8, 0.5) * smoothstep(0.03, 0.0, abs(r - reach)) * 0.6 * step(reach, 1.05);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.35, 96), new THREE.MeshStandardMaterial({ color: 0x24170e, roughness: 0.55, metalness: 0.05 }));
  wheel.position.y = -0.18;
  const spinner = new THREE.Group();
  spinner.add(plate, wheel);
  k.scene.add(spinner);
  const keyL = new THREE.SpotLight(0xffe2b8, 120, 0, 0.5, 0.6, 1.4);
  keyL.position.set(-3, 9, 3);
  k.scene.add(keyL, new THREE.AmbientLight(0x223040, 0.6));
  const dust = stars(300, 30, 11);
  (dust.material as THREE.PointsMaterial).color.set(0xffd8a8);
  (dust.material as THREE.PointsMaterial).opacity = 0.25;
  k.scene.add(dust);
  return {
    render(p, t) {
      uni.uPaint.value = Math.min(1, t / 4.5 + p * 1.6);
      spinner.rotation.y = t * 0.55 + p * 4;
      uni.uTime.value = t;
      // Three-quarter view at the wheel → overhead → down into the rosette at its heart.
      const rise = inOut(seg(p, 0, 0.6));
      const dive = Math.pow(seg(p, 0.55, 1), 2);
      const dist = lerp(narrow ? 9.5 : 7.2, 5.5, rise) * lerp(1, 0.05, dive);
      const ang = lerp(0.62, 1.52, rise);
      k.camera.position.set(lerp(-1.6, 0, rise) * (1 - dive), Math.sin(ang) * dist + 0.2, Math.cos(ang) * dist);
      k.camera.lookAt(0, 0.16, 0);
      uni.uCam.value.copy(k.camera.position);
      k.finish.uniforms.uTime!.value = t;
      k.finish.uniforms.uFade!.value = seg(p, 0.86, 1);
      k.composer.render();
    },
    resize: k.resize,
    dispose: k.dispose,
  };
}

/* ------------------------------------------------------------------ */
/* 4. Silk Road night flight                                            */
/* ------------------------------------------------------------------ */

function silkRoad(canvas: HTMLCanvasElement, narrow: boolean): LandingScene {
  const k = setup(canvas, [0.9, 0.55, 0.6]);
  k.scene.fog = new THREE.FogExp2(0x070b17, 0.0085);
  k.scene.background = new THREE.Color(0x070b17);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){ vec3 d = normalize(vP); float y = d.y; vec3 c = mix(vec3(0.03,0.045,0.1), vec3(0.0,0.0,0.02), smoothstep(0.0,0.5,y)); float glow = exp(-abs(y) * 14.0) * smoothstep(-0.2, 1.0, -d.z); c += vec3(0.55,0.32,0.12) * glow * 0.55; gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  k.scene.add(sky, stars(1800, 600, 5));
  const moon = glowSprite('rgba(230,236,255,1)', 60);
  moon.position.set(150, 180, -420);
  k.scene.add(moon);

  // Dunes, moonlit.
  const ter = new THREE.PlaneGeometry(600, 600, 260, 260);
  ter.rotateX(-Math.PI / 2);
  const tmat = new THREE.ShaderMaterial({
    uniforms: { fogColor: { value: new THREE.Color(0x070b17) }, fogDensity: { value: 0.0085 } },
    vertexShader: /* glsl */ `
      ${NOISE}
      varying vec3 vN; varying float vD;
      float H(vec2 p){ float r = 1.0 - abs(noise(p * 0.035) * 2.0 - 1.0); return r * r * 5.5 + fbm(p * 0.02) * 6.0 - 3.0 + noise(p * 0.4) * 0.12; }
      void main(){
        vec3 p = position;
        // Keep the trail itself flat-ish, where the caravan walks.
        float trail = smoothstep(4.0, 16.0, abs(p.x - sin(p.z * 0.02) * 10.0));
        float h = H(p.xz) * mix(0.25, 1.0, trail);
        float e = 0.6;
        float hx = H(p.xz + vec2(e, 0.0)) * mix(0.25, 1.0, trail);
        float hz = H(p.xz + vec2(0.0, e)) * mix(0.25, 1.0, trail);
        p.y = h;
        vN = normalize(vec3(h - hx, e, h - hz));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 fogColor; uniform float fogDensity; varying vec3 vN; varying float vD;
      void main(){
        vec3 moon = normalize(vec3(0.35, 0.55, -0.75));
        float l = max(dot(normalize(vN), moon), 0.0);
        vec3 sand = vec3(0.62, 0.5, 0.36);
        vec3 c = sand * (0.02 + 0.26 * pow(l, 1.4)) + vec3(0.03, 0.05, 0.11) * 0.35;
        float f = 1.0 - exp(-fogDensity * fogDensity * vD * vD);
        gl_FragColor = vec4(mix(c, fogColor, f), 1.0);
      }`,
  });
  k.scene.add(new THREE.Mesh(ter, tmat));

  // The caravan's lanterns along the trail.
  const N = 90;
  const lpos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const z = 40 - i * 4.2;
    lpos.set([Math.sin(z * 0.02) * 10 + (i % 2 ? 1.2 : -1.2), 1.1, z], i * 3);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const dot = document.createElement('canvas');
  dot.width = dot.height = 64;
  const dc = dot.getContext('2d')!;
  const gr = dc.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,220,150,1)');
  gr.addColorStop(0.3, 'rgba(255,160,60,0.6)');
  gr.addColorStop(1, 'rgba(255,120,30,0)');
  dc.fillStyle = gr;
  dc.fillRect(0, 0, 64, 64);
  const lanterns = new THREE.Points(lg, new THREE.PointsMaterial({ size: 2.2, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
  k.scene.add(lanterns);

  // Samarkand on the horizon: domes, portals and minarets against a warm glow.
  const sc = document.createElement('canvas');
  sc.width = 2048;
  sc.height = 512;
  const x = sc.getContext('2d')!;
  const base = 470;
  const sil = (fn: () => void) => {
    x.fillStyle = '#05070d';
    fn();
  };
  const domeAt = (cx: number, w: number, h: number, drum: number, lit: boolean) => {
    sil(() => {
      x.fillRect(cx - w * 0.45, base - drum, w * 0.9, drum);
      x.beginPath();
      x.moveTo(cx - w / 2, base - drum);
      x.bezierCurveTo(cx - w * 0.62, base - drum - h * 0.75, cx - w * 0.1, base - drum - h, cx, base - drum - h * 1.12);
      x.bezierCurveTo(cx + w * 0.1, base - drum - h, cx + w * 0.62, base - drum - h * 0.75, cx + w / 2, base - drum);
      x.fill();
    });
    if (lit) {
      const g = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      g.addColorStop(0, 'rgba(40,150,160,0)');
      g.addColorStop(0.35, 'rgba(60,190,200,0.35)');
      g.addColorStop(1, 'rgba(40,150,160,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(cx - w / 2, base - drum);
      x.bezierCurveTo(cx - w * 0.62, base - drum - h * 0.75, cx - w * 0.1, base - drum - h, cx, base - drum - h * 1.12);
      x.bezierCurveTo(cx + w * 0.1, base - drum - h, cx + w * 0.62, base - drum - h * 0.75, cx + w / 2, base - drum);
      x.fill();
    }
  };
  const minaret = (cx: number, h: number) =>
    sil(() => {
      x.fillRect(cx - 9, base - h, 18, h);
      x.fillRect(cx - 14, base - h - 10, 28, 12);
      x.fillStyle = 'rgba(255,190,110,0.9)';
      x.fillRect(cx - 2, base - h + 30, 4, 6);
    });
  const portal = (cx: number, w: number, h: number) => {
    sil(() => x.fillRect(cx - w / 2, base - h, w, h));
    x.fillStyle = 'rgba(255,180,90,0.55)';
    x.beginPath();
    x.moveTo(cx - w * 0.2, base);
    x.lineTo(cx - w * 0.2, base - h * 0.55);
    x.quadraticCurveTo(cx, base - h * 0.82, cx + w * 0.2, base - h * 0.55);
    x.lineTo(cx + w * 0.2, base);
    x.fill();
  };
  minaret(610, 260);
  portal(760, 200, 230);
  domeAt(760, 150, 120, 30, true);
  minaret(910, 260);
  portal(1024, 260, 280);
  domeAt(1024, 210, 170, 40, true);
  minaret(1180, 300);
  portal(1300, 200, 230);
  domeAt(1300, 150, 120, 30, true);
  minaret(1440, 260);
  domeAt(470, 120, 80, 20, false);
  domeAt(1580, 120, 80, 20, false);
  sil(() => x.fillRect(300, base - 30, 1450, 30));
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(255,190,110,${0.3 + Math.random() * 0.6})`;
    x.fillRect(320 + Math.random() * 1400, base - 6 - Math.random() * 40, 3, 4);
  }
  const city = new THREE.Mesh(new THREE.PlaneGeometry(240, 60), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, fog: false }));
  city.position.set(0, 26, -420);
  k.scene.add(city);
  const cityGlow = glowSprite('rgba(255,170,90,1)', 260);
  cityGlow.position.set(0, 14, -440);
  k.scene.add(cityGlow);

  const path = (z: number) => new THREE.Vector3(Math.sin(z * 0.02) * 10, 0, z);
  return {
    render(p, t) {
      // Low over the dunes along the lanterns → rising toward the city → into its glow.
      const fly = inOut(seg(p, 0, 0.92));
      const z = lerp(60, -230, fly);
      const at = path(z);
      const ahead = path(z - 30);
      const h = lerp(narrow ? 5.2 : 3.6, 13, Math.pow(fly, 2.2));
      k.camera.position.set(at.x, h + Math.sin(t * 0.6) * 0.08, at.z);
      k.camera.lookAt(ahead.x * 0.6, lerp(2.8, 20, Math.pow(fly, 2)), ahead.z - 40);
      k.camera.rotateZ(Math.sin(z * 0.02) * 0.04);
      k.camera.fov = lerp(42, 30, fly);
      k.camera.updateProjectionMatrix();
      k.finish.uniforms.uTime!.value = t;
      k.finish.uniforms.uFade!.value = seg(p, 0.9, 1);
      k.composer.render();
    },
    resize: k.resize,
    dispose: k.dispose,
  };
}

export function createLanding(kind: Landing3D, canvas: HTMLCanvasElement, opts: { narrow: boolean }): LandingScene | null {
  try {
    if (kind === 'silk') return silk(canvas, opts.narrow);
    if (kind === 'bluedome') return blueDome(canvas, opts.narrow);
    if (kind === 'rishtan') return rishtan(canvas, opts.narrow);
    return silkRoad(canvas, opts.narrow);
  } catch {
    return null;
  }
}
