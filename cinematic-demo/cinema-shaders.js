/* cinema-shaders.js: procedural backup scenes for cinema.js, used only when a page has no images.
 * Load before cinema.js. Config on the section: { "shader": "clouds" | "ocean" | "aurora" | "liquid" | "silk",
 *   "palette": ["#deep", "#accent", "#highlight"], "speed": 1 }
 * Scroll progress drives the camera; time keeps the scene alive. Colours come from the palette so the
 * scene matches the page. Everything runs on the GPU at an adaptive resolution.
 */
(() => {
  const VERT = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
  const HEAD = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime, uP; uniform vec3 uC0, uC1, uC2;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float noise3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * noise(p); p = p * 2.02 + 3.1; a *= 0.5; } return v; }
float fbm3(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise3(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
vec3 tone(vec3 c){ c = c / (1.0 + c * 0.6); return pow(c, vec3(0.92)); }
`;

  const SCENES = {
    // Flight over a cloud sea toward a low sun. Scroll: the camera glides forward and sinks into the
    // cloud tops (a soft white-out) before rising into clear sky with the sun centred: the resting frame.
    clouds: `
// Cloud layer between y = 0 and y = 1; the camera flies above it toward a low sun.
float dens(vec3 p){
  vec3 q = p * vec3(0.55, 1.1, 0.55) + vec3(uTime * 0.03, 0.0, uTime * 0.01);
  float n = fbm3(q);
  float h = clamp(p.y, 0.0, 1.0);
  float profile = smoothstep(0.0, 0.18, h) * smoothstep(1.0, 0.35, h);
  return clamp((n - 0.47 + 0.18 * (1.0 - h)) * 5.0 * profile, 0.0, 1.0);
}
void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float camY = 1.75 - 0.55 * smoothstep(0.0, 0.6, uP) + 0.35 * smoothstep(0.65, 1.0, uP);
  vec3 ro = vec3(0.0, camY, uP * 14.0 + uTime * 0.08);
  float pitch = -0.16 + 0.12 * smoothstep(0.55, 1.0, uP);
  vec3 rd = normalize(vec3(uv.x, uv.y + pitch, 1.35));
  vec3 sun = normalize(vec3(0.15, 0.1, 1.0));
  float sd = max(dot(rd, sun), 0.0);
  vec3 sky = mix(uC1 * 1.15, uC0 * 1.2, smoothstep(-0.02, 0.55, rd.y));
  sky += uC2 * pow(sd, 900.0) * 6.0 + uC1 * pow(sd, 6.0) * 0.55 + uC2 * pow(sd, 40.0) * 0.4;
  vec3 col = sky;
  // March only inside the slab.
  float t0 = (1.0 - ro.y) / rd.y, t1 = (0.0 - ro.y) / rd.y;
  if (rd.y < 0.0){
    float t = max(t0, 0.0), tEnd = min(t1, 40.0);
    float dt = (tEnd - t) / 64.0;
    vec4 acc = vec4(0.0);
    for (int i = 0; i < 64; i++){
      if (acc.a > 0.98) break;
      vec3 p = ro + rd * (t + dt * (float(i) + hash(uv * 400.0)));
      float d = dens(p);
      if (d > 0.005){
        float sh = dens(p + sun * 0.25) + dens(p + sun * 0.6) * 0.5;
        float light = exp(-sh * 1.6);
        float amb = 0.45 + 0.55 * clamp(p.y, 0.0, 1.0);
        vec3 lit = uC2 * light * 1.15 + mix(uC0 * 0.55, uC2 * 0.55, amb) * 0.55 + uC1 * light * pow(sd, 3.0) * 0.8;
        float a = 1.0 - exp(-d * dt * 3.2);
        acc.rgb += (1.0 - acc.a) * a * lit;
        acc.a += (1.0 - acc.a) * a;
      }
    }
    float tm = mix(t, tEnd, 0.3);
    vec3 below = mix(uC0 * 0.5, uC1 * 0.6, 0.4);
    vec3 c = mix(below, acc.rgb / max(acc.a, 0.001), smoothstep(0.0, 0.6, acc.a));
    col = mix(c, sky, smoothstep(0.0, 1.0, 1.0 - exp(-tm * 0.035)));
  }
  gl_FragColor = vec4(tone(col), 1.0);
}`,

    // Sunset ocean. Scroll: the camera skims low over the waves, then rises to a calm horizon.
    ocean: `
float wave(vec2 p){
  float h = 0.0, a = 0.35, f = 0.6; vec2 d = vec2(1.0, 0.3);
  for (int i = 0; i < 6; i++){
    h += a * sin(dot(p, d) * f + uTime * (0.8 + float(i) * 0.25)) * (0.6 + 0.4 * noise(p * 0.3 + float(i)));
    d = mat2(0.8, -0.6, 0.6, 0.8) * d; f *= 1.7; a *= 0.48;
  }
  return h;
}
void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float camY = 0.6 + 2.2 * smoothstep(0.3, 1.0, uP);
  vec3 ro = vec3(0.0, camY, uTime * 0.6 + uP * 12.0);
  vec3 rd = normalize(vec3(uv.x, uv.y - 0.06 - 0.06 * smoothstep(0.3, 1.0, uP), 1.5));
  vec3 sun = normalize(vec3(0.0, 0.06, 1.0));
  float sd = max(dot(rd, sun), 0.0);
  vec3 sky = mix(uC1 * 1.2, uC0, smoothstep(-0.02, 0.45, rd.y));
  sky += uC2 * pow(sd, 600.0) * 4.0 + uC1 * pow(sd, 10.0) * 0.8;
  sky += uC2 * fbm(vec2(rd.x * 3.0 + uTime * 0.01, rd.y * 12.0)) * smoothstep(0.02, 0.2, rd.y) * 0.08;
  vec3 col = sky;
  if (rd.y < 0.0){
    float t = -ro.y / rd.y;
    vec3 p = ro + rd * t;
    float e = 0.05;
    vec2 q = p.xz;
    float h = wave(q);
    vec3 n = normalize(vec3(wave(q - vec2(e, 0.0)) - wave(q + vec2(e, 0.0)), 2.0 * e * 4.0, wave(q - vec2(0.0, e)) - wave(q + vec2(0.0, e))));
    vec3 r = reflect(rd, n);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    vec3 refl = mix(uC1 * 1.2, uC0, smoothstep(-0.02, 0.45, r.y)) + uC2 * pow(max(dot(r, sun), 0.0), 300.0) * 6.0;
    vec3 water = uC0 * 0.25 + uC0 * 0.15 * h;
    col = mix(water, refl, 0.25 + 0.75 * fres);
    col = mix(col, sky, 1.0 - exp(-t * 0.015));
  }
  gl_FragColor = vec4(tone(col), 1.0);
}`,

    // Aurora over a mountain ridge. Scroll: the camera tilts up from the ridge into the curtains.
    aurora: `
