import { useEffect, useRef } from 'react';
import type { MotionValue } from 'motion/react';
import { courses, drawLines } from './night';

/**
 * The original hero's wave lines (the flat rig of WaveField), with two
 * changes so they can be laid as tiles: the hash has no sine in it, so the
 * mural in night.ts can trace the same curves, and the drift is bounded
 * around a rest shape. While the page sits at the top the lines wander and
 * swell as on the live site; once the scroll starts they settle onto the
 * rest shape, which is exactly where the tiles go.
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uDpr;
uniform float uLive;

float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float band(float v, float w){
  float e = 0.5 - abs(fract(v) - 0.5);
  return 1.0 - smoothstep(w * 0.5, w * 1.6, e);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 ps = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.08;
  float lw = (2.0 / uDpr) / uRes.y;

  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float d = distance(ps, m);
  float on = uMouseOn * uLive;
  float glow = on * exp(-d * d * 10.0) * 0.45;
  float mask = smoothstep(0.0, 1.0, uv.x * 0.8 + uv.y * 0.7 - 0.2);
  // Drift that stays near the rest shape (wave() in night.ts), so the lines can settle onto it.
  vec2 drift = uLive * vec2(0.6 * sin(uTime * 0.11), 0.45 * sin(uTime * 0.083));
  float y = uv.y
    + (noise(vec2(ps.x * 1.4 + 0.37 + drift.x, 0.5 + drift.y)) - 0.5) * 0.42
    + sin(ps.x * 2.6 + 0.9 + uLive * 0.6 * sin(uTime * 0.24)) * 0.035
    + on * 0.06 * exp(-d * d * 14.0);
  float line = band(y * 46.0, lw * 46.0);
  float shimmer = 0.35 + 0.65 * noise(vec2(ps.x * 3.0 - t * 2.0, y * 6.0));
  gl_FragColor = vec4(vec3(1.0), line * (0.16 + 0.4 * mask * shimmer + glow));
}
`;

/** `progress` is the opening's scroll progress: the lines settle over [0, settleBy] and stop drawing once covered at `goneAt`. */
export function LineField({ progress, settleBy, goneAt }: { progress: MotionValue<number>; settleBy: number; goneAt: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // No WebGL: the lines at rest, drawn once per size.
    if (!gl) {
      const ro = new ResizeObserver(() => {
        const r = canvas.getBoundingClientRect();
        if (r.width && r.height) drawLines(canvas, r.width, r.height, dpr, courses(r.width, r.height));
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }

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
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u('uRes');
    const uTime = u('uTime');
    const uMouse = u('uMouse');
    const uMouseOn = u('uMouseOn');
    const uDpr = u('uDpr');
    const uLive = u('uLive');

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6, on: 0, ton: 0 };
    let hovering = false;
    let p01 = progress.get();
    const live = () => {
      const k = Math.min(1, Math.max(0, p01 / settleBy));
      return 1 - k * k * (3 - 2 * k);
    };

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
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMouseOn, mouse.on);
      gl.uniform1f(uLive, live());
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running) raf = requestAnimationFrame(draw);
    };
    let inView = true;
    const wanted = () => inView && !document.hidden && p01 < goneAt;
    const play = () => {
      if (running || !wanted()) return;
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
    const io = new IntersectionObserver(([e]) => {
      inView = !!e?.isIntersecting;
      if (wanted()) play();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (wanted() ? play() : stop());
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
    const off = progress.on('change', (v) => {
      p01 = v;
      if (wanted()) play();
      else stop();
    });
    play();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      off();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
    };
  }, [progress, settleBy, goneAt]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
