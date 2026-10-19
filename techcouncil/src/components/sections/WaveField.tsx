import { useEffect, useRef } from 'react';
import type { MotionValue } from 'motion/react';

/**
 * Hero background: a WebGL fragment shader drawing fine white wave lines.
 * Plain WebGL 1, one full-screen triangle, no libraries. Capped pixel ratio,
 * paused off-screen and in hidden tabs, a single still frame under reduced
 * motion. Renders nothing if WebGL is unavailable.
 *
 * Three camera rigs, driven by `progress` (0 → 1 as the hero scrolls away):
 * - flat:    the original drifting wave field; the camera dollies in (zoom).
 * - tunnel:  the lines wrap into a tunnel and the camera flies through it.
 * - vertigo: the lines lie on a floor and ceiling; the camera pulls back
 *            while zooming in (a dolly zoom), so the world stretches behind
 *            a subject that holds still.
 */
export type WaveRig = 'flat' | 'tunnel' | 'vertigo';
const RIG_ID: Record<WaveRig, number> = { flat: 0, tunnel: 1, vertigo: 2 };

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uDpr;
uniform float uRig;
uniform float uProg;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// A line at every integer of v. w is the line's width in units of v.
float band(float v, float w){
  float e = 0.5 - abs(fract(v) - 0.5);
  return 1.0 - smoothstep(w * 0.5, w * 1.6, e);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 ps = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.08;
  float lw = (2.0 / uDpr) / uRes.y; // line width, in uv-height units

  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float d = distance(ps, m);
  float glow = uMouseOn * exp(-d * d * 10.0) * 0.45;
  // Brightest top-right, fading toward the lower-left where the headline sits.
  float mask = smoothstep(0.0, 1.0, uv.x * 0.8 + uv.y * 0.7 - 0.2);
  float a = 0.0;

  if (uRig < 0.5) {
    // Flat field. The camera dollies in toward the upper right.
    float zoom = 1.0 + uProg * uProg * 1.6;
    vec2 c = vec2(0.7, 0.62);
    vec2 uz = (uv - c) / zoom + c;
    vec2 p = vec2(uz.x * aspect, uz.y);
    float swell = uMouseOn * 0.06 * exp(-d * d * 14.0);
    float y = uz.y
      + (noise(vec2(p.x * 1.4 + t, t * 0.6)) - 0.5) * 0.42
      + sin(p.x * 2.6 + t * 3.0) * 0.035
      + swell;
    float lines = 46.0;
    float line = band(y * lines, lw * lines / zoom);
    float shimmer = 0.35 + 0.65 * noise(vec2(p.x * 3.0 - t * 2.0, y * 6.0));
    a = line * (0.16 + 0.4 * mask * shimmer + glow);
  } else if (uRig < 1.5) {
    // Tunnel. Rings of wave line rush outward as the camera flies forward.
    vec2 vp = vec2(0.66 + (uMouse.x - 0.5) * 0.1, 0.58 + (uMouse.y - 0.6) * 0.08);
    vec2 q = vec2((uv.x - vp.x) * aspect, uv.y - vp.y);
    float r = max(length(q), 0.001);
    float ang = atan(q.y, q.x);
    float warp = 1.0 + 0.09 * sin(ang * 3.0 + t * 4.0) + 0.14 * (noise(vec2(ang * 1.7 + 7.0, t * 2.0)) - 0.5);
    float rr = r * warp;
    float depth = 0.32 / rr;
    float dens = 6.0;
    float cam = uProg * uProg * 14.0 + uTime * 0.22;
    float w = lw * 0.32 * dens / (rr * rr);
    float line = band(depth * dens + cam, w);
    float far = smoothstep(0.5, 0.12, w);     // too dense to draw near the vanishing point
    float near = smoothstep(0.03, 0.3, r);
    float shimmer = 0.35 + 0.65 * noise(vec2(ang * 2.0 - t * 3.0, depth * 2.0 + cam * 0.3));
    a = line * far * near * (0.16 + 0.42 * shimmer * (0.4 + 0.6 * mask) + glow);
  } else {
    // Dolly zoom. Floor and ceiling of wave lines; the line at the subject's
    // depth holds still while everything behind and in front stretches.
    float yh = 0.46 + (uMouse.y - 0.6) * 0.05;
    float cx = 0.66 + (uMouse.x - 0.5) * 0.08;
    float dy = uv.y - yh;
    float ady = max(abs(dy), 0.0015);
    float k = 0.24;
    float D = mix(1.0, 3.4, smoothstep(0.0, 0.9, uProg));
    float X = (uv.x - cx) * aspect / ady * 0.22;
    float zw = D * (k / ady - 1.0)
      + 0.1 * sin(X * 1.3 + t * 3.0)
      + 0.18 * (noise(vec2(X * 0.8, t * 1.5)) - 0.5)
      - uTime * 0.03;
    float dens = 7.0;
    float w = lw * D * k * dens / (ady * ady);
    float line = band(zw * dens, w);
    float railD = 1.6 / min(aspect, 1.0); // keep several rails on narrow screens
    float rails = band(X * railD, lw * aspect * 0.22 * railD / ady * 1.2) * 0.5;
    float far = smoothstep(0.5, 0.12, w);
    float horizon = smoothstep(0.0, 0.06, ady);
    float shimmer = 0.35 + 0.65 * noise(vec2(X * 0.5 - t * 2.0, zw * 1.5));
    a = max(line * far, rails * horizon) * horizon * (0.2 + 0.45 * shimmer * (0.5 + 0.5 * mask) + glow);
  }

  gl_FragColor = vec4(vec3(1.0), a);
}
`;

export default function WaveField({ reduce, rig = 'flat', progress }: { reduce: boolean; rig?: WaveRig; progress?: MotionValue<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!canvas || !gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');
    const uMouseOn = gl.getUniformLocation(prog, 'uMouseOn');
    const uDpr = gl.getUniformLocation(prog, 'uDpr');
    const uRig = gl.getUniformLocation(prog, 'uRig');
    const uProg = gl.getUniformLocation(prog, 'uProg');
    gl.uniform1f(uRig, RIG_ID[rig]);

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6, on: 0, ton: 0 };
    let hovering = false;
    let prog01 = progress?.get() ?? 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uDpr, dpr);
    };

    const start = performance.now();
    let raf = 0;
    let running = false;
    const draw = (now: number) => {
      if (!hovering) {
        // No cursor over the hero (or touch): a slow wandering swell keeps the field alive.
        const s = now / 1000;
        mouse.tx = 0.55 + 0.3 * Math.sin(s * 0.25);
        mouse.ty = 0.6 + 0.25 * Math.sin(s * 0.33 + 1);
        mouse.ton = 0.7;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      mouse.on += (mouse.ton - mouse.on) * 0.06;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, reduce ? 12 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMouseOn, mouse.on);
      gl.uniform1f(uProg, reduce ? 0 : prog01);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running) raf = requestAnimationFrame(draw);
    };
    const play = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    draw(performance.now());
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(performance.now());
    });
    ro.observe(canvas);
    let inView = true;
    const io = new IntersectionObserver(([e]) => {
      inView = !!e?.isIntersecting;
      if (inView && !document.hidden) play();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden || !inView ? stop() : play());
    document.addEventListener('visibilitychange', onVis);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
      hovering = e.clientY >= r.top && e.clientY <= r.bottom;
      mouse.ton = 1;
    };
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    const offProgress = progress?.on('change', (v) => {
      prog01 = v;
    });
    play();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      offProgress?.();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduce, rig, progress]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
