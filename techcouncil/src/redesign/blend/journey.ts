/**
 * The journey through the building: tiled gateways (pishtaq) the camera flies
 * through between rooms, and star domes overhead. Both are drawn by a golden
 * line: tiles appear in order of distance from where the line starts, each
 * glowing briefly at the line's head, then settling into glazed colour.
 *
 * Geometry is built once per size (Path2D cached); a frame only fills and
 * strokes the tiles in view, so scroll-driven redraws stay cheap.
 */

type Rgb = readonly [number, number, number];
const C = {
  cobalt: [30, 62, 128] as Rgb,
  ink: [14, 26, 54] as Rgb,
  turq: [52, 140, 136] as Rgb,
  bone: [205, 192, 164] as Rgb,
  orange: [214, 132, 52] as Rgb,
  maroon: [150, 40, 58] as Rgb,
};
const GOLD = '#b89458';
const HEAD = '#f3d79a';
const rgb = (c: Rgb, k = 1) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The golden line's head: a soft wide stroke under a thin bright one. */
function head(ctx: CanvasRenderingContext2D, p: Path2D, a: number, k: number) {
  ctx.globalAlpha = a * 0.35;
  ctx.lineWidth = 6 * k;
  ctx.strokeStyle = HEAD;
  ctx.stroke(p);
  ctx.globalAlpha = a;
  ctx.lineWidth = 1.3 * k;
  ctx.stroke(p);
}

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function poly(pts: [number, number][]) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}
function star(cx: number, cy: number, R: number, n = 8, k = 0.41, rot = Math.PI / 8) {
  const a: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? R * k : R;
    const t = rot + (i * Math.PI) / n;
    a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return poly(a);
}
function cross(cx: number, cy: number, s: number) {
  const a = s * 0.17;
  const b = s * 0.5;
  const pts: [number, number][] = [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]];
  return poly(pts.map(([x, y]) => [cx + x, cy + y]));
}

/** A pointed (four-centred) arch, as on Samarkand's iwans. */
function archPath(cx: number, base: number, w: number, h: number) {
  const p = new Path2D();
  p.moveTo(cx - w / 2, base);
  p.lineTo(cx - w / 2, base - h + w * 0.58);
  p.bezierCurveTo(cx - w / 2, base - h + w * 0.12, cx - w * 0.12, base - h + w * 0.06, cx, base - h);
  p.bezierCurveTo(cx + w * 0.12, base - h + w * 0.06, cx + w / 2, base - h + w * 0.12, cx + w / 2, base - h + w * 0.58);
  p.lineTo(cx + w / 2, base);
  p.closePath();
  return p;
}

interface Tile {
  p: Path2D;
  x: number;
  y: number;
  /** Where the line reaches it, 0–1. */
  d: number;
  fill: string;
  r: number;
}

/* ------------------------------------------------------------------ */
/* Gateway                                                              */
/* ------------------------------------------------------------------ */

export interface Gateway {
  W: number;
  H: number;
  cx: number;
  cy: number;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  cell: number;
  outer: Path2D;
  inner: Path2D;
  face: Path2D;
  tiles: Tile[];
  /** Camera scale at which the arch's opening fills the frame. */
  through: number;
  md: number;
  base: number;
  /** The finished tile field at camera scale 1, painted on first use. */
  cache?: { cv: HTMLCanvasElement; res: number };
}