float ridge(float x){ return 0.2 + 0.2 * fbm(vec2(x * 1.2 + 4.0, 0.0)) + 0.03 * noise(vec2(x * 9.0, 1.0)); }
void main(){
  vec2 uv = vUv; float asp = uRes.x / uRes.y;
  float tilt = 0.35 * smoothstep(0.1, 0.9, uP);
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y + tilt);
  vec3 col = mix(uC0 * 0.35, uC0 * 0.05, smoothstep(0.0, 1.2, p.y));
  vec2 g = floor(p * 220.0); float s = hash(g);
  col += vec3(1.0) * step(0.9975, s) * (0.5 + 0.5 * sin(uTime * 2.0 + s * 90.0));
  vec3 au = vec3(0.0);
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float x = p.x * (0.9 + fi * 0.15) + uTime * 0.02 * (fi + 1.0);
    float curtain = fbm(vec2(x * 1.4, fi * 3.0 + uTime * 0.05));
    float base = 0.5 + fi * 0.08 + curtain * 0.3;
    float band = smoothstep(base - 0.16, base + 0.04, p.y) * exp(-max(p.y - base, 0.0) * (2.5 + fi)) * smoothstep(base - 0.16, base, p.y);
    float rays = 0.6 + 0.4 * noise(vec2(x * 40.0, uTime * 0.3 + fi));
    vec3 c = mix(uC1, uC2, fi / 3.0);
    au += c * band * rays * (0.55 - fi * 0.08);
  }
  col += au * 1.3;
  float rh = ridge(p.x) - tilt * 0.35;
  float m = smoothstep(rh + 0.003, rh - 0.003, uv.y);
  float rim = smoothstep(rh - 0.012, rh, uv.y) * m;
  col = mix(col, uC0 * 0.03 + au * 0.04, m) + au * rim * 0.6;
  gl_FragColor = vec4(tone(col), 1.0);
}`,

    // Molten rock / dark liquid metal (the original look): domain-warped fbm with fine relief and glints.
    liquid: `
float field(vec2 p){
  vec2 q = vec2(fbm(p + vec2(0.0, uTime * 0.05)), fbm(p + vec2(5.2, 1.3) - uTime * 0.04));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + uP * 1.5), fbm(p + 3.0 * q + vec2(8.3, 2.8)));
  return fbm(p + 3.5 * r);
}
void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float a = uP * 1.2; uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  vec2 p = uv * (1.6 - uP * 0.4);
  float e = 0.004;
  float h = field(p);
  vec3 n = normalize(vec3(field(p - vec2(e, 0.0)) - field(p + vec2(e, 0.0)), field(p - vec2(0.0, e)) - field(p + vec2(0.0, e)), 0.02));
  vec3 l = normalize(vec3(cos(uP * 3.0 + 0.6), 0.6, 0.8));
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
  vec3 base = mix(uC0, uC1, smoothstep(0.3, 0.75, h));
  vec3 col = base * (0.25 + 0.9 * diff) + uC2 * spec * 1.4;
  col *= 1.0 - 0.35 * length(uv);
  gl_FragColor = vec4(tone(col), 1.0);
}`,

    silk: `
