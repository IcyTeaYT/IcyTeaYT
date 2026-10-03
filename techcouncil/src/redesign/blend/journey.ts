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
/**
 * How quickly a tile fades in once the line reaches it (it takes 1/FADE of
 * the drawing). Every tile still fading is drawn individually each frame, so a
 * short fade keeps that band, and the frame's cost, small.
 */
const FADE = 14;

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
  const doneR = (front - 1 / FADE) * g.md;
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
      const f = clamp01((front - t.d) * FADE);
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
  /** How far from the centre the dome must reach to cover what is seen. */
  reach: number;
  cache?: { cv: HTMLCanvasElement; res: number };
}

/** A star dome seen from below: a sixteen-point rosette ringed by eight-point stars. */
/** Paints a dome's cache ahead of time. */
export function warmDome(g: Dome, res: number) {
  if (!g.cache || g.cache.res !== res) g.cache = { cv: paintDome(g, res), res };
}

export function layoutDome(W: number, H: number, seed: number, scale = 1, reach = Math.hypot(W, H) / 2): Dome {
  const cx = W / 2;
  const cy = H / 2;
  const step = Math.max(W, H) * 0.049 * scale;
  const Rm = reach * 1.1;
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
  return { W, H, cx, cy, tiles, rings, hole: Math.min(W, H) * 0.5, Rm, reach };
}

