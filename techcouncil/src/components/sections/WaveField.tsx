import { useEffect, useRef } from 'react';

/**
 * Hero background: a WebGL fragment shader drawing fine white wave lines that
 * drift slowly and swell around the cursor. Plain WebGL 1, one full-screen
 * triangle, no libraries. Capped pixel ratio, paused off-screen and in hidden
 * tabs, a single still frame under reduced motion. Renders nothing if WebGL
 * is unavailable.
 */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseOn;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.08;

  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float d = distance(p, m);
  float swell = uMouseOn * 0.06 * exp(-d * d * 14.0);

  float y = uv.y
    + (noise(vec2(p.x * 1.4 + t, t * 0.6)) - 0.5) * 0.42
    + sin(p.x * 2.6 + t * 3.0) * 0.035
    + swell;

  float lines = 46.0;
  float dist = abs(fract(y * lines) - 0.5);
  float th = 1.1 / (uRes.y / lines);
  float line = 1.0 - smoothstep(th * 0.5, th * 1.6, 0.5 - dist);

  // Brightest top-right, fading toward the lower-left where the headline sits.
  float mask = smoothstep(0.0, 1.0, uv.x * 0.8 + uv.y * 0.7 - 0.2);
  float shimmer = 0.35 + 0.65 * noise(vec2(p.x * 3.0 - t * 2.0, y * 6.0));
  float glow = uMouseOn * exp(-d * d * 10.0) * 0.45;
  float a = line * (0.06 + 0.3 * mask * shimmer + glow);

  gl_FragColor = vec4(vec3(1.0), a);
}
`;

export default function WaveField({ reduce }: { reduce: boolean }) {
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

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6, on: 0, ton: 0 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const start = performance.now();
    let raf = 0;
    let running = false;
    const draw = (now: number) => {
      if (!fine) {
        // Touch: a slow wandering swell keeps the field alive.
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
      mouse.ton = e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0;
    };
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    play();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduce]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
