import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { drawDome, drawDoor, drawGateway, drawMedallion, layoutDome, layoutDoor, layoutGateway, layoutMedallion, warmDome, warmGateway, warmMedallion, type Dome, type Doors, type Gateway as GatewayGeo, type Medallion } from './journey';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const res = () => Math.min(window.devicePixelRatio || 1, 1.75);

/** Lays out a canvas for its box on every resize and redraws it for a progress value, at most once a frame. */
function useScene<G>(box: React.RefObject<HTMLElement | null>, canvas: React.RefObject<HTMLCanvasElement | null>, p: MotionValue<number>, layout: (W: number, H: number) => G, draw: (ctx: CanvasRenderingContext2D, g: G, r: number, v: number) => void, warm?: (g: G, r: number) => void) {
  const geo = useRef<G | null>(null);
  const raf = useRef(0);
  const paint = (v: number) => {
    const cv = canvas.current;
    if (!cv || !geo.current) return;
    draw(cv.getContext('2d')!, geo.current, res(), v);
  };
  useEffect(() => {
    const el = box.current!;
    let last = '';
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (!W || !H || `${W}x${H}` === last) return;
      last = `${W}x${H}`;
      const cv = canvas.current!;
      cv.width = Math.round(W * res());
      cv.height = Math.round(H * res());
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      const g = layout(W, H);
      geo.current = g;
      paint(p.get());
      // Paint the finished artwork while the browser is idle, before the camera reaches it.
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (warm) (w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200)))(() => warm(g, res()), { timeout: 3000 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useMotionValueEvent(p, 'change', (v) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => paint(v));
  });
}

/**
 * A tiled gateway between rooms. As it comes up the golden line draws its
 * girih; once pinned, the camera flies through the arch into the room, whose
 * title waits behind the canvas, seen through the opening and coming closer.
 * The room's content follows with a negative margin (see ROOM_PULL), so it
 * rises in under the title as the camera arrives instead of after a gap.
 */
export const ROOM_PULL = 'bl-room';
export function Gateway({ seed, children, screens = 1.9 }: { seed: number; children: ReactNode; screens?: number }) {
  const reduce = useReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef('');
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end end'] });
  // The first screen of progress is the gateway rising into view.
  const e = 1 / screens;
  const front = (v: number) => seg(v, e * 0.25, e + (1 - e) * 0.32) * 1.2;
  const fly = (v: number) => inOut(seg(v, e + (1 - e) * 0.4, 0.84));
  useScene<GatewayGeo>(stage, canvas, scrollYProgress, (W, H) => layoutGateway(W, H, seed), (ctx, g, r, v) => {
    const k = fly(v);
    const s = Math.pow(g.through, k);
    const cv = canvas.current!;
    cv.style.visibility = k >= 0.995 ? 'hidden' : 'visible';
    const fr = Math.min(front(v), 1.2);
    const key = `${fr.toFixed(4)}|${s.toFixed(4)}`;
    if (k < 0.995 && key !== last.current) drawGateway(ctx, g, r, fr, s);
    last.current = key;
  }, warmGateway);
  const roomScale = useTransform(scrollYProgress, (v) => 0.4 + 0.6 * fly(v));
  // Seen from outside, the title sits in the middle of the arch's opening (low in the frame); it rises to centre as the camera arrives.
  const roomY = useTransform(scrollYProgress, (v) => `${(1 - fly(v)) * 24}svh`);
  const roomOpacity = useTransform(scrollYProgress, (v) => 0.25 + 0.75 * seg(v, e * 0.6, e + (1 - e) * 0.3));
  if (reduce) return <div className="container-x pb-6 pt-28">{children}</div>;
  return (
    <div ref={section} className="relative" style={{ height: `${screens * 100}svh` }}>
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0 flex items-center justify-center px-5 pb-[16svh] text-center" style={{ scale: roomScale, y: roomY, opacity: roomOpacity }}>
          <div className="w-full max-w-[1000px]">{children}</div>
        </motion.div>
        <canvas ref={canvas} aria-hidden className="pointer-events-none absolute left-0 top-0" />
      </div>
    </div>
  );
}

/** The dome over the mission: drawn outward as `progress` goes 0 → 1. */
export function DomeCanvas({ progress, seed, turn }: { progress: MotionValue<number>; seed: number; turn?: MotionValue<number> }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // Nothing to draw before the line starts (the opening scrolls a long way first): clear once and wait.
  const blank = useRef(false);
  useScene<Dome>(box, canvas, progress, (W, H) => layoutDome(W, H, seed), (ctx, g, r, v) => {
    if (v <= 0) {
      if (!blank.current) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      blank.current = true;
      return;
    }
    blank.current = false;
    drawDome(ctx, g, r, v, turn?.get() ?? 0);
  }, warmDome);
  return (
    <div ref={box} className="absolute inset-0" aria-hidden>
      <canvas ref={canvas} className="absolute left-0 top-0" />
    </div>
  );
}