// Smooth silk: sine domain warping (no value noise, so no blotches or grain).
float field(vec2 p){
  float t = uTime * 0.12 + uP * 2.2;
  for (int i = 1; i < 7; i++){
    float fi = float(i);
    p.x += 0.55 / fi * sin(fi * p.y * 1.25 + t + 0.37 * fi);
    p.y += 0.55 / fi * cos(fi * p.x * 1.05 + t * 0.8 + 0.71 * fi);
  }
  return 0.5 + 0.5 * sin(p.x * 0.9 + p.y * 1.1);
}
void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float a = 0.35 + uP * 0.6; uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  vec2 p = uv * (2.4 - uP * 0.6);
  float e = 0.006;
  float h = field(p);
  vec3 n = normalize(vec3(field(p - vec2(e, 0.0)) - field(p + vec2(e, 0.0)), field(p - vec2(0.0, e)) - field(p + vec2(0.0, e)), 0.035));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 l1 = normalize(vec3(cos(uP * 2.0 + 0.8), 0.7, 0.9));
  vec3 l2 = normalize(vec3(-0.8, -0.3, 0.5));
  float diff = max(dot(n, l1), 0.0);
  float sheen = pow(max(dot(n, normalize(l1 + v)), 0.0), 18.0);
  float glint = pow(max(dot(n, normalize(l1 + v)), 0.0), 120.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  float fill = max(dot(n, l2), 0.0);
  vec3 base = mix(uC0, uC1, smoothstep(0.15, 0.95, h));
  vec3 col = base * (0.22 + 0.85 * diff) + uC1 * fill * 0.18 + uC2 * (sheen * 0.55 + glint * 1.4) + uC2 * rim * 0.12;
  col *= 1.0 - 0.35 * dot(uv, uv);
  gl_FragColor = vec4(tone(col), 1.0);
}`,
  };

  const hex = (h, fb) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return fb; const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const DEFAULTS = {
    clouds: ['#2a3d66', '#f0a868', '#fff4e0'], ocean: ['#16233f', '#f08a5d', '#fff1d0'],
    aurora: ['#0a1426', '#3df2b0', '#8a6cff'], liquid: ['#1b1b22', '#8c7a6b', '#fff7ec'], silk: ['#1b1b22', '#8c7a6b', '#fff7ec'],
  };

  function mount(section, canvas, cfg, { beats, progressOf, reduced }) {
    const name = SCENES[cfg.shader] ? cfg.shader : 'clouds';
    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'high-performance' });
    const pal = (cfg.palette || DEFAULTS[name]).map((c, i) => hex(c, hex(DEFAULTS[name][i])));
    if (!gl) { section.classList.add('cine--fallback'); section.querySelector('.cine__stage').style.background = `linear-gradient(#000, rgb(${pal[0].map((v) => v * 255).join(',')}))`; return; }
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const prog = gl.createProgram();
    try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, HEAD + SCENES[name])); gl.linkProgram(prog); }
    catch (e) { console.warn('cinema-shaders:', e); section.classList.add('cine--fallback'); return; }
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform3f(U('uC0'), ...pal[0]); gl.uniform3f(U('uC1'), ...pal[1]); gl.uniform3f(U('uC2'), ...pal[2]);
    const uRes = U('uRes'), uTime = U('uTime'), uP = U('uP');

    // Raymarched scenes are heavy: start at a modest resolution and adapt.
    // Start sharp (native density up to 2x; clouds at 1.5x because they are raymarched) and adapt to the device.
    const dpr = devicePixelRatio || 1;
    const cap = Math.min(dpr, 2), floor = name === 'clouds' ? 0.5 : 0.75;
    let scale = Math.min(cap, name === 'clouds' ? 1.5 : 2);
    const resize = () => { canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale)); gl.viewport(0, 0, canvas.width, canvas.height); };
    let target = 0, shown = 0, visible = true, last = performance.now(), slow = 0, fast = 0;
    const t0 = performance.now(), speed = cfg.speed ?? 1;
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (!visible) return;
      const dt = now - last; last = now;
      if (dt > 34) { fast = 0; if (++slow > 20 && scale > floor) { scale = Math.max(floor, scale - 0.2); slow = 0; resize(); } }
      else if (dt < 14) { slow = 0; if (++fast > 120 && scale < cap) { scale = Math.min(cap, scale + 0.1); fast = 0; resize(); } }
      shown += (target - shown) * (reduced ? 1 : 0.12);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 0 : ((now - t0) / 1000) * speed);
      gl.uniform1f(uP, shown);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const onScroll = () => { target = progressOf(section); beats(target); section.dispatchEvent(new CustomEvent('cine:progress', { detail: { progress: target } })); };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
    addEventListener('scroll', onScroll, { passive: true });
    resize(); onScroll(); shown = target; section.classList.add('is-ready');
    requestAnimationFrame(tick);
  }

  window.CinemaShaders = { mount, scenes: Object.keys(SCENES) };
})();
