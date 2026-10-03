import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { drawDome, drawGateway, layoutDome, layoutGateway, warmDome, warmGateway, type Dome, type Gateway as GatewayGeo } from './journey';

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
export function Gateway({ seed, children, screens = 2.4 }: { seed: number; children: ReactNode; screens?: number }) {
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
  const roomScale = useTransform(scrollYProgress, (v) => 0.62 + 0.38 * fly(v));
  const roomOpacity = useTransform(scrollYProgress, (v) => 0.25 + 0.75 * seg(v, e * 0.6, e + (1 - e) * 0.3));
  if (reduce) return <div className="container-x pb-6 pt-28">{children}</div>;
  return (
    <div ref={section} className="relative" style={{ height: `${screens * 100}svh` }}>
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0 flex items-center justify-center px-5 pb-[16svh] text-center" style={{ scale: roomScale, opacity: roomOpacity }}>
          <div className="w-full max-w-[1000px]">{children}</div>
        </motion.div>
        <canvas ref={canvas} aria-hidden className="pointer-events-none absolute left-0 top-0" />
      </div>
    </div>
  );
}

/** The dome over the mission: drawn outward as `progress` goes 0 → 1. */
export function DomeCanvas({ progress, seed }: { progress: MotionValue<number>; seed: number }) {
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
    drawDome(ctx, g, r, v);
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
