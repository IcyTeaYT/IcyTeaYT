/* cinema.js: scroll-driven cinematic scenes from still images. No dependencies; WebGL2 with WebGL1 fallback.
 *
 * Turns one or more stills (from ChatGPT, Nano Banana, a photographer, anything) plus their depth
 * maps (scripts/depth.mjs) into a 3D camera journey that plays as the visitor scrolls, with living
 * atmosphere on top. With no images it can run a procedural shader scene instead (cinema-shaders.js).
 *
 * Markup:
 *   <section class="cine" style="height:400vh" data-cine='{ ...config... }'>
 *     <div class="cine__stage">
 *       <canvas class="cine__canvas" data-media></canvas>
 *       <div class="cine__beat" data-in="0.02" data-out="0.22">...</div>   (captions, see below)
 *     </div>
 *   </section>
 *   <script src="cinema.js"></script>   (and cinema-shaders.js before it if you use a shader scene)
 *
 * Config (all optional except shots or shader):
 * {
 *   "shots": [
 *     { "image": "hero.webp", "depth": "hero.depth.png", "from": 0, "to": 0.55,
 *       "focus": [0.5, 0.55],                      // point the camera pushes toward (0..1, image space)
 *       "start": { "dolly": 0,    "x": 0,    "y": 0,    "zoom": 1,    "rot": 0 },
 *       "end":   { "dolly": 0.45, "x": 0.04, "y": -0.02, "zoom": 1.06, "rot": 0.01 },
 *       "sky": 0.18,                               // depth below this counts as sky and drifts; 0 for shots with no open sky
 *       "flow": { "dir": [0, 1], "amount": 0.8, "threshold": 0.62 },   // optional: bright water/light streams along dir (y down)
 *       "imageMobile": "hero-9x16.webp", "depthMobile": "hero-9x16.depth.png",   // optional: sharp version for tall screens
 *       "focusMobile": [0.5, 0.55] }                // optional: focus inside the phone image (default: centred)
 *   ],
 *   "transition": 0.08,                           // scroll share used to blend from one shot to the next
 *   "atmosphere": {
 *     "skyDrift": 0.6, "fog": { "color": "#d9c6a5", "amount": 0.25, "height": 0.55 },
 *     "rays": { "pos": [0.7, 0.2], "color": "#ffd6a0", "amount": 0.35 },
 *     "particles": { "color": "#fff3dc", "amount": 0.4, "size": 1, "rise": 0.2 },
 *     "grain": 0.05, "vignette": 0.35, "exposure": 1, "saturation": 1, "warmth": 0
 *   },
 *   "shader": "clouds", "palette": ["#0b1020", "#f2c48d", "#ffffff"]   // only when there are no shots
 * }
 *
 * Captions: .cine__beat elements with data-in/data-out (scroll progress 0..1). Each fades in over the
 * first `data-ramp` (default 0.035) of its band, holds fully visible, and fades out at the end, so a
 * reader never loses a line between two scroll flicks. The engine sets --beat (0..1) on each beat.
 *
 * Events: the section dispatches "cine:progress" with detail.progress on every change.
 */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime, uMix;
uniform sampler2D uImgA, uDepA, uImgB, uDepB;
uniform vec2 uAspA, uAspB;          // image aspect (w/h) per shot
uniform vec4 uCamA, uCamB;          // dolly, x, y, zoom
uniform vec4 uCamA2, uCamB2;        // rot, focus.x, focus.y, sky threshold
uniform float uSkyDrift;
uniform vec4 uFog;                  // rgb, amount
uniform float uFogHeight;
uniform vec4 uRays;                 // rgb, amount
uniform vec2 uRayPos;
uniform vec4 uPart;                 // rgb, amount
uniform vec2 uPartOpt;              // size, rise
uniform vec4 uGrade;                // exposure, saturation, warmth, vignette
uniform float uGrain;
uniform vec4 uFlow;                 // dir.xy, amount, luminance threshold
uniform vec2 uCenterA, uCenterB;    // crop centre (focus) per shot

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
// Smooth 2-octave noise with quintic fade (continuous derivatives): for warping image coordinates.
float qnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
float snoise(vec2 p){ return qnoise(p) * 0.65 + qnoise(p * 2.1 + 5.3) * 0.35; }

