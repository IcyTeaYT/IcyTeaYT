import { useEffect, useRef, type RefObject } from 'react';

/**
 * Circuit traces that run out of the logo's core across the hero, drawn in
 * the same right-angle language as the traces inside the mark. Each trace
 * belongs to the petal it leaves from and lights up in that colour near the
 * cursor; signals travel outward along them.
 *
 * Plain 2D canvas. DPR capped, pauses off-screen and in hidden tabs, one
 * static frame under reduced motion. Touch devices get a slow wandering
 * "cursor" so the field is never dead.
 */

const PETAL_INK = {
  orange: [246, 172, 92],
  red: [224, 100, 124],
  teal: [63, 184, 175],
  cyan: [76, 198, 226],
} as const;
type Petal = keyof typeof PETAL_INK;

interface Trace {
  pts: [number, number][];
  lens: number[];
  total: number;
  petal: Petal;
}
interface Signal {
  trace: number;
  t: number;
  speed: number;
}

function petalFor(angle: number): Petal {
  // Screen angles: petals sit in the four diagonal quadrants of the mark.
  const a = (angle + Math.PI * 2) % (Math.PI * 2);
  if (a >= Math.PI && a < Math.PI * 1.5) return 'orange'; // up-left
  if (a >= Math.PI * 1.5) return 'red'; // up-right
  if (a < Math.PI * 0.5) return 'cyan'; // down-right
  return 'teal'; // down-left
}

// Small deterministic PRNG so the layout is stable between renders.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildTraces(w: number, h: number, cx: number, cy: number, r: number, mobile: boolean): Trace[] {
  const rand = rng(7);
  const traces: Trace[] = [];
  const count = mobile ? 16 : 30;
  const grid = mobile ? 18 : 22;
  const snap = (v: number) => Math.round(v / grid) * grid;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    let x = cx + Math.cos(angle) * r * 1.02;
    let y = cy + Math.sin(angle) * r * 1.02;
    const pts: [number, number][] = [[x, y]];
    // Leave the rim along the dominant axis, then alternate with right-angle turns.
    let horizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));
    const sx = Math.sign(Math.cos(angle)) || 1;
    const sy = Math.sign(Math.sin(angle)) || 1;
    const segments = 3 + Math.floor(rand() * 4);
    for (let s = 0; s < segments; s++) {
      const len = snap(grid * (2 + rand() * (s === 0 ? 3 : 7)));
      if (horizontal) x += sx * len;
      else y += sy * len;
      pts.push([x, y]);
      horizontal = !horizontal;
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) break;
    }
    const lens: number[] = [];
    let total = 0;
    for (let k = 1; k < pts.length; k++) {
      const l = Math.hypot(pts[k]![0] - pts[k - 1]![0], pts[k]![1] - pts[k - 1]![1]);
      lens.push(l);
      total += l;
    }
    traces.push({ pts, lens, total, petal: petalFor(angle) });
  }
  return traces;
}

function pointAt(tr: Trace, t: number): [number, number] {
  let d = t * tr.total;
  for (let k = 0; k < tr.lens.length; k++) {
    const l = tr.lens[k]!;
    if (d <= l) {
      const a = tr.pts[k]!;
      const b = tr.pts[k + 1]!;
      const f = l === 0 ? 0 : d / l;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    d -= l;
  }
  return tr.pts[tr.pts.length - 1]!;
}

export default function CircuitField({ markRef, reduce }: { markRef: RefObject<HTMLElement>; reduce: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let w = 0;
    let h = 0;
    let traces: Trace[] = [];
    let signals: Signal[] = [];
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const R = fine ? 200 : 170;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = markRef.current?.getBoundingClientRect();
      const cx = m ? m.left - rect.left + m.width / 2 : w * 0.75;
      const cy = m ? m.top - rect.top + m.height / 2 : h * 0.5;
      const r = m ? m.width * 0.36 : 200;
      traces = buildTraces(w, h, cx, cy, r, w < 768);
      signals = [];
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      if (!fine) {
        const s = now / 1000;
        mouse.tx = w * (0.5 + 0.4 * Math.sin(s * 0.3));
        mouse.ty = h * (0.5 + 0.35 * Math.sin(s * 0.41 + 1));
      }
      if (mouse.x < -9000) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;

      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const tr of traces) {
        const [pr, pg, pb] = PETAL_INK[tr.petal];
        // Base trace
        ctx.strokeStyle = 'rgba(238,241,245,0.1)';
        ctx.beginPath();
        tr.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        // Light each segment by its distance to the cursor.
        for (let k = 1; k < tr.pts.length; k++) {
          const [ax, ay] = tr.pts[k - 1]!;
          const [bx, by] = tr.pts[k]!;
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const d = Math.hypot(mx - mouse.x, my - mouse.y);
          if (d > R) continue;
          const a = (1 - d / R) * 0.85;
          ctx.strokeStyle = `rgba(${pr},${pg},${pb},${a})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
        // End pad: a small ring, like the ones inside the mark.
        const [ex, ey] = tr.pts[tr.pts.length - 1]!;
        const de = Math.hypot(ex - mouse.x, ey - mouse.y);
        const lit = de < R ? 1 - de / R : 0;
        ctx.strokeStyle = lit > 0 ? `rgba(${pr},${pg},${pb},${0.25 + lit * 0.75})` : 'rgba(238,241,245,0.2)';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Signals travel from the core outward, in their petal's colour.
      if (!reduce && signals.length < (fine ? 10 : 6) && Math.random() < 0.05) {
        signals.push({ trace: Math.floor(Math.random() * traces.length), t: 0, speed: 0.0035 + Math.random() * 0.004 });
      }
      signals = signals.filter((s) => {
        const tr = traces[s.trace];
        if (!tr) return false;
        s.t += s.speed * (tr.total > 0 ? 400 / tr.total : 1);
        if (s.t >= 1) return false;
        const [x, y] = pointAt(tr, s.t);
        const [pr, pg, pb] = PETAL_INK[tr.petal];
        const a = Math.sin(s.t * Math.PI);
        // Short comet tail
        const [tx, ty] = pointAt(tr, Math.max(0, s.t - 24 / tr.total));
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${a * 0.9})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.lineWidth = 1.25;
        return true;
      });

      if (running) raf = requestAnimationFrame(draw);
    };

    let raf = 0;
    let running = false;
    const start = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    layout();
    if (reduce) draw(0);
    const ro = new ResizeObserver(() => {
      layout();
      if (reduce) draw(0);
    });
    ro.observe(canvas);
    let inView = true;
    const io = new IntersectionObserver(([e]) => {
      inView = !!e?.isIntersecting;
      if (inView && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden || !inView ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
    };
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
    };
  }, [markRef, reduce]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