export function layoutGateway(W: number, H: number, seed: number): Gateway {
  const narrow = W < 700;
  const fw = narrow ? W * 1.02 : Math.min(W * 0.62, 900);
  const fh = narrow ? H * 0.86 : Math.min(H * 1.02, fw * 1.07);
  const cx = W / 2;
  const cy = H * (narrow ? 0.54 : 0.56);
  const fx = cx - fw / 2;
  const fy = cy - fh * 0.52;
  const ow = fw * (narrow ? 0.5 : 0.445);
  const oh = fh * 0.64;
  const base = fy + fh;
  const outer = archPath(cx, base, ow, oh);
  const inner = archPath(cx, base, ow - fw * 0.078, oh - fh * 0.04);
  const face = new Path2D();
  face.rect(fx, fy, fw, fh);
  face.addPath(outer);
  const cell = fw / (narrow ? 9.5 : 15.5);
  const rand = rng(seed);
  const md = Math.hypot(fw / 2, fh);
  const tiles: Tile[] = [];
  const probe = document.createElement('canvas').getContext('2d')!;
  for (let y = fy; y <= fy + fh + cell; y += cell)
    for (let x = fx; x <= fx + fw + cell; x += cell)
      for (const [px, py, isStar] of [
        [x, y, true],
        [x + cell / 2, y + cell / 2, false],
      ] as const) {
        // Shapes wholly inside the opening never show.
        if (probe.isPointInPath(archPath(cx, base, ow - cell, oh - cell), px, py)) continue;
        const acc = isStar && rand() < 0.035;
        const base3 = acc ? (rand() < 0.5 ? C.orange : C.maroon) : isStar ? C.cobalt : C.turq;
        tiles.push({
          p: isStar ? star(px, py, cell * 0.47) : cross(px, py, cell * 0.66),
          x: px,
          y: py,
          d: Math.hypot(px - cx, py - base) / md,
          fill: rgb(base3, 0.82 + rand() * 0.3),
          r: cell * 0.5,
        });
      }
  // Scale at which the inner opening covers the frame, from the camera's centre.
  const through = Math.max(W / (ow - fw * 0.078), (H * 1.2) / (oh - fh * 0.04)) * 1.25;
  return { W, H, cx, cy, fx, fy, fw, fh, cell, outer, inner, face, tiles, through, md, base };
}

/** The whole tile field, finished, at camera scale 1. */
function paintField(g: Gateway, res: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(g.W * res);
  cv.height = Math.round(g.H * res);
  const c = cv.getContext('2d')!;
  c.setTransform(res, 0, 0, res, 0, 0);
  c.fillStyle = '#0a0907';
  c.fillRect(g.fx, g.fy, g.fw, g.fh);
  c.lineWidth = g.cell * 0.07;
  c.strokeStyle = rgb(C.bone, 0.9);
  for (const t of g.tiles) {
    c.fillStyle = t.fill;
    c.fill(t.p);
    c.stroke(t.p);
  }
  shade(c, g);
  return cv;
}

/** The glaze sheen and the night light falling across the face. */
function shade(c: CanvasRenderingContext2D, g: Gateway) {
  const sheen = c.createLinearGradient(g.fx, g.fy, g.fx + g.fw, g.fy + g.fh);
  sheen.addColorStop(0.38, 'rgba(255,240,210,0)');
  sheen.addColorStop(0.5, 'rgba(255,240,210,0.07)');
  sheen.addColorStop(0.62, 'rgba(255,240,210,0)');
  c.fillStyle = sheen;
  c.fillRect(g.fx, g.fy, g.fw, g.fh);
  const R = Math.max(g.fw, g.fh) * 0.75;
  const lit = c.createRadialGradient(g.cx, g.fy + g.fh * 0.12, R * 0.05, g.cx, g.cy, R);
  lit.addColorStop(0, 'rgba(0,0,0,0)');
  lit.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  lit.addColorStop(1, 'rgba(0,0,0,0.92)');
  c.fillStyle = lit;
  c.fillRect(g.fx, g.fy, g.fw, g.fh);
}

/** Paints a gateway's cache ahead of time, so its first frame does not stall. */
export function warmGateway(g: Gateway, res: number) {
  if (!g.cache || g.cache.res !== res) g.cache = { cv: paintField(g, res * 2), res };
}

/**
 * One frame of the gateway: the line has drawn `front` (0–1, beyond 1 is
 * settled) and the camera is at scale `s` about the frame's centre. The
 * opening is left transparent, so the room behind the canvas shows through.
 */