// Screen uv -> image uv, cover-fit with a little overscan so camera moves never reveal an edge.
vec2 cover(vec2 uv, vec2 asp, vec2 c){
  float screen = uRes.x / uRes.y;
  vec2 s = screen > asp.x ? vec2(1.0, asp.x / screen) : vec2(screen / asp.x, 1.0);
  s /= 1.04;
  vec2 m = (1.0 - s) * 0.5;                                   // spare image on each side
  vec2 o = clamp(c - 0.5, -m, m);                             // crop toward the focus on narrow screens
  return (uv - 0.5) * s + 0.5 + o;
}

// Where a screen point lands in the image if the surface there is at depth z (1 near, 0 far).
vec2 project(vec2 uv, float z, vec4 cam, vec4 cam2){
  vec2 f = cam2.yz;
  float s = cam.w * (1.0 + cam.x * z * z);                   // dolly magnifies near more than far
  vec2 d = uv - f;
  float r = cam2.x * (0.5 + z);
  d = mat2(cos(r), -sin(r), sin(r), cos(r)) * d;
  vec2 q = f + d / s;
  q -= cam.yz * (z - 0.35);                                  // lateral parallax around a mid focus plane
  return q;
}

// Depth-aware lookup (parallax occlusion search from near to far, then refine).
vec2 locate(sampler2D dep, vec2 uv, vec4 cam, vec4 cam2, vec2 asp, vec2 cc, out float depth){
  const int N = 64;
  float zPrev = 1.0; vec2 pPrev = project(uv, 1.0, cam, cam2);
  vec2 hit = project(uv, 0.0, cam, cam2); float zHit = 0.0;
  for (int i = 1; i < N; i++){
    float z = 1.0 - float(i) / float(N - 1);
    vec2 p = project(uv, z, cam, cam2);
    float d = texture2D(dep, cover(p, asp, cc)).r;
    if (d >= z){
      float a = zPrev, b = z;                               // refine between the two layers
      for (int k = 0; k < 8; k++){
        float m = 0.5 * (a + b); vec2 pm = project(uv, m, cam, cam2);
        if (texture2D(dep, cover(pm, asp, cc)).r >= m) b = m; else a = m;
      }
      zHit = b; hit = project(uv, b, cam, cam2); break;
    }
    zPrev = z; pPrev = p;
  }
  depth = zHit;
  return hit;
}

vec3 shot(sampler2D img, sampler2D dep, vec2 uv, vec4 cam, vec4 cam2, vec2 asp, vec2 cc, out float depth){
  vec2 p = locate(dep, uv, cam, cam2, asp, cc, depth);
  // Living sky: far pixels drift with a slow flow field.
  float sky = cam2.w > 0.0 ? 1.0 - smoothstep(cam2.w * 0.5, cam2.w, depth) : 0.0;   // sky: 0 turns drift off for this shot
  // Low-frequency, smoothly interpolated field: fine noise here turns streaky detail (water, rain,
  // hair) into jagged steps, so the drift only ever bends the image in broad, soft curves.
  vec2 flow = vec2(snoise(p * 1.6 + vec2(uTime * 0.03, 0.0)), snoise(p * 1.6 + vec2(0.0, uTime * 0.02) + 7.0)) - 0.5;
  p += flow * 0.012 * uSkyDrift * sky;
  p.x += uTime * 0.0015 * uSkyDrift * sky;
  vec3 c = texture2D(img, cover(p, asp, cc)).rgb;
  // Flowing water / streaming light: soft streaks of light travel along the flow direction over the
  // bright pixels. It only modulates brightness (no extra photo lookups), so it stays clean under
  // camera moves and at any resolution.
  if (uFlow.z > 0.0){
    float l = dot(c, vec3(0.333));
    float w = smoothstep(uFlow.w, uFlow.w + 0.12, l);
    vec2 d = normalize(uFlow.xy), nrm = vec2(-d.y, d.x);
    float across = dot(p, nrm), along = dot(p, d);
    float s1 = noise(vec2(across * 90.0, along * 7.0 - uTime * 1.6));
    float s2 = noise(vec2(across * 170.0 + 3.0, along * 12.0 - uTime * 2.4));
    float streak = s1 * 0.65 + s2 * 0.35;
    c *= 1.0 + (streak - 0.5) * 0.22 * uFlow.z * w;
    c += vec3(0.9, 0.95, 1.0) * pow(streak, 6.0) * 0.12 * uFlow.z * w;
  }
  return c;
}

