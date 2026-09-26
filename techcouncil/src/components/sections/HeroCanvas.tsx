import { useEffect, useRef } from 'react';

/**
 * Interactive "circuit" field for the hero: drifting nodes that link up when
 * close, light up cyan near the cursor and send small signal pulses along the
 * links. Plain 2D canvas, no dependencies.
 *
 * Performance: DPR capped at 1.75, node count scales with area, spatial grid
 * for neighbour lookups, pauses when off-screen or the tab is hidden. On touch
 * devices a slow virtual cursor wanders instead. Reduced motion draws a single
 * static frame.
 */
export default function HeroCanvas({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const LINK = fine ? 150 : 120;
    const MOUSE_R = fine ? 220 : 180;

    type Node = { x: number; y: number; vx: number; vy: number; r: number; glow: number };
    type Pulse = { a: number; b: number; t: number; speed: number };
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let w = 0;
    let h = 0;

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(130, Math.max(34, (w * h) / (fine ? 11000 : 12500))));
      if (nodes.length > target) nodes.length = target;
      while (nodes.length < target) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.3 + 0.7,
          glow: 0,
        });
      }
    };

    // Spatial hash so each node only checks its neighbours.
    const cell = LINK;
    let grid = new Map<number, number[]>();
    const key = (cx: number, cy: number) => cx * 4096 + cy;
    const buildGrid = () => {
      grid = new Map();
      nodes.forEach((n, i) => {
        const k = key(Math.floor(n.x / cell), Math.floor(n.y / cell));
        const list = grid.get(k);
        if (list) list.push(i);
        else grid.set(k, [i]);
      });
    };

    let t0 = performance.now();
    let raf = 0;
    let running = false;

    const frame = (now: number) => {
      const dt = Math.min(2.5, (now - t0) / 16.67);
      t0 = now;

      if (!fine) {
        // Touch: a slow Lissajous "cursor" keeps the field alive.
        const s = now / 1000;
        mouse.tx = w * (0.5 + 0.34 * Math.sin(s * 0.33));
        mouse.ty = h * (0.45 + 0.26 * Math.sin(s * 0.47 + 1.2));
        mouse.active = true;
      }
      if (mouse.x < -9000) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.12 * dt;
      mouse.y += (mouse.ty - mouse.y) * 0.12 * dt;

      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -20) n.x = w + 20;
        else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        else if (n.y > h + 20) n.y = -20;
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        const target = mouse.active && d < MOUSE_R ? 1 - d / MOUSE_R : 0;
        n.glow += (target - n.glow) * 0.1 * dt;
        // Gentle push away from the cursor so the field "parts" around it.
        if (mouse.active && d < MOUSE_R * 0.55 && d > 0.1) {
          const f = (1 - d / (MOUSE_R * 0.55)) * 0.35 * dt;
          n.x += (dx / d) * f;
          n.y += (dy / d) * f;
        }
      }

      buildGrid();

      // Links
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        const cx = Math.floor(a.x / cell);
        const cy = Math.floor(a.y / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const list = grid.get(key(gx, gy));
            if (!list) continue;
            for (const j of list) {
              if (j <= i) continue;
              const b = nodes[j]!;
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d > LINK) continue;
              const base = 1 - d / LINK;
              const glow = Math.max(a.glow, b.glow);
              const alpha = base * (0.09 + glow * 0.6);
              ctx.strokeStyle = glow > 0.05 ? `rgba(77,232,250,${alpha})` : `rgba(120,160,255,${alpha})`;
              // Right-angle "trace" links near the cursor, straight ones elsewhere.
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              if (glow > 0.35) ctx.lineTo(b.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
              if (glow > 0.45 && pulses.length < 26 && Math.random() < 0.006 * dt) {
                pulses.push({ a: i, b: j, t: 0, speed: 0.012 + Math.random() * 0.02 });
              }
            }
          }
        }
      }

      // Links from the cursor to nearby nodes.
      if (mouse.active) {
        for (const n of nodes) {
          if (n.glow < 0.25) continue;
          ctx.strokeStyle = `rgba(77,232,250,${n.glow * 0.28})`;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }

      // Signal pulses travelling along links.
      pulses = pulses.filter((p) => {
        p.t += p.speed * dt;
        if (p.t >= 1) return false;
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) return false;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.fillStyle = `rgba(200,250,255,${Math.sin(p.t * Math.PI)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // Nodes
      for (const n of nodes) {
        const r = n.r + n.glow * 1.8;
        if (n.glow > 0.08) {
          ctx.fillStyle = `rgba(77,232,250,${n.glow * 0.18})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = n.glow > 0.08 ? `rgba(180,245,255,${0.5 + n.glow * 0.5})` : 'rgba(150,180,255,0.45)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    if (reduce) frame(performance.now());

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) frame(performance.now());
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
      mouse.active = mouse.ty > -50 && mouse.ty < r.height + 50;
    };
    const onLeave = () => {
      mouse.active = false;
    };
    if (fine) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