export function drawGateway(ctx: CanvasRenderingContext2D, g: Gateway, res: number, front: number, s: number) {
  const { W, H, cx, cy } = g;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  // What the camera can see, in face coordinates, to skip tiles out of frame.
  const vx0 = cx - cx / s;
  const vx1 = cx + (W - cx) / s;
  const vy0 = cy - cy / s;
  const vy1 = cy + (H - cy) / s;

  ctx.save();
  ctx.clip(g.face, 'evenodd');
  warmGateway(g, res);
  const doneR = (front - 1 / 7) * g.md;
  if (doneR >= g.md) {
    // Finished: the baked face, however close the camera is.
    ctx.drawImage(g.cache!.cv, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#0a0907';
    ctx.fillRect(g.fx, g.fy, g.fw, g.fh);
    if (doneR > 0) {
      ctx.save();
      const disk = new Path2D();
      disk.arc(cx, g.base, doneR + g.cell * 0.6, 0, Math.PI * 2);
      ctx.clip(disk);
      ctx.drawImage(g.cache!.cv, 0, 0, W, H);
      ctx.restore();
    }
    // The tiles under the line's head, then the night light over everything not yet baked.
    const lw = g.cell * 0.07;
    for (const t of g.tiles) {
      if (t.x + t.r < vx0 || t.x - t.r > vx1 || t.y + t.r < vy0 || t.y - t.r > vy1) continue;
      const f = clamp01((front - t.d) * 7);
      if (f <= 0 || (f >= 1 && t.d * g.md < doneR - g.cell * 0.4)) continue;
      ctx.globalAlpha = f;
      ctx.fillStyle = t.fill;
      ctx.fill(t.p);
      ctx.lineWidth = lw;
      ctx.strokeStyle = rgb(C.bone, 0.9);
      ctx.stroke(t.p);
      if (f < 1) head(ctx, t.p, 1 - f, 1 / s);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    const rest = new Path2D();
    rest.rect(g.fx, g.fy, g.fw, g.fh);
    if (doneR > 0) rest.arc(cx, g.base, Math.max(0, doneR - g.cell * 0.4), 0, Math.PI * 2);
    ctx.clip(rest, 'evenodd');
    shade(ctx, g);
    ctx.restore();
  }
  ctx.restore();

  // The arch's depth: a plain glazed reveal, lit from above.
  const shown = clamp01(front * 1.4);
  ctx.save();
  const rev = new Path2D();
  rev.addPath(g.outer);
  rev.addPath(g.inner);
  ctx.clip(rev, 'evenodd');
  const half = g.fw * 0.25;
  const rg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  rg.addColorStop(0, rgb(C.turq, 0.3));
  rg.addColorStop(0.5, rgb(C.turq, 0.72));
  rg.addColorStop(1, rgb(C.turq, 0.26));
  ctx.globalAlpha = shown;
  ctx.fillStyle = rg;
  ctx.fillRect(g.fx, g.fy, g.fw, g.fh);
  ctx.restore();

  // Gold only where it counts: the arch rim and the frame.
  ctx.globalAlpha = shown;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5 / Math.sqrt(s);
  ctx.stroke(g.outer);
  ctx.strokeRect(g.fx + g.cell * 0.32, g.fy + g.cell * 0.32, g.fw - g.cell * 0.64, g.fh + g.cell);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Darkness towards the frame's edges, laid only over what is drawn (the opening stays clear).
  const v = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.85 * clamp01(1.6 - s * 0.4)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Dome                                                                 */
/* ------------------------------------------------------------------ */

export interface Dome {
  W: number;
  H: number;
  cx: number;
  cy: number;
  tiles: Tile[];
  rings: { r: number; d: number }[];
  hole: number;
  Rm: number;
  cache?: { cv: HTMLCanvasElement; res: number };
}

/** A star dome seen from below: a sixteen-point rosette ringed by eight-point stars. */
/** Paints a dome's cache ahead of time. */
export function warmDome(g: Dome, res: number) {
  if (!g.cache || g.cache.res !== res) g.cache = { cv: paintDome(g, res), res };
}

export function layoutDome(W: number, H: number, seed: number, scale = 1): Dome {
  const cx = W / 2;
  const cy = H / 2;
  const step = Math.max(W, H) * 0.049 * scale;
  const Rm = Math.hypot(W, H) * 0.55;
  const rand = rng(seed);
  const tiles: Tile[] = [];
  const rings: { r: number; d: number }[] = [];
  for (let k = 0; k * step < Rm + step; k++) {
    const r = k * step;
    const n = k === 0 ? 1 : 12 + k * 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ((k % 2) * Math.PI) / n;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      const sz = k === 0 ? step * 1.7 : Math.min(step * 0.83, ((Math.PI * r) / n) * 1.15) * (1 + k * 0.04);
      const acc = k > 2 && rand() < 0.04;
      const col = acc ? C.orange : k % 3 === 0 ? C.turq : k % 3 === 1 ? C.cobalt : C.ink;
      tiles.push({ p: k === 0 ? star(px, py, sz, 16, 0.62, 0) : star(px, py, sz, 8, 0.42, a + Math.PI / 8), x: px, y: py, d: r / Rm, fill: rgb(col, 0.8 + rand() * 0.3), r: sz });
    }
    if (k > 0) rings.push({ r: r + step / 2, d: r / Rm });
  }
  return { W, H, cx, cy, tiles, rings, hole: Math.min(W, H) * 0.5, Rm };
}

/** The finished dome (tiles and rings), painted once. */
function paintDome(g: Dome, res: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(g.W * res);
  cv.height = Math.round(g.H * res);
  const c = cv.getContext('2d')!;
  c.setTransform(res, 0, 0, res, 0, 0);
  c.lineWidth = 2.2;
  c.strokeStyle = rgb(C.bone, 0.85);
  for (const t of g.tiles) {
    if (t.x + t.r < 0 || t.x - t.r > g.W || t.y + t.r < 0 || t.y - t.r > g.H) continue;
    c.fillStyle = t.fill;
    c.fill(t.p);
    c.stroke(t.p);
  }
  c.strokeStyle = GOLD;
  c.lineWidth = 1;
  c.globalAlpha = 0.8;
  for (const ring of g.rings) {
    c.beginPath();
    c.arc(g.cx, g.cy, ring.r, 0, Math.PI * 2);
    c.stroke();
  }
  return cv;
}

/** One frame of the dome, drawn outward from the centre to `front`; dark at the centre so words read over it. */
export function drawDome(ctx: CanvasRenderingContext2D, g: Dome, res: number, front: number) {
  const { W, H, cx, cy } = g;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const doneR = (front - 1 / 6) * g.Rm;
  if (doneR > 0) {
    if (!g.cache || g.cache.res !== res) g.cache = { cv: paintDome(g, res), res };
    ctx.save();
    const disk = new Path2D();
    disk.arc(cx, cy, doneR, 0, Math.PI * 2);
    ctx.clip(disk);
    ctx.drawImage(g.cache.cv, 0, 0, W, H);
    ctx.restore();
  }
  for (const t of g.tiles) {
    const f = clamp01((front - t.d) * 6);
    if (f <= 0 || (f >= 1 && t.d * g.Rm + t.r < doneR)) continue;
    if (t.x + t.r < 0 || t.x - t.r > W || t.y + t.r < 0 || t.y - t.r > H) continue;
    ctx.globalAlpha = f;
    ctx.fillStyle = t.fill;
    ctx.fill(t.p);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgb(C.bone, 0.85);
    ctx.stroke(t.p);
    if (f < 1) head(ctx, t.p, 1 - f, 1);
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  for (const ring of g.rings) {
    const f = clamp01((front - ring.d) * 6);
    if (f <= 0 || ring.r < doneR) continue;
    ctx.globalAlpha = f * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  let gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.hole);
  gr.addColorStop(0, 'rgba(0,0,0,0.9)');
  gr.addColorStop(0.45, 'rgba(0,0,0,0.6)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  gr = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.hypot(W, H) * 0.55);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
}