/** The page ends under a second dome, the council's name at its heart. */
export function FooterDome({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end end'] });
  const front = useTransform(scrollYProgress, (v) => (reduce ? 1.2 : v * 1.25));
  return (
    <div ref={box} className="relative h-[86svh] min-h-[520px] overflow-hidden">
      <DomeCanvas progress={front} seed={77} />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">{children}</div>
    </div>
  );
}

/** The pinned frame every passage shares: a room title behind a canvas, which the camera moves past. */
function usePassage(screens: number) {
  const section = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end end'] });
  const e = 1 / screens;
  return {
    section,
    p: scrollYProgress,
    /** The line drawing, as the passage rises and settles. */
    front: (v: number) => seg(v, e * 0.25, e + (1 - e) * 0.32) * 1.2,
    /** The camera move, once pinned. */
    move: (v: number) => inOut(seg(v, e + (1 - e) * 0.4, 0.84)),
    e,
  };
}

/**
 * A wall of girih with one great star at its heart. Once drawn, the star
 * opens like an iris, turning as it goes, and the room shows through it.
 */
export function StarGate({ seed, children, screens = 1.9 }: { seed: number; children: ReactNode; screens?: number }) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef('');
  const { section, p, front, move, e } = usePassage(screens);
  useScene<Medallion>(stage, canvas, p, (W, H) => layoutMedallion(W, H, seed), (ctx, g, r, v) => {
    const k = move(v);
    const key = `${Math.min(front(v), 1.2).toFixed(4)}|${k.toFixed(4)}`;
    canvas.current!.style.visibility = k >= 0.995 ? 'hidden' : 'visible';
    if (k < 0.995 && key !== last.current) drawMedallion(ctx, g, r, Math.min(front(v), 1.2), k);
    last.current = key;
  }, warmMedallion);
  const scale = useTransform(p, (v) => 0.42 + 0.58 * move(v));
  const opacity = useTransform(p, (v) => seg(v, e + (1 - e) * 0.38, e + (1 - e) * 0.6));
  if (reduce) return <div className="container-x pb-6 pt-28 text-center">{children}</div>;
  return (
    <div ref={section} className="relative" style={{ height: `${screens * 100}svh` }}>
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0 flex items-center justify-center px-5 pb-[16svh] text-center" style={{ scale, opacity }}>
          <div className="w-full max-w-[1000px]">{children}</div>
        </motion.div>
        <canvas ref={canvas} aria-hidden className="pointer-events-none absolute left-0 top-0" />
      </div>
    </div>
  );
}

/** Carved walnut doors: the line cuts their star carving, then they swing open in depth onto the room. */
export function DoorGate({ children, screens = 1.9 }: { children: ReactNode; screens?: number }) {
  const reduce = useReducedMotion();
  const leftBox = useRef<HTMLDivElement>(null);
  const rightBox = useRef<HTMLDivElement>(null);
  const leftCv = useRef<HTMLCanvasElement>(null);
  const rightCv = useRef<HTMLCanvasElement>(null);
  const { section, p, front, move, e } = usePassage(screens);
  useScene<Doors>(leftBox, leftCv, p, (W, H) => layoutDoor(W, H, -1), (ctx, g, r, v) => drawDoor(ctx, g, r, Math.min(front(v), 1.2), -1));
  useScene<Doors>(rightBox, rightCv, p, (W, H) => layoutDoor(W, H, 1), (ctx, g, r, v) => drawDoor(ctx, g, r, Math.min(front(v), 1.2), 1));
  const leftT = useTransform(p, (v) => `perspective(1400px) rotateY(${-move(v) * 108}deg)`);
  const rightT = useTransform(p, (v) => `perspective(1400px) rotateY(${move(v) * 108}deg)`);
  const doorsScale = useTransform(p, (v) => 1 + move(v) * 0.5);
  const roomScale = useTransform(p, (v) => 0.82 + 0.18 * move(v));
  const roomOpacity = useTransform(p, (v) => seg(v, e + (1 - e) * 0.4, e + (1 - e) * 0.65));
  if (reduce) return <div className="container-x pb-6 pt-28 text-center">{children}</div>;
  return (
    <div ref={section} className="relative" style={{ height: `${screens * 100}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0 flex items-center justify-center px-5 pb-[16svh] text-center" style={{ scale: roomScale, opacity: roomOpacity }}>
          <div className="w-full max-w-[1000px]">{children}</div>
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-y-[6svh] left-1/2 w-[min(86vw,760px)] -translate-x-1/2">
        <motion.div className="flex h-full w-full" style={{ scale: doorsScale }}>
          <motion.div ref={leftBox} className="relative h-full w-1/2 origin-left" style={{ transform: leftT }}>
            <canvas ref={leftCv} className="absolute left-0 top-0" />
          </motion.div>
          <motion.div ref={rightBox} className="relative h-full w-1/2 origin-right" style={{ transform: rightT }}>
            <canvas ref={rightCv} className="absolute left-0 top-0" />
          </motion.div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * The end of the journey, the opening run backwards: the page begins at the
 * doorway, close up, and the camera pulls back out of the tiled arch until
 * the whole gateway stands in the night with the council's name inside it.
 */
export function FooterGate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef('');
  const section = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start end', 'end end'] });
  const back = (v: number) => inOut(seg(v, 0.2, 0.95));
  useScene<GatewayGeo>(stage, canvas, p, (W, H) => layoutGateway(W, H, 91), (ctx, g, r, v) => {
    const k = back(v);
    const s = Math.pow(g.through, 1 - k);
    const key = `${k.toFixed(4)}`;
    if (key !== last.current) drawGateway(ctx, g, r, 1.2, s);
    last.current = key;
  }, warmGateway);
  const scale = useTransform(p, (v) => 1 - 0.55 * back(v));
  const y = useTransform(p, (v) => `${back(v) * 14}svh`);
  if (reduce) return <div className="flex flex-col items-center py-24 text-center">{children}</div>;
  return (
    <div ref={section} className="relative h-[180svh]">
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ scale, y }}>
          {children}
        </motion.div>
        <canvas ref={canvas} aria-hidden className="pointer-events-none absolute left-0 top-0" />
      </div>
    </div>
  );
}
