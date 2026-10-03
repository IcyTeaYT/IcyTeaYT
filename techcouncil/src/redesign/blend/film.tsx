import { animate, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { HERO, MISSION } from '@/data/copy';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { Arrow } from '@/components/ui/Arrow';
import { DomeCanvas } from './JourneyParts';

/**
 * The film landings, after the Vela site: a ten-second shot of the Registan
 * (Kling, upscaled 4x) played by scroll, with the council's name set huge in
 * the sky *behind* the madrasahs. Each video carries its own sky mask beside
 * the picture; one WebGL pass draws the frame and lays the name only where the
 * sky is, so the domes and minarets stand in front of the letters and rise
 * through them as the camera pushes in. Then the shot fades under the star
 * dome, where the mission lights word by word.
 *   night  the square lit gold under a deep blue sky, the name in warm white
 *   day    the square in clear daylight, the name in ink, Vela's bright look
 */
export type Cut = 'night' | 'day';

/** A packed video: the picture, and beside or under it its sky mask at half size. */
interface Pack {
  name: 'l' | 'p';
  W: number;
  H: number;
  color: [number, number, number, number];
  mask: [number, number, number, number];
}
const PACKS: Record<'l' | 'p', Pack> = {
  // Landscape screens: 2560x1440 picture over a 1280x720 mask.
  l: { name: 'l', W: 2560, H: 2160, color: [0, 0, 2560, 1440], mask: [0, 1440, 1280, 720] },
  // Portrait phones: a 1080x1920 crop round the middle madrasah, its mask to the right.
  p: { name: 'p', W: 1632, H: 1920, color: [0, 0, 1080, 1920], mask: [1088, 0, 540, 960] },
};
const pickPack = (W: number, H: number) => (W / H < 0.9 ? PACKS.p : PACKS.l);

const TITLE = ['TIS Tech', 'Council'];
const INK: Record<Cut, [number, number, number]> = { day: [0.1, 0.12, 0.17], night: [0.97, 0.95, 0.91] };

const SCROLL = 3;
const at = (s: number) => s / SCROLL;
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const T = {
  /** Scroll that plays the shot. */
  film: [0, at(1.75)] as [number, number],
  /** The small print and the button leave as soon as the camera moves. */
  ui: [at(0.03), at(0.3)] as [number, number],
  /** The name fades once the buildings have risen into it. */
  title: [at(1.2), at(1.52)] as [number, number],
  fade: [at(1.55), at(1.85)] as [number, number],
  words: [at(1.9), at(2.75)] as [number, number],
};
/** A slow push on top of the shot's own move, towards the middle portal. */
const ZOOM = 0.07;
const FOCUS: [number, number] = [0.5, 0.58];

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uText;
uniform vec4 uColor;
uniform vec4 uMask;
uniform vec4 uMaskClamp;
uniform vec4 uView;
uniform vec3 uInk;
uniform float uInkA;
uniform float uShift;
void main() {
  vec2 c = uView.xy + vUv * uView.zw;
  vec3 col = texture2D(uTex, uColor.xy + clamp(c, 0.0, 1.0) * uColor.zw).rgb;
  float sky = texture2D(uTex, uMask.xy + clamp(c, uMaskClamp.xy, uMaskClamp.zw) * uMask.zw).r;
  sky = smoothstep(0.3, 0.7, sky);
  float t = texture2D(uText, vec2(vUv.x, vUv.y - uShift)).a * uInkA * sky;
  gl_FragColor = vec4(mix(col, uInk, t), 1.0);
}`;

interface Gl {
  gl: WebGLRenderingContext;
  u: Record<string, WebGLUniformLocation | null>;
  frame: WebGLTexture;
  text: WebGLTexture;
}

function makeGl(canvas: HTMLCanvasElement): Gl | null {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = (unit: number) => {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  };
  const frame = tex(0);
  const text = tex(1);
  const u: Gl['u'] = {};
  for (const n of ['uTex', 'uText', 'uColor', 'uMask', 'uMaskClamp', 'uView', 'uInk', 'uInkA', 'uShift']) u[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(u.uTex!, 0);
  gl.uniform1i(u.uText!, 1);
  return { gl, u, frame, text };
}

/** How the picture covers the stage: scale and offset in CSS px. */
function cover(pack: Pack, W: number, H: number) {
  const [, , cw, ch] = pack.color;
  const s = Math.max(W / cw, H / ch);
  return { s, ox: (W - cw * s) / 2, oy: (H - ch * s) / 2, cw, ch };
}

/** Sets the name, white on transparent, where it sits over the picture. */
function paintTitle(cv: HTMLCanvasElement, pack: Pack, W: number, H: number, r: number) {
  cv.width = Math.round(W * r);
  cv.height = Math.round(H * r);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const { s, ox, oy, cw, ch } = cover(pack, W, H);
  const font = (px: number) => `600 ${px}px "Inter Variable", Inter, system-ui, sans-serif`;
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  // Size it in the picture's own pixels, so it keeps its place against the buildings on any screen.
  ctx.font = font(100);
  if ('letterSpacing' in c) c.letterSpacing = '-4.5px';
  const widest = Math.max(...TITLE.map((l) => ctx.measureText(l).width)) / 100;
  const portrait = pack.name === 'p';
  let f = portrait ? (cw * 0.86) / widest : Math.min(ch * 0.2, (cw * 0.6) / widest);
  // Never wider than the screen itself.
  f = Math.min(f, (W * 0.9) / s / widest);
  const px = f * s;
  ctx.font = font(px);
  if ('letterSpacing' in c) c.letterSpacing = `${(-0.045 * px).toFixed(2)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  const x = ox + cw * 0.5 * s;
  // The last line sits low enough that the middle portal and its dome stand in
  // front of it; on a phone a little higher, and the portal rises into it as the camera pushes in.
  const last = oy + ch * (portrait ? 0.5 : 0.6) * s;
  TITLE.forEach((line, i) => ctx.fillText(line, x, last - (TITLE.length - 1 - i) * px * 0.9));
}

function Cta({ cut }: { cut: Cut }) {
  const { scrollTo } = useSmoothScroll();
  return (
    <a
      href="#suggestions"
      onClick={(e) => {
        e.preventDefault();
        scrollTo('#suggestions');
      }}
      className={`inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-pill border px-6 text-body transition-colors ${cut === 'day' ? 'border-obsidian/40 text-obsidian hover:bg-obsidian hover:text-paper' : 'border-paper/45 text-paper hover:bg-paper hover:text-obsidian'}`}
    >
      Suggest an idea
      <Arrow />
    </a>
  );
}

function MissionWord({ children, p, range }: { children: string; p: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(p, ...span(range, [0.18, 1]));
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

export function FilmOpening({ cut }: { cut: Cut }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const [pack, setPack] = useState<Pack | null>(null);
  const [noGl, setNoGl] = useState(false);
  const intro = useMotionValue(0);

  // Which video suits the screen; a phone turned on its side switches.
  useEffect(() => {
    const el = stage.current!;
    const ro = new ResizeObserver(() => {
      const next = pickPack(el.clientWidth, el.clientHeight);
      setPack((cur) => (cur?.name === next.name ? cur : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!pack) return;
    const v = video.current!;
    const cv = canvas.current!;
    const el = stage.current!;
    const file = `/landing/${cut}-${pack.name}`;
    const g = makeGl(cv);
    setNoGl(!g);
    const titleCv = document.createElement('canvas');
    let alive = true;
    let url = '';
    let hasFrame = false;
    let dirty = true;
    let fresh = false;
    let raf = 0;
    let W = 0;
    let H = 0;

    // The video sits under the canvas, laid out so its picture covers the stage:
    // it is what shows if WebGL is missing, and keeps the browser decoding it.
    const layout = () => {
      W = el.clientWidth;
      H = el.clientHeight;
      if (!W || !H) return;
      const { s, ox, oy } = cover(pack, W, H);
      Object.assign(v.style, { width: `${pack.W * s}px`, height: `${pack.H * s}px`, left: `${ox - pack.color[0] * s}px`, top: `${oy - pack.color[1] * s}px` });
      if (!g) return;
      // Phones draw at their full density (3x), so the name stays razor-sharp; big screens cap at 2x.
      const r = Math.min(window.devicePixelRatio || 1, W < 700 ? 3 : 2);
      cv.width = Math.round(W * r);
      cv.height = Math.round(H * r);
      paintTitle(titleCv, pack, W, H, r);
      const { gl } = g;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, g.text);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, titleCv);
      dirty = true;
    };

    const upload = (src: TexImageSource) => {
      if (!g) return;
      const { gl } = g;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, g.frame);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      hasFrame = true;
      dirty = true;
    };

    const draw = () => {
      if (!g || !hasFrame || !W) return;
      const { gl, u } = g;
      const at = p.get();
      const { s, ox, oy, cw, ch } = cover(pack, W, H);
      // Screen uv to picture uv, then the push towards the portal.
      const z = 1 + ZOOM * seg(at, ...T.film);
      const zw = [W / (s * cw), H / (s * ch)];
      const xy = [-ox / (s * cw), -oy / (s * ch)];
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform4f(u.uView!, xy[0]! / z + FOCUS[0] * (1 - 1 / z), xy[1]! / z + FOCUS[1] * (1 - 1 / z), zw[0]! / z, zw[1]! / z);
      gl.uniform4f(u.uColor!, pack.color[0] / pack.W, pack.color[1] / pack.H, pack.color[2] / pack.W, pack.color[3] / pack.H);
      gl.uniform4f(u.uMask!, pack.mask[0] / pack.W, pack.mask[1] / pack.H, pack.mask[2] / pack.W, pack.mask[3] / pack.H);
      // Keep mask samples a pixel inside its own rectangle, clear of the picture next to it.
      gl.uniform4f(u.uMaskClamp!, 1.5 / pack.mask[2], 1.5 / pack.mask[3], 1 - 1.5 / pack.mask[2], 1 - 1.5 / pack.mask[3]);
      const ink = INK[cut];
      gl.uniform3f(u.uInk!, ink[0], ink[1], ink[2]);
      const k = intro.get();
      gl.uniform1f(u.uInkA!, (cut === 'day' ? 0.92 : 0.96) * k * (1 - seg(at, ...T.title)));
      gl.uniform1f(u.uShift!, (1 - k) * 0.035);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // The first frame, as a still, until the video arrives.
    const poster = new Image();
    poster.decoding = 'async';
    poster.src = `${file}.jpg`;
    poster.decode().then(() => {
      if (alive && !fresh) upload(poster);
      if (alive) animate(intro, 1, { duration: 1.6, ease: EASE_OUT, delay: 0.15 });
    }, () => animate(intro, 1, { duration: 1.6, ease: EASE_OUT }));

    // The whole shot is fetched first, so any moment in it can be shown at once.
    fetch(`${file}.mp4`)
      .then((r) => r.blob())
      .then((b) => {
        if (!alive) return;
        url = URL.createObjectURL(b);
        v.src = url;
      })
      .catch(() => {
        if (alive) v.src = `${file}.mp4`;
      });

    // Each new video frame is copied to the canvas once it is ready: on the
    // frame callback where there is one, and after every seek either way.
    let shownAt = -1;
    const grab = () => {
      if (!alive || v.readyState < 2 || v.currentTime === shownAt) return;
      shownAt = v.currentTime;
      fresh = true;
      upload(v);
    };
    const vfc = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback?.bind(v);
    const onVfc = () => {
      grab();
      if (alive && vfc) vfc(onVfc);
    };
    if (vfc) vfc(onVfc);
    // Safari hands a paused video's frames to WebGL only once it has played: play a moment, then hold.
    const unlock = () => v.play().then(() => v.pause(), () => {});
    v.addEventListener('seeked', grab);
    v.addEventListener('loadeddata', grab);
    v.addEventListener('loadedmetadata', unlock, { once: true });

    // Scroll sets where the camera should be and the playhead follows, one seek
    // at a time (a keyframe every four frames keeps each seek short).
    let cur = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const at = p.get();
      if (v.duration && v.readyState >= 1 && at <= T.fade[1] + 0.02) {
        const target = seg(at, ...T.film) * (v.duration - 0.05);
        cur += (target - cur) * 0.45;
        if (Math.abs(target - cur) < 0.004) cur = target;
        if (!v.seeking && Math.abs(v.currentTime - cur) > 0.01) v.currentTime = cur;
      }
      // Past the film (it has faded out) there is nothing to draw.
      if (dirty && at <= T.fade[1] + 0.02) {
        dirty = false;
        draw();
      }
    };
    raf = requestAnimationFrame(tick);
    const unP = p.on('change', () => (dirty = true));
    const unI = intro.on('change', () => (dirty = true));
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    layout();
    // The name is drawn in the site's font: repaint it once that has loaded.
    document.fonts?.load('600 100px "Inter Variable"').then(() => alive && layout());

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      unP();
      unI();
      v.removeEventListener('seeked', grab);
      v.removeEventListener('loadeddata', grab);
      v.removeEventListener('loadedmetadata', unlock);
      v.removeAttribute('src');
      v.load();
      if (url) URL.revokeObjectURL(url);
      g?.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [cut, pack]);

  // The nav reads dark ink over the day sky, light over the night.
  const light = cut === 'day';
  useMotionValueEvent(p, 'change', (v) => {
    const s = light && v < T.fade[0] ? 'light' : 'dark';
    if (section.current && section.current.dataset.surface !== s) section.current.dataset.surface = s;
  });

  const uiO = useTransform(p, ...span(T.ui, [1, 0]));
  const uiY = useTransform(p, ...span(T.ui, [0, 24]));
  const filmO = useTransform(p, ...span(T.fade, [1, 0]));
  const domeP = useTransform(p, (v) => seg(v, T.fade[0], T.words[0] + 0.05) * 1.25);
  const turn = useTransform(p, (v) => v * 0.9);
  const missionO = useTransform(p, ...span([T.fade[1] - 0.02, T.words[0]], [0, 1]));
  const support = useTransform(p, ...span([T.words[1] - 0.02, T.words[1] + 0.05], [0, 1]));
  const supportY = useTransform(p, ...span([T.words[1] - 0.02, T.words[1] + 0.05], [20, 0]));
  const fallbackO = useTransform(p, ...span(T.title, [1, 0]));

  const words = MISSION.line.split(' ');
  const ink = light ? 'text-obsidian' : 'text-paper';
  return (
    <section id="top" ref={section} data-surface={light ? 'light' : 'dark'} data-nav-clear aria-labelledby="hero-title" className="relative bg-obsidian text-paper" style={{ height: `calc(${(SCROLL + 1) * 100}svh - var(--bar, 0px))` }}>
      <div id="mission" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: `calc((${SCROLL * 100}svh - var(--bar, 0px)) * ${T.words[0]})` }} />
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden">
        {/* Under the film: the dome and the mission. */}
        <div className="absolute inset-0">
          <DomeCanvas progress={domeP} seed={41} turn={turn} />
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ opacity: missionO }}>
            <h2 id="mission-title" className="type-display max-w-[15ch] text-[clamp(2.4rem,5.4vw,4.8rem)]">
              <span className="sr-only">{MISSION.line}</span>
              <span aria-hidden>
                {words.map((w, i) => (
                  <MissionWord key={i} p={p} range={[T.words[0] + (i / words.length) * (T.words[1] - T.words[0]), T.words[0] + ((i + 1) / words.length) * (T.words[1] - T.words[0])]}>
                    {w}
                  </MissionWord>
                ))}
              </span>
            </h2>
            <motion.p className="mt-7 max-w-[46ch] text-body-lg text-fog" style={{ opacity: support, y: supportY }}>
              {MISSION.support}
            </motion.p>
          </motion.div>
        </div>

        {/* The film: the video (laid out by script) under the canvas that composites it. */}
        <motion.div className="absolute inset-0 overflow-hidden bg-obsidian" style={{ opacity: filmO }}>
          <video ref={video} aria-hidden muted playsInline preload="auto" className="absolute max-w-none" />
          {/* A fresh canvas per video: the old one's WebGL context is let go when the video changes. */}
          <canvas key={pack?.name} ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full ${noGl ? 'hidden' : ''}`} />
          {noGl && (
            <motion.p aria-hidden className={`type-display absolute inset-x-0 top-[18%] text-center text-[clamp(3.5rem,11vw,12rem)] font-semibold leading-[0.9] ${ink}`} style={{ opacity: fallbackO }}>
              {TITLE.join(' ')}
            </motion.p>
          )}
        </motion.div>

        <h1 id="hero-title" className="sr-only">
          TIS Tech Council. {HERO.title}
        </h1>

        {/* The small print, Vela-style: a line of copy bottom left, one button bottom right. */}
        <motion.div className="absolute inset-x-0 bottom-0" style={{ opacity: uiO, y: uiY }}>
          {/* It sits over the busy square, so a soft haze (shade at night) keeps it readable; taller on phones, where it stacks. */}
          <div aria-hidden className={`absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t to-transparent md:h-[36%] ${light ? 'from-paper/85 via-paper/45' : 'from-black/75 via-black/35'}`} />
          <motion.div
            className="container-x relative flex flex-col items-start gap-4 pb-[calc(10.25rem+var(--bar,0px))] md:flex-row md:items-end md:justify-between md:pb-[calc(2.25rem+var(--bar,0px))]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.9 }}
          >
            <div className={`max-w-[36ch] ${ink}`}>
              <p className="text-body font-medium leading-snug md:text-body-lg">{HERO.title}</p>
              <p className="mt-1 hidden text-body leading-snug opacity-70 md:block">Tools and projects built by students, for Tashkent International School.</p>
              {cut === 'night' && <p className="mt-2 font-mono text-[9px] opacity-55 md:mt-3 md:text-[10px]">Film from a photo by Kraftabbas, CC BY-SA 4.0</p>}
            </div>
            <Cta cut={cut} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