void main(){
  vec2 uv = vUv;
  float dA, dB;
  vec3 col = shot(uImgA, uDepA, uv, uCamA, uCamA2, uAspA, uCenterA, dA);
  float depth = dA;
  if (uMix > 0.001){
    vec3 colB = shot(uImgB, uDepB, uv, uCamB, uCamB2, uAspB, uCenterB, dB);
    float m = smoothstep(0.0, 1.0, uMix);
    col = mix(col, colB, m); depth = mix(dA, dB, m);
  }

  // Fog: distance haze plus drifting banks low in the frame.
  if (uFog.a > 0.0){
    float bank = fbm(vec2(uv.x * 2.5 - uTime * 0.02, uv.y * 4.0 + uTime * 0.01));
    float low = smoothstep(uFogHeight, 0.0, uv.y);
    float f = clamp((1.0 - depth) * 0.55 + bank * low * 0.9, 0.0, 1.0) * uFog.a;
    col = mix(col, uFog.rgb, f);
  }

  // Light rays: march toward the light, collecting bright far pixels.
  if (uRays.a > 0.0){
    // 32 dithered samples toward the light; only genuinely bright pixels (sun, sky glare) feed the shafts.
    vec2 dir = (uRayPos - uv) / 32.0; vec2 q = uv + dir * hash(uv * uRes); float acc = 0.0, w = 1.0;
    for (int i = 0; i < 32; i++){ q += dir; vec3 s = texture2D(uImgA, cover(q, uAspA, uCenterA)).rgb; float l = max(0.0, dot(s, vec3(0.333)) - 0.78); acc += l * w; w *= 0.955; }
    acc *= 18.0 / 32.0 * 1.6;
    float shimmer = 0.75 + 0.25 * noise(vec2(atan(uv.y - uRayPos.y, uv.x - uRayPos.x) * 6.0, uTime * 0.2));
    col += uRays.rgb * acc * 0.1 * uRays.a * shimmer * (1.0 - smoothstep(0.75, 1.0, dot(col, vec3(0.333))));   // never push highlights to white
  }

  // Particles: three drifting layers, nearer layers larger and faster.
  if (uPart.a > 0.0){
    for (int L = 0; L < 3; L++){
      float fl = float(L);
      float sc = (26.0 - fl * 7.0) / max(uPartOpt.x, 0.2);
      vec2 g = uv * vec2(uRes.x / uRes.y, 1.0) * sc;
      g += vec2(uTime * (0.05 + fl * 0.04), -uTime * uPartOpt.y * (0.3 + fl * 0.3));
      vec2 id = floor(g), fp = fract(g) - 0.5;
      float h = hash(id + fl * 17.0);
      vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
      float d = length(fp - o * 0.7);
      float tw = 0.5 + 0.5 * sin(uTime * (1.0 + h * 2.0) + h * 40.0);
      float s = smoothstep(0.06 + fl * 0.02, 0.0, d) * step(0.82, h) * tw;
      col += uPart.rgb * s * uPart.a * (0.6 + fl * 0.4);
    }
  }

  // Grade: exposure, saturation, warmth, vignette, grain.
  col *= uGrade.x;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum), col, uGrade.y);
  col += vec3(0.06, 0.02, -0.05) * uGrade.z;
  vec2 v = uv - 0.5; col *= 1.0 - uGrade.w * smoothstep(0.25, 0.85, length(v * vec2(uRes.x / uRes.y, 1.0)) / 1.2);
  col += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const hex = (h, fb = [1, 1, 1]) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return fb;
    const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const camAt = (s, t) => {
    const A = { dolly: 0, x: 0, y: 0, zoom: 1, rot: 0, ...(s.start || {}) };
    const B = { ...A, ...(s.end || {}) };
    const k = ease(Math.min(1, Math.max(0, t)));
    return { dolly: lerp(A.dolly, B.dolly, k), x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), zoom: lerp(A.zoom, B.zoom, k), rot: lerp(A.rot, B.rot, k) };
  };

  function setupBeats(section) {
    const beats = [...section.querySelectorAll('.cine__beat')];
    return (p) => beats.forEach((b) => {
      const a = +b.dataset.in, z = +b.dataset.out, r = +(b.dataset.ramp || 0.035);
      let o = 0;
      if (p >= a && p <= z) o = Math.min(1, a <= 0 ? 1 : (p - a) / r, z >= 1 ? 1 : (z - p) / r);
      o = ease(Math.max(0, Math.min(1, o)));
      if (b._o !== o) { b._o = o; b.style.setProperty('--beat', o.toFixed(3)); b.style.visibility = o > 0 ? 'visible' : 'hidden'; }
    });
  }

  function progressOf(section) {
    const span = section.offsetHeight - innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / span)) : 0;
  }

  function fallback(section, cfg) {
    section.classList.add('cine--fallback');
    const first = cfg.shots && cfg.shots[0];
    if (first) section.querySelector('.cine__stage').style.backgroundImage = `url("${first.image}")`;
  }

  function init(section) {
    let cfg;
    try { cfg = JSON.parse(section.dataset.cine || '{}'); } catch (e) { console.warn('cinema.js: bad data-cine JSON', e); return; }
    const beats = setupBeats(section);
    const canvas = section.querySelector('canvas');
    // Tall screens use each shot's phone version (a 9:16 image made for it) when there is one.
    const portrait = matchMedia('(max-aspect-ratio: 1/1)').matches;
    const shots = (cfg.shots || []).map((s) => portrait && s.imageMobile
      ? { ...s, image: s.imageMobile, depth: s.depthMobile || s.depth, focus: s.focusMobile || [0.5, (s.focus || [0.5, 0.5])[1]] }
      : s);

    if (!shots.length && cfg.shader && window.CinemaShaders) return window.CinemaShaders.mount(section, canvas, cfg, { beats, progressOf, reduced });
    if (!shots.length) return fallback(section, cfg);

    // WebGL2 when available: mipmaps on non-power-of-two photos (clean downscaling, no shimmer).
    const ctxOpts = { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl2', ctxOpts) || canvas.getContext('webgl', ctxOpts);
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const aniso = gl && (gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'));
    if (!gl) return fallback(section, cfg);

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { console.warn('cinema.js: shader failed, using still fallback', e); return fallback(section, cfg); }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = new Proxy({}, { get: (c, k) => (k in c ? c[k] : (c[k] = gl.getUniformLocation(prog, k))) });

    // Textures
    const blank = (() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])); return t; })();
    // Photos get mipmaps + anisotropic filtering (WebGL2); depth maps stay plain linear because the
    // occlusion search samples them in a loop, where mip selection would be unreliable.
    const tex = (img, isPhoto) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (isPhoto && isGL2) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      return t;
    };
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('cannot load ' + src)); i.src = src; });
    const data = shots.map(() => ({ img: blank, dep: blank, asp: 16 / 9, ready: false }));
    let anyReady = false;
    shots.forEach((s, i) => {
      Promise.all([load(s.image), s.depth ? load(s.depth) : Promise.resolve(null)]).then(([im, dp]) => {
        data[i] = { img: tex(im, true), dep: dp ? tex(dp, false) : blank, asp: im.naturalWidth / im.naturalHeight, ready: true };
        if (i === 0) { anyReady = true; section.classList.add('is-ready'); }
        dirty = true;
      }).catch((e) => { console.warn('cinema.js:', e.message); if (i === 0) fallback(section, cfg); });
    });

    const at = cfg.atmosphere || {};
    const fog = at.fog || {}, rays = at.rays || {}, part = at.particles || {};
    const statics = () => {
      gl.uniform1f(U.uSkyDrift, at.skyDrift ?? 0.6);
      gl.uniform4f(U.uFog, ...hex(fog.color, [0.85, 0.8, 0.7]), fog.amount ?? 0);
      gl.uniform1f(U.uFogHeight, fog.height ?? 0.5);
      gl.uniform4f(U.uRays, ...hex(rays.color, [1, 0.85, 0.65]), rays.amount ?? 0);
      gl.uniform2f(U.uRayPos, ...(rays.pos ? [rays.pos[0], 1 - rays.pos[1]] : [0.7, 0.8]));
      gl.uniform4f(U.uPart, ...hex(part.color, [1, 0.95, 0.85]), part.amount ?? 0);
      gl.uniform2f(U.uPartOpt, part.size ?? 1, part.rise ?? 0.2);
      gl.uniform4f(U.uGrade, at.exposure ?? 1, at.saturation ?? 1, at.warmth ?? 0, at.vignette ?? 0.3);
      gl.uniform1f(U.uGrain, at.grain ?? 0.04);

      ['uImgA', 'uDepA', 'uImgB', 'uDepB'].forEach((n, i) => gl.uniform1i(U[n], i));
    };
    statics();

    // Render at the screen's native density (up to 3x): pixel-sharp on phones and retina screens.
    // Steps down only if the device cannot hold about 30 fps, and never below 1x.
    const maxScale = Math.min(devicePixelRatio || 1, 3);
    let scale = maxScale;
    const resize = () => {
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height); dirty = true;
    };

    const T = cfg.transition ?? 0.08;
    const bind = (slot, d, s, t) => {
      const c = camAt(s, t), f = s.focus || [0.5, 0.5];
      gl.activeTexture(gl.TEXTURE0 + slot * 2); gl.bindTexture(gl.TEXTURE_2D, d.img);
      gl.activeTexture(gl.TEXTURE1 + slot * 2); gl.bindTexture(gl.TEXTURE_2D, d.dep);
      const n = slot ? 'B' : 'A';
      gl.uniform2f(U['uAsp' + n], d.asp, 1);
      gl.uniform4f(U['uCam' + n], c.dolly, c.x, c.y, c.zoom);
      gl.uniform4f(U['uCam' + n + '2'], c.rot, f[0], 1 - f[1], s.sky ?? 0.18);
      gl.uniform2f(U['uCenter' + n], f[0], 1 - f[1]);
      if (!slot) { const fl = s.flow || {}; gl.uniform4f(U.uFlow, ...(fl.dir ? [fl.dir[0], -fl.dir[1]] : [0, -1]), fl.amount ?? 0, fl.threshold ?? 0.62); }
    };

    let target = 0, shown = 0, dirty = true, visible = true, last = performance.now(), slow = 0, fast = 0;
    const t0 = performance.now();
    const draw = (now) => {
      // Which shot is on screen, and how far through it.
      let i = shots.findIndex((s) => shown <= (s.to ?? 1));
      if (i < 0) i = shots.length - 1;
      const s = shots[i], from = s.from ?? 0, to = s.to ?? 1;
      const local = (shown - from) / Math.max(1e-4, to - from);
      bind(0, data[i], s, local);
      let mix = 0;
      const next = shots[i + 1];
      if (next && shown > to - T && data[i + 1].ready) {
        mix = (shown - (to - T)) / T;
        bind(1, data[i + 1], next, 0);
      }
      gl.uniform1f(U.uMix, Math.min(1, mix));
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, reduced ? 0 : (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (!visible || !anyReady) return;
      const dt = now - last; last = now;
      // Dynamic resolution: keep the frame under ~20 ms.
      if (dt > 34) { slow++; fast = 0; if (slow > 30 && scale > 1) { scale = Math.max(1, scale - 0.25); slow = 0; resize(); } }
      else if (dt < 12) { fast++; slow = 0; if (fast > 120 && scale < maxScale) { scale = Math.min(maxScale, scale + 0.1); fast = 0; resize(); } }
      shown += (target - shown) * (reduced ? 1 : 0.14);
      if (Math.abs(target - shown) < 1e-4) shown = target;
      draw(now);   // atmosphere is alive, so always draw while visible
    };
    const onScroll = () => {
      target = progressOf(section);
      beats(target);
      section.dispatchEvent(new CustomEvent('cine:progress', { detail: { progress: target } }));
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    resize(); onScroll(); shown = target;
    requestAnimationFrame(tick);
  }

  const start = () => document.querySelectorAll('.cine[data-cine]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
