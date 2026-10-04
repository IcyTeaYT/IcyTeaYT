/**
 * Canvas painters for the mosaic world. The mural is painted once per size
 * change; the facade redraws only when the scroll position changes. Nothing
 * here runs on an idle animation loop.
 */

export const TILE = {
  ground: [239, 235, 227],
  orange: [242, 152, 57],
  maroon: [149, 30, 52],
  teal: [7, 104, 110],
  cyan: [8, 151, 182],
  ink: [28, 26, 23],
} as const;
export type Rgb = readonly [number, number, number];
export const GROUT = '#C4BDB0';
export const CONCRETE = '#CFC9BE';
export const CONCRETE_DEEP = '#B4AC9E';
export const CONCRETE_SHADE = '#A39B8C';

/** Small seeded random so the mural is the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Pt = { x: number; y: number };

/* ------------------------------------------------------------------ */
/* Tesserae                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lays tesserae. Each is an irregular quad cut along its row's direction,
 * with its own tone of the glass and, on some, a glint along one edge. An
 * occupancy grid keeps later rows from laying over earlier figures, the way
 * a mosaicist lays the figure first and fills the ground around it.
 */
export class Layer {
  private occ: Uint8Array;
  private cols: number;
  private rows: number;
  constructor(
    private ctx: CanvasRenderingContext2D,
    private w: number,
    private h: number,
    private cell: number,
    private rand: () => number,
  ) {
    this.cols = Math.ceil(w / cell);
    this.rows = Math.ceil(h / cell);
    this.occ = new Uint8Array(this.cols * this.rows);
  }

  private key(x: number, y: number) {
    const cx = Math.floor(x / this.cell);
    const cy = Math.floor(y / this.cell);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return cy * this.cols + cx;
  }

  taken(x: number, y: number) {
    const k = this.key(x, y);
    return k < 0 ? x < -40 || y < -40 || x > this.w + 40 || y > this.h + 40 : this.occ[k] === 1;
  }

  claim(x: number, y: number, r: number) {
    for (let dy = -r; dy <= r; dy += this.cell / 2)
      for (let dx = -r; dx <= r; dx += this.cell / 2) {
        if (dx * dx + dy * dy > r * r) continue;
        const k = this.key(x + dx, y + dy);
        if (k >= 0) this.occ[k] = 1;
      }
  }