/** The finished dome (tiles and rings), painted once. */
function paintDome(g: Dome, res: number) {
  // A square as wide as the seen frame's diagonal, so the dome covers it at any turn.
  const D = Math.ceil(g.reach * 2);
  const cv = document.createElement('canvas');
  cv.width = Math.round(D * res);
  cv.height = Math.round(D * res);
  const c = cv.getContext('2d')!;
  c.setTransform(res, 0, 0, res, 0, 0);
  c.translate(D / 2 - g.cx, D / 2 - g.cy);
  c.lineWidth = 2.2;
  c.strokeStyle = rgb(C.bone, 0.85);
  for (const t of g.tiles) {
    if (Math.hypot(t.x - g.cx, t.y - g.cy) - t.r > D / 2) continue;
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
export function drawDome(ctx: CanvasRenderingContext2D, g: Dome, res: number, front: number, rot = 0) {
  const { W, H, cx, cy } = g;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // The dome turns slowly about its centre.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.translate(-cx, -cy);
  const doneR = (front - 1 / FADE) * g.Rm;
  if (doneR > 0) {
    if (!g.cache || g.cache.res !== res) g.cache = { cv: paintDome(g, res), res };
    ctx.save();
    const disk = new Path2D();
    disk.arc(cx, cy, doneR, 0, Math.PI * 2);
    ctx.clip(disk);
    const D = Math.ceil(g.reach * 2);
    ctx.drawImage(g.cache.cv, cx - D / 2, cy - D / 2, D, D);
    ctx.restore();
  }
  for (const t of g.tiles) {
    const f = clamp01((front - t.d) * FADE);
    if (f <= 0 || (f >= 1 && t.d * g.Rm + t.r < doneR)) continue;
    if (Math.hypot(t.x - cx, t.y - cy) - t.r > g.reach) continue;
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
    const f = clamp01((front - ring.d) * FADE);
    if (f <= 0 || ring.r < doneR) continue;
    ctx.globalAlpha = f * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
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

/* ------------------------------------------------------------------ */
/* Star medallion: a wall of girih with one great star that opens       */
/* ------------------------------------------------------------------ */

export interface Medallion {
  W: number;
  H: number;
  cx: number;
  cy: number;
  R: number;
  md: number;
  cell: number;
  tiles: Tile[];
  /** Iris scale at which the star's opening covers the frame. */
  open: number;
  cache?: { cv: HTMLCanvasElement; res: number };
}

export function layoutMedallion(W: number, H: number, seed: number): Medallion {
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.36;
  const cell = Math.min(W, H) / (W < 700 ? 7.5 : 9);
  const rand = rng(seed);
  const tiles: Tile[] = [];
  const md = Math.hypot(W, H) / 2;
  const ox = cx - Math.ceil(cx / cell) * cell;
  const oy = cy - Math.ceil(cy / cell) * cell;
  for (let y = oy; y <= H + cell; y += cell)
    for (let x = ox; x <= W + cell; x += cell)
      for (const [px, py, isStar] of [
        [x, y, true],
        [x + cell / 2, y + cell / 2, false],
      ] as const) {
        const acc = isStar && rand() < 0.035;
        const c = acc ? (rand() < 0.5 ? C.orange : C.maroon) : isStar ? C.cobalt : C.turq;
        tiles.push({ p: isStar ? star(px, py, cell * 0.47) : cross(px, py, cell * 0.66), x: px, y: py, d: Math.hypot(px - cx, py - cy) / md, fill: rgb(c, 0.82 + rand() * 0.3), r: cell * 0.5 });
      }
  return { W, H, cx, cy, R, md, cell, tiles, open: (Math.hypot(W, H) / 2 / (R * 0.41)) * 1.15 };
}

function paintMedallion(g: Medallion, res: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(g.W * res);
  cv.height = Math.round(g.H * res);
  const c = cv.getContext('2d')!;
  c.setTransform(res, 0, 0, res, 0, 0);
  c.fillStyle = '#0a0907';
  c.fillRect(0, 0, g.W, g.H);
  c.lineWidth = g.cell * 0.07;
  c.strokeStyle = rgb(C.bone, 0.9);
  for (const t of g.tiles) {
    c.fillStyle = t.fill;
    c.fill(t.p);
    c.stroke(t.p);
  }
  // The great star sits proud of the wall: deep cobalt, ringed in gold.
  const big = star(g.cx, g.cy, g.R, 8, 0.41);
  c.fillStyle = rgb(C.ink, 1);
  c.fill(big);
  c.strokeStyle = GOLD;
  c.lineWidth = 2;
  c.stroke(big);
  c.stroke(star(g.cx, g.cy, g.R * 0.86, 8, 0.41));
  const lit = c.createRadialGradient(g.cx, g.cy * 0.4, 10, g.cx, g.cy, Math.hypot(g.W, g.H) * 0.62);
  lit.addColorStop(0, 'rgba(0,0,0,0)');
  lit.addColorStop(0.55, 'rgba(0,0,0,0.4)');
  lit.addColorStop(1, 'rgba(0,0,0,0.94)');
  c.fillStyle = lit;
  c.fillRect(0, 0, g.W, g.H);
  return cv;
}

export function warmMedallion(g: Medallion, res: number) {
  if (!g.cache || g.cache.res !== res) g.cache = { cv: paintMedallion(g, res), res };
}

/**
 * The wall is drawn outward from the medallion to `front`; then the great
 * star opens like an iris (`iris` 0–1), turning an eighth as it goes, and
 * the room shows through.
 */
export function drawMedallion(ctx: CanvasRenderingContext2D, g: Medallion, res: number, front: number, iris: number) {
  const { W, H, cx, cy } = g;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, W, H);
  warmMedallion(g, res);
  ctx.save();
  const turn = iris * (Math.PI / 8);
  ctx.translate(cx, cy);
  ctx.rotate(turn);
  ctx.scale(1 + iris * 0.35, 1 + iris * 0.35);
  ctx.translate(-cx, -cy);
  if (iris > 0) {
    const k = Math.pow(g.open, iris) - 1 + 0.001;
    const hole = new Path2D();
    hole.rect(-W, -H, W * 3, H * 3);
    hole.addPath(star(cx, cy, g.R * 0.86 * k, 8, 0.41));
    ctx.clip(hole, 'evenodd');
  }
  const doneR = (front - 1 / FADE) * g.md;
  if (doneR >= g.md) ctx.drawImage(g.cache!.cv, 0, 0, W, H);
  else {
    ctx.fillStyle = '#0a0907';
    ctx.fillRect(-W, -H, W * 3, H * 3);
    if (doneR > 0) {
      ctx.save();
      const disk = new Path2D();
      disk.arc(cx, cy, doneR, 0, Math.PI * 2);
      ctx.clip(disk);
      ctx.drawImage(g.cache!.cv, 0, 0, W, H);
      ctx.restore();
    }
    const lw = g.cell * 0.07;
    for (const t of g.tiles) {
      const f = clamp01((front - t.d) * FADE);
      if (f <= 0 || (f >= 1 && t.d * g.md < doneR - g.cell * 0.4)) continue;
      ctx.globalAlpha = f;
      ctx.fillStyle = t.fill;
      ctx.fill(t.p);
      ctx.lineWidth = lw;
      ctx.strokeStyle = rgb(C.bone, 0.9);
      ctx.stroke(t.p);
      if (f < 1) head(ctx, t.p, 1 - f, 1);
    }
    ctx.globalAlpha = 1;
    // The great star is the line's first figure.
    const sf = clamp01(front * 4);
    const big = star(cx, cy, g.R, 8, 0.41);
    ctx.globalAlpha = sf;
    ctx.fillStyle = rgb(C.ink, 1);
    ctx.fill(big);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke(big);
    ctx.globalAlpha = 1;
  }
  // The rim of the opening, in gold.
  if (iris > 0) {
    const k = Math.pow(g.open, iris) - 1 + 0.001;
    ctx.strokeStyle = HEAD;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = clamp01(1.5 - iris * 1.4);
    ctx.stroke(star(cx, cy, g.R * 0.86 * k, 8, 0.41));
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Carved doors, as in Khiva: walnut panels with star carving            */
/* ------------------------------------------------------------------ */

export interface Doors {
  W: number;
  H: number;
  shapes: { p: Path2D; d: number }[];
  frame: Path2D;
}

/** One leaf of a carved door (`side` -1 left, 1 right), drawn in its own canvas of W×H. */
export function layoutDoor(W: number, H: number, side: -1 | 1): Doors {
  const cell = Math.min(W * 0.42, H / 7.2);
  const pad = cell * 0.55;
  const shapes: { p: Path2D; d: number }[] = [];
  const seamX = side < 0 ? W : 0;
  const md = Math.hypot(W, H / 2);
  const cols = Math.max(1, Math.floor((W - pad * 2) / cell));
  const rows = Math.max(1, Math.floor((H - pad * 2) / cell));
  const ox = (W - cols * cell) / 2 + cell / 2;
  const oy = (H - rows * cell) / 2 + cell / 2;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = ox + i * cell;
      const y = oy + j * cell;
      const d = Math.hypot(x - seamX, y - H / 2) / md;
      shapes.push({ p: star(x, y, cell * 0.44), d });
      shapes.push({ p: star(x, y, cell * 0.22, 8, 0.5, 0), d: d + 0.02 });
    }
  const frame = new Path2D();
  frame.rect(pad * 0.45, pad * 0.45, W - pad * 0.9, H - pad * 0.9);
  frame.rect(pad * 0.75, pad * 0.75, W - pad * 1.5, H - pad * 1.5);
  return { W, H, shapes, frame };
}

export function drawDoor(ctx: CanvasRenderingContext2D, g: Doors, res: number, front: number, side: -1 | 1) {
  const { W, H } = g;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  const wood = ctx.createLinearGradient(0, 0, W, H);
  wood.addColorStop(0, '#2b1b10');
  wood.addColorStop(0.5, '#3a2516');
  wood.addColorStop(1, '#21150c');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, W, H);
  // Grain: fine vertical streaks.
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#140c06';
  for (let x = 3; x < W; x += 7) {
    ctx.lineWidth = (x * 13) % 3 === 0 ? 1.4 : 0.6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 6, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Carving: a recess shadow under a gilded edge, cut as the line passes.
  for (const s of g.shapes) {
    const f = clamp01((front - s.d) * 6);
    if (f <= 0) continue;
    ctx.globalAlpha = f;
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke(s.p);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = GOLD;
    ctx.stroke(s.p);
    if (f < 1) head(ctx, s.p, 1 - f, 1);
  }
  ctx.globalAlpha = clamp01(front * 2);
  ctx.strokeStyle = 'rgba(184,148,88,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke(g.frame);
  ctx.globalAlpha = 1;
  // Light falls from the seam, where the doors will open.
  const l = ctx.createLinearGradient(side < 0 ? W : 0, 0, side < 0 ? 0 : W, 0);
  l.addColorStop(0, 'rgba(0,0,0,0)');
  l.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, W, H);
}

/** Cuts the gateway's opening (at camera scale `s`) out of whatever is drawn in `ctx`. */
export function cutOpening(ctx: CanvasRenderingContext2D, g: Gateway, res: number, s: number) {
  ctx.save();
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.translate(g.cx, g.cy);
  ctx.scale(s, s);
  ctx.translate(-g.cx, -g.cy);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(g.inner);
  ctx.restore();
}

/**
 * The medallion assembling itself: tiles drop in from above, nearest the
 * heart first, each settling with a small bounce and a flash of glaze as it
 * lands. `t` runs 0 → 1 over the assembly; once done the frame is the
 * finished medallion, ready for drawMedallion to open.
 */
export function drawCascade(ctx: CanvasRenderingContext2D, g: Medallion, res: number, t: number) {
  const { W, H, cx, cy } = g;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, W, H);
  warmMedallion(g, res);
  if (t >= 1) {
    ctx.drawImage(g.cache!.cv, 0, 0, W, H);
    return;
  }
  ctx.fillStyle = '#050403';
  ctx.fillRect(0, 0, W, H);
  // The great star lands first.
  const sf = clamp01(t * 6);
  const bigY = (1 - (1 - Math.pow(1 - sf, 3))) * -H * 0.5;
  const lw = g.cell * 0.07;
  for (const tl of g.tiles) {
    const start = 0.12 + tl.d * 0.72;
    const f = clamp01((t - start) / 0.16);
    if (f <= 0) continue;
    // Fall with gravity, a small bounce on landing.
    const fall = f < 0.8 ? 1 - Math.pow(f / 0.8, 2) : 0;
    const bounce = f >= 0.8 ? Math.sin(((f - 0.8) / 0.2) * Math.PI) * 0.04 : 0;
    const dy = -(fall + bounce) * (H * 0.55 + tl.y * 0.2);
    const spin = fall * (tl.x % 2 ? 0.6 : -0.6);
    ctx.save();
    ctx.translate(tl.x, tl.y + dy);
    ctx.rotate(spin);
    ctx.translate(-tl.x, -tl.y);
    ctx.globalAlpha = Math.min(1, f * 2);
    ctx.fillStyle = tl.fill;
    ctx.fill(tl.p);
    ctx.lineWidth = lw;
    ctx.strokeStyle = rgb(C.bone, 0.9);
    ctx.stroke(tl.p);
    if (f > 0.75 && f < 1) head(ctx, tl.p, (1 - f) * 4, 1);
    ctx.restore();
  }
  ctx.globalAlpha = sf;
  ctx.save();
  ctx.translate(0, bigY);
  const big = star(cx, cy, g.R, 8, 0.41);
  ctx.fillStyle = rgb(C.ink, 1);
  ctx.fill(big);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke(big);
  ctx.restore();
  ctx.globalAlpha = 1;
  const lit = ctx.createRadialGradient(cx, cy * 0.4, 10, cx, cy, Math.hypot(W, H) * 0.62);
  lit.addColorStop(0, 'rgba(0,0,0,0)');
  lit.addColorStop(0.55, 'rgba(0,0,0,0.4)');
  lit.addColorStop(1, 'rgba(0,0,0,0.94)');
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, W, H);
}