  tessera(cx: number, cy: number, len: number, hgt: number, ang: number, c: Rgb, jitter = 0.09, check = true, quiet = false) {
    if (check && this.taken(cx, cy)) return false;
    const r = this.rand;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const hl = len / 2;
    const hh = hgt / 2;
    const ctx = this.ctx;
    ctx.beginPath();
    [
      [-hl, -hh],
      [hl, -hh],
      [hl, hh],
      [-hl, hh],
    ].forEach(([px, py], i) => {
      const jx = px! + (r() - 0.5) * len * jitter * 2;
      const jy = py! + (r() - 0.5) * hgt * jitter * 2;
      const x = cx + jx * ca - jy * sa;
      const y = cy + jx * sa + jy * ca;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    const k = quiet ? 0.97 + r() * 0.05 : 0.88 + r() * 0.2;
    ctx.fillStyle = `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
    ctx.fill();
    if (r() < (quiet ? 0.06 : 0.32)) {
      // Glass catches the light along one cut edge.
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = Math.max(0.6, hgt * 0.09);
      ctx.beginPath();
      ctx.moveTo(cx + (-hl * 0.7) * ca - (-hh * 0.7) * sa, cy + (-hl * 0.7) * sa + (-hh * 0.7) * ca);
      ctx.lineTo(cx + (hl * 0.5) * ca - (-hh * 0.7) * sa, cy + (hl * 0.5) * sa + (-hh * 0.7) * ca);
      ctx.stroke();
    }
    this.claim(cx, cy, Math.min(len, hgt) * 0.45);
    return true;
  }

  /** Tiles along a polyline, oriented to it: one row of andamento. */
  row(pts: Pt[], closed: boolean, tile: number, color: (p: Pt, i: number) => Rgb, check = true, jitter = 0.09, quiet = false) {
    if (pts.length < 2) return;
    const segs = closed ? [...pts, pts[0]!] : pts;
    let carry = 0;
    let i = 0;
    for (let s = 0; s < segs.length - 1; s++) {
      const a = segs[s]!;
      const b = segs[s + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const L = Math.hypot(dx, dy);
      if (!L) continue;
      const ang = Math.atan2(dy, dx);
      let d = carry;
      while (d < L) {
        const len = tile * (0.84 + this.rand() * 0.3);
        const t = (d + len / 2) / L;
        if (t > 1) break;
        const p = { x: a.x + dx * t, y: a.y + dy * t };
        this.tessera(p.x, p.y, len * 0.9, tile * 0.86, ang, color(p, i++), jitter, check, quiet);
        d += len;
      }
      carry = d - L;
    }
  }
}

export const ellipse = (c: Pt, rx: number, ry: number, rot: number, n = 360): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    return { x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) };
  });

/** Outline of a petal (a pointed lens) inset by `inset`, pointing along `ang`. */
export function petal(c: Pt, ang: number, r0: number, r1: number, w: number, inset: number): Pt[] | null {
  const L = r1 - r0 - inset * 2;
  const hw = w - inset;
  if (L < 4 || hw < 2) return null;
  const dir = { x: Math.cos(ang), y: Math.sin(ang) };
  const nrm = { x: -dir.y, y: dir.x };
  const base = { x: c.x + dir.x * (r0 + inset), y: c.y + dir.y * (r0 + inset) };
  const n = 40;
  const side = (sgn: number) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const h = hw * Math.pow(Math.sin(Math.PI * t), 0.72) * (t < 0.5 ? 1 : 1 - (t - 0.5) * 0.4);
      return { x: base.x + dir.x * L * t + nrm.x * h * sgn, y: base.y + dir.y * L * t + nrm.y * h * sgn };
    });
  return [...side(1), ...side(-1).reverse()];
}

export interface Mural {
  /** Flower-atom centre, inscription band and the tile the camera ends in, in mural px. */
  flower: Pt;
  band: { x: number; y: number; w: number; h: number };
  push: Pt;
}

/**
 * The science mural, in the manner of Tashkent's 1970s mosaics: the council's
 * four petals as a flower-atom with orbits and electrons, set in a halo of
 * white smalt laid in rings around it, over an inscription band in straight
 * courses where the mission is set.
 */
export function paintMural(canvas: HTMLCanvasElement, W: number, H: number, tile: number, res: number, layout: { flower: Pt; R: number; bandTop: number; bandH: number }): Mural {
  canvas.width = Math.round(W * res);
  canvas.height = Math.round(H * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, W, H);
  const rand = rng(1966); // Tashkent's modernist rebuild began after the 1966 earthquake
  const L = new Layer(ctx, W, H, tile / 2, rand);
  const { flower: F, R } = layout;
  const t = tile;
  const pick = (cs: Rgb[]) => cs[Math.floor(rand() * cs.length)]!;

  // 1. The nucleus: an ink disc laid in rings, an orange heart.
  const discR = R * 0.3;
  L.tessera(F.x, F.y, t, t, 0, TILE.orange, 0.06, false);
  for (let r = t; r < discR; r += t) L.row(ellipse(F, r, r, 0, Math.max(8, Math.round(r))), true, t, () => TILE.ink);

  // 2. Four petals, each laid in rows that follow its outline inward.
  const petals: [number, Rgb][] = [
    [-Math.PI * 0.75, TILE.orange],
    [-Math.PI * 0.25, TILE.maroon],
    [Math.PI * 0.75, TILE.teal],
    [Math.PI * 0.25, TILE.cyan],
  ];
  for (const [ang, c] of petals) {
    for (let k = 0; ; k++) {
      const outline = petal(F, ang, discR * 0.92, R * 1.08, R * 0.34, (k + 0.5) * t);
      if (!outline) break;
      // The outermost course is a darker outline row, as mosaicists trace a figure.
      const col: Rgb = k === 0 ? [c[0] * 0.72, c[1] * 0.72, c[2] * 0.72] : c;
      L.row(outline, true, t, () => col);
    }
  }

  // 3. Orbits: two courses each, passing behind the flower.
  const orbits: [number, number, number, Rgb][] = [
    [1.55, 0.5, -0.38, TILE.cyan],
    [1.35, 0.42, 0.52, TILE.teal],
    [1.75, 0.62, 0.08, TILE.orange],
  ];
  const electrons: Pt[] = [];
  for (const [rx, ry, rot, c] of orbits) {
    for (const off of [-0.5, 0.5]) L.row(ellipse(F, R * rx + off * t, R * ry + off * t, rot), true, t, () => c);
    const e = ellipse(F, R * rx, R * ry, rot, 8);
    electrons.push(e[1]!, e[5]!);
  }
  // 4. Electrons: small discs on the orbits.
  electrons.forEach((e, i) => {
    const c = i % 2 ? TILE.maroon : TILE.ink;
    L.tessera(e.x, e.y, t, t, 0, c, 0.06);
    for (let r = t; r < t * 2.6; r += t) L.row(ellipse(e, r, r, 0, 18), true, t, () => c);
  });

  // 5. The inscription band: straight courses, an ink border, one orange idea tile.
  const band = { x: 0, y: layout.bandTop, w: W, h: layout.bandH };
  let push: Pt = { x: W / 2, y: band.y + band.h - t / 2 };
  for (let y = band.y + t / 2; y < band.y + band.h; y += t) {
    const border = y < band.y + t || y > band.y + band.h - t;
    const pts = [
      { x: (rand() - 1) * t, y },
      { x: W + t, y },
    ];
    let bestD = Infinity;
    L.row(
      pts,
      false,
      t,
      (p) => {
        if (border && y > band.y + band.h - t) {
          const d = Math.abs(p.x - W / 2);
          if (d < bestD && d < t) {
            bestD = d;
            push = p;
            return TILE.orange;
          }
        }
        return border ? TILE.ink : TILE.ground;
      },
      false,
      0.05,
      !border,
    );
  }

  // 6. The ground: white smalt laid in rings around the flower, a few ideas among it.
  const far = Math.max(Math.hypot(F.x, F.y), Math.hypot(W - F.x, F.y), Math.hypot(F.x, H - F.y), Math.hypot(W - F.x, H - F.y));
  for (let r = discR + t * 0.5; r < far + t; r += t) {
    L.row(ellipse(F, r, r * 0.94, 0, Math.max(24, Math.round(r / 2))), true, t, () => (rand() < 0.012 ? pick([TILE.orange, TILE.maroon, TILE.teal, TILE.cyan]) : TILE.ground));
  }
  return { flower: F, band, push };
}

/** A panel of tesserae in arched courses, for the lattice cells. */
export function paintArchPanel(canvas: HTMLCanvasElement, W: number, H: number, tile: number, res: number, color: Rgb, seed: number) {
  canvas.width = Math.round(W * res);
  canvas.height = Math.round(H * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, W, H);
  const L = new Layer(ctx, W, H, tile / 2, rng(seed));
  const r = W / 2;
  for (let k = 0; k * tile < r; k++) {
    const rr = r - (k + 0.5) * tile;
    const pts: Pt[] = [{ x: W / 2 - rr, y: H + tile }];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI;
      pts.push({ x: W / 2 + Math.cos(a) * rr, y: r + Math.sin(a) * rr });
    }
    pts.push({ x: W / 2 + rr, y: H + tile });
    L.row(pts, false, tile, () => (k % 4 === 3 ? TILE.ground : color));
  }
}

/** A run of tesserae with a gap: where a sent idea lands. */
export function paintStrip(canvas: HTMLCanvasElement, cssW: number, tile: number, res: number, rows: number, gap: { col: number; row: number } | null) {
  const cols = Math.floor(cssW / tile);
  canvas.width = Math.round(cols * tile * res);
  canvas.height = Math.round(rows * tile * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, cols * tile, rows * tile);
  const rand = rng(2026);
  const L = new Layer(ctx, cols * tile, rows * tile, tile / 2, rand);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (gap && x === gap.col && y === gap.row) {
        rand();
        continue;
      }
      const c = rand() < 0.8 ? TILE.ground : [TILE.orange, TILE.maroon, TILE.teal, TILE.cyan][Math.floor(rand() * 4)]!;
      L.tessera(x * tile + tile / 2, y * tile + tile / 2, tile * 0.88, tile * 0.88, (rand() - 0.5) * 0.06, c, 0.06, false);
    }
  return cols;
}

/* ------------------------------------------------------------------ */
/* The facade                                                           */
/* ------------------------------------------------------------------ */

export interface Facade {
  wall: Path2D;
  reveals: Path2D;
  lattice: Path2D;
  target: { x: number; y: number; top: number; left: number; w: number; h: number; path: Path2D };
  latticeWidth: number;
  bandTop: number;
}

/**
 * A full-frame wall of arched openings, each filled with a panjara lattice of
 * diagonal concrete bars, above a solid band that carries the sign.
 */
export function layoutFacade(W: number, H: number, navH: number): Facade {
  const narrow = W < 700;
  const cols = narrow ? 5 : W < 1100 ? 8 : 10;
  const cell = W / cols;
  const ow = cell * 0.7;
  const fin = cell - ow;
  const bandTop = Math.round(narrow ? H * 0.42 : H * 0.64);
  const avail = bandTop - navH - fin;
  const rows = Math.max(1, Math.floor(avail / (ow * 1.75 + fin)));
  const oh = avail / rows - fin;
  const r = ow / 2;

  const wall = new Path2D();
  wall.rect(-W * 4, -H * 4, W * 9, H * 9);
  const reveals = new Path2D();
  const aim = { x: W * (narrow ? 0.5 : 0.62), y: navH + fin + oh / 2 };
  let target: Facade['target'] | null = null;
  let best = Infinity;

  for (let row = 0; row < rows; row++) {
    const top = navH + fin + row * (oh + fin);
    for (let c = 0; c < cols; c++) {
      const x = c * cell + fin / 2;
      const p = new Path2D();
      p.moveTo(x, top + oh);
      p.lineTo(x, top + r);
      p.arc(x + r, top + r, r, Math.PI, 0);
      p.lineTo(x + ow, top + oh);
      p.closePath();
      wall.addPath(p);
      // Shadow on the inner side wall and under the arch.
      const sh = ow * 0.11;
      reveals.rect(x + ow - sh, top + r, sh, oh - r);
      reveals.moveTo(x + ow, top + r);
      reveals.arc(x + r, top + r, r, 0, -Math.PI * 0.62, true);
      reveals.arc(x + r, top + r, r - sh, -Math.PI * 0.62, 0, false);
      reveals.closePath();
      const d = (x + ow / 2 - aim.x) ** 2 + (top + oh / 2 - aim.y) ** 2;
      if (d < best) {
        best = d;
        target = { x: x + ow / 2, y: top + r + (oh - r) / 2, top, left: x, w: ow, h: oh, path: p };
      }
    }
  }

  // The panjara: diagonal bars across the whole screen; the wall hides them
  // everywhere except inside the openings.
  const lattice = new Path2D();
  const g = ow / 3.2;
  for (let k = -H * 2; k < W + H * 2; k += g) {
    lattice.moveTo(k, navH);
    lattice.lineTo(k + (bandTop - navH), bandTop);
    lattice.moveTo(k, bandTop);
    lattice.lineTo(k + (bandTop - navH), navH);
  }
  return { wall, reveals, lattice, target: target!, latticeWidth: ow * 0.075, bandTop };
}

/** Scale at which the target opening, centred, covers the whole screen. */
export function throughScale(W: number, H: number, f: Facade) {
  const rectH = f.target.h - f.target.w / 2;
  return Math.max(W / (f.target.w * 0.96), H / (rectH * 0.96)) * 1.06;
}

export interface FacadeColors {
  wall: string;
  shade: string;
  joint: string;
}
const DAY: FacadeColors = { wall: CONCRETE, shade: CONCRETE_SHADE, joint: CONCRETE_DEEP };

/**
 * Draws the facade for camera scale `s`, the target opening panned `pan` of
 * the way to the screen centre, and its lattice doors `open` of the way apart.
 */
export function drawFacade(ctx: CanvasRenderingContext2D, W: number, H: number, res: number, f: Facade, s: number, pan: number, open: number, colors: FacadeColors = DAY) {
  const T = f.target;
  const px = T.x + (W / 2 - T.x) * pan;
  const py = T.y + (H / 2 - T.y) * pan;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.translate(px, py);
  ctx.scale(s, s);
  ctx.translate(-T.x, -T.y);
  ctx.strokeStyle = colors.wall;
  ctx.lineWidth = f.latticeWidth;

  // Every lattice but the target's.
  ctx.save();
  const notTarget = new Path2D();
  notTarget.rect(-W * 4, -H * 4, W * 9, H * 9);
  notTarget.addPath(T.path);
  ctx.clip(notTarget, 'evenodd');
  ctx.stroke(f.lattice);
  ctx.restore();

  // The target's lattice parts like two doors.
  if (open < 1) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.clip(T.path);
      const half = new Path2D();
      half.rect(side < 0 ? T.left - T.w : T.x, T.top - T.w, T.w * 1.5, T.h + T.w * 2);
      ctx.clip(half);
      ctx.translate(side * open * T.w * 0.56, 0);
      ctx.stroke(f.lattice);
      ctx.restore();
    }
  }

  ctx.fillStyle = colors.wall;
  ctx.fill(f.wall, 'evenodd');
  ctx.fillStyle = colors.shade;
  ctx.fill(f.reveals);
  ctx.fillStyle = colors.joint;
  ctx.fillRect(-W * 4, f.bandTop - 2, W * 9, 2);
}

/** Fine static grain for concrete, generated once (no shipped image). */
export function grainUrl() {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(160, 160);
  const rand = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
