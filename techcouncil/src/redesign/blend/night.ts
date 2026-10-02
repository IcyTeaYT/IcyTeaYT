import { ellipse, Layer, petal, rng, type Pt, type Rgb } from '../mosaic/paint';

/**
 * The night mosaic: the original site's wave lines laid as glass tesserae on
 * black, around the council's flower. Painted once per size.
 */

export const LINES = 46;
const PETAL: Record<'orange' | 'maroon' | 'teal' | 'cyan', Rgb> = {
  orange: [242, 152, 57],
  maroon: [176, 40, 66],
  teal: [12, 128, 134],
  cyan: [16, 170, 204],
};
const GROUT = '#040404';

const fract = (v: number) => v - Math.floor(v);

/** Dave Hoskins' hash12, for the value noise the courses follow. */
function hash12(x: number, y: number) {
  const a = fract(x * 0.1031);
  const b = fract(y * 0.1031);
  const c = a;
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  return fract((a + d + (b + d)) * (c + d));
}
function noise2(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy);
  const b = hash12(ix + 1, iy);
  const c = hash12(ix, iy + 1);
  const d = hash12(ix + 1, iy + 1);
  const lo = a + (b - a) * ux;
  const hi = c + (d - c) * ux;
  return lo + (hi - lo) * uy;
}
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The wave each course follows, in the hero shader's terms: uv units, x scaled by height. */
function wave(xn: number) {
  return (noise2(xn * 1.4 + 0.37, 0.5) - 0.5) * 0.42 + Math.sin(xn * 2.6 + 0.9) * 0.035;
}

export interface Course {
  k: number; // line index; halves are the dark courses between lines
  pts: Pt[];
}

/** Course centre-lines covering W × `bottom` (the frame is H tall): whole k are the lines, k + 0.5 the ground between. */
export function courses(W: number, H: number, bottom = H): Course[] {
  const out: Course[] = [];
  const step = 6;
  const kMin = Math.floor(LINES * (1 - bottom / H)) - 14;
  for (let k = kMin; k <= LINES + 14; k += 0.5) {
    const pts: Pt[] = [];
    for (let x = -24; x <= W + 24; x += step) {
      const uvy = k / LINES - wave(x / H);
      pts.push({ x, y: (1 - uvy) * H });
    }
    if (pts.some((p) => p.y > -30 && p.y < bottom + 30)) out.push({ k, pts });
  }
  return out;
}

/** How bright a line is at a point: brightest top-right, as on the original hero. */
function lineGlow(p: Pt, W: number, H: number, k: number) {
  const mask = smoothstep(0, 1, (p.x / W) * 0.8 + (1 - p.y / H) * 0.7 - 0.2);
  const shimmer = 0.35 + 0.65 * noise2((p.x / H) * 3, (k / LINES) * 6);
  return 0.16 + 0.4 * mask * shimmer;
}

export interface NightMural {
  flower: Pt;
}

/**
 * The same lines, laid in glass: a bright course on every line and a course
 * of black glass between them, around the council's flower-atom in the four
 * petal colours.
 */
export function paintNightMural(
  canvas: HTMLCanvasElement,
  W: number,
  MH: number,
  H: number,
  res: number,
  cs: Course[],
  flower: Pt,
  R: number,
  band?: { top: number; h: number },
): NightMural {
  canvas.width = Math.round(W * res);
  canvas.height = Math.round(MH * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, W, MH);
  const rand = rng(1966);
  const spacing = H / LINES;
  const t = spacing / 2; // one course per half line
  const L = new Layer(ctx, W, MH, t / 2, rand);
  const F = flower;

  // The nucleus: rings of white and navy glass.
  const discR = R * 0.3;
  L.tessera(F.x, F.y, t, t, 0, PETAL.orange, 0.06, false);
  let ring = 0;
  for (let r = t; r < discR; r += t) L.row(ellipse(F, r, r, 0, Math.max(8, Math.round(r))), true, t, () => (ring++ % 3 === 2 ? [235, 235, 235] : [42, 61, 102]));

  // Petals, laid in courses that follow their outlines.
  const petals: [number, Rgb][] = [
    [-Math.PI * 0.75, PETAL.orange],
    [-Math.PI * 0.25, PETAL.maroon],
    [Math.PI * 0.75, PETAL.teal],
    [Math.PI * 0.25, PETAL.cyan],
  ];
  for (const [ang, c] of petals) {
    for (let k = 0; ; k++) {
      const outline = petal(F, ang, discR * 0.92, R * 1.08, R * 0.34, (k + 0.5) * t);
      if (!outline) break;
      const col: Rgb = k === 0 ? [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7] : c;
      L.row(outline, true, t, () => col);
    }
  }
  // One orbit, thin, in white glass.
  L.row(ellipse(F, R * 1.5, R * 0.48, -0.3), true, t, () => [220, 220, 220]);

  if (band) {
    // The inscription band, as on the Mosaic: straight courses of black glass
    // for the mission, bordered in the four petal colours.
    const bt = t * 1.4;
    ctx.fillStyle = '#060606'; // dark grout, so the band reads as one calm field
    ctx.fillRect(0, band.top, W, band.h);
    const border = [PETAL.orange, PETAL.maroon, PETAL.teal, PETAL.cyan];
    for (let y = band.top + bt / 2; y < band.top + band.h; y += bt) {
      const edge = y < band.top + bt || y > band.top + band.h - bt;
      let n = 0;
      L.row(
        [
          { x: (rand() - 1) * bt, y },
          { x: W + bt, y },
        ],
        false,
        bt,
        () => {
          if (!edge) {
            const v = 24 + rand() * 12;
            return [v, v, v + 2];
          }
          return border[Math.floor(n++ / 3) % 4]!;
        },
        false,
        0.05,
        !edge,
      );
    }
  }

  // The wave courses around it all.
  const inBand = (p: Pt) => !!band && p.y > band.top - t * 0.6 && p.y < band.top + band.h + t * 0.6;
  const runs = (pts: Pt[]) => {
    const out: Pt[][] = [[]];
    for (const p of pts) {
      if (inBand(p)) {
        if (out[out.length - 1]!.length) out.push([]);
      } else out[out.length - 1]!.push(p);
    }
    return out;
  };
  for (const c of cs) {
    const line = Number.isInteger(c.k);
    for (const run of runs(c.pts)) L.row(run, false, t, (p) => {
      if (line) {
        // As bright as the line was, so the field reads as the same lines, laid in glass.
        const v = Math.round(18 + 190 * lineGlow(p, W, H, c.k));
        const tint = (rand() - 0.5) * 10;
        return [v + tint, v, v - tint];
      }
      const v = 14 + rand() * 12;
      return rand() < 0.006 ? [PETAL.orange, PETAL.maroon, PETAL.teal, PETAL.cyan][Math.floor(rand() * 4)]! : [v, v, v + 2];
    });
  }
  return { flower: F };
}

/** A few courses of black glass with one gap: where a sent idea lands. */
export function paintNightStrip(canvas: HTMLCanvasElement, cssW: number, tile: number, res: number, rows: number, gap: { col: number; row: number }) {
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
      if (x === gap.col && y === gap.row) continue;
      // Unlit glass: greys, a few pale tiles, and colour only faintly, so the sent idea is the one lit tile.
      const r = rand();
      const v = 18 + rand() * 30;
      const pc = [PETAL.orange, PETAL.maroon, PETAL.teal, PETAL.cyan][Math.floor(rand() * 4)]!;
      const dim: Rgb = [pc[0] * 0.32, pc[1] * 0.32, pc[2] * 0.32];
      const c: Rgb = r < 0.86 ? [v, v, v] : r < 0.93 ? [120 + v, 120 + v, 120 + v] : dim;
      L.tessera(x * tile + tile / 2, y * tile + tile / 2, tile * 0.88, tile * 0.88, (rand() - 0.5) * 0.06, c, 0.06, false);
    }
  return cols;
}

export const CATEGORY_GLASS: Record<string, string> = {
  network: 'rgb(16,170,204)',
  classroom: 'rgb(12,128,134)',
  apps: 'rgb(242,152,57)',
  campus: 'rgb(176,40,66)',
  other: 'rgb(235,235,235)',
};

export type ArchMotif = 'code' | 'launch' | 'talk';

/** The motif each arch carries in white glass at its heart, as strokes for tiles to follow. */
function motifLines(cx: number, cy: number, s: number, motif: ArchMotif): Pt[][] {
  const P = (x: number, y: number) => ({ x: cx + x * s, y: cy + y * s });
  const seg = (pts: Pt[], n = 12) => {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++)
      for (let j = 0; j < n; j++) {
        const t = j / n;
        out.push({ x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t });
      }
    out.push(pts[pts.length - 1]!);
    return out;
  };
  if (motif === 'code')
    return [seg([P(-0.3, -0.32), P(-0.62, 0), P(-0.3, 0.32)]), seg([P(0.3, -0.32), P(0.62, 0), P(0.3, 0.32)]), seg([P(0.12, -0.42), P(-0.12, 0.42)])];
  if (motif === 'launch') return [seg([P(-0.42, 0.4), P(0.38, -0.4)]), seg([P(-0.02, -0.44), P(0.42, -0.44), P(0.42, 0)]), seg([P(-0.62, 0.6), P(0.2, 0.6)])];
  // A speech bubble: rounded box with a tail.
  const w = 0.62;
  const h = 0.38;
  const r = 0.16;
  const pts: Pt[] = [];
  const corner = (x: number, y: number, a0: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      pts.push(P(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
  };
  corner(w - r, -h + r, -Math.PI / 2);
  corner(w - r, h - r, 0);
  pts.push(P(-0.12, h), P(-0.36, h + 0.28), P(-0.3, h));
  corner(-w + r, h - r, Math.PI / 2);
  corner(-w + r, -h + r, Math.PI);
  pts.push(P(w - r, -h));
  return [seg(pts, 4)];
}

/**
 * An arched cell of dark glass laid in rings in one petal colour, with its
 * motif in white glass at the heart. Returns what the laying animation needs.
 */
export function paintNightArch(canvas: HTMLCanvasElement, W: number, H: number, tile: number, res: number, color: Rgb, seed: number, motif: ArchMotif) {
  canvas.width = Math.round(W * res);
  canvas.height = Math.round(H * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, W, H);
  const L = new Layer(ctx, W, H, tile / 2, rng(seed));
  const r = W / 2;
  // The figure first, as a mosaicist lays it; the rings then fill around it.
  for (const line of motifLines(W / 2, r * 1.0, W * 0.34, motif)) L.row(line, false, tile * 0.95, () => [236, 236, 232], false, 0.06);
  const dim: Rgb = [color[0] * 0.35, color[1] * 0.35, color[2] * 0.35];
  let rings = 0;
  for (let k = 0; k * tile < r; k++) {
    rings = k + 1;
    const rr = r - (k + 0.5) * tile;
    const pts: Pt[] = [{ x: W / 2 - rr, y: H + tile }];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI;
      pts.push({ x: W / 2 + Math.cos(a) * rr, y: r + Math.sin(a) * rr });
    }
    pts.push({ x: W / 2 + rr, y: H + tile });
    const base: Rgb = k % 4 === 0 ? color : k % 4 === 2 ? [26, 26, 28] : dim;
    L.row(pts, false, tile, () => (k > 3 ? (k % 2 ? [22, 22, 24] : dim) : base));
  }
  return { r, tile, rings };
}

/**
 * Shows the arch laid up to `t` (0–1): whole rings from the outside in, and
 * the next ring going down tile by tile, up the left leg, over, down the right.
 */
export function drawArchLaid(ctx: CanvasRenderingContext2D, full: HTMLCanvasElement, W: number, H: number, res: number, a: { r: number; tile: number; rings: number }, t: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (t <= 0) return;
  if (t >= 1) {
    ctx.drawImage(full, 0, 0);
    return;
  }
  ctx.setTransform(res, 0, 0, res, 0, 0);
  const cx = W / 2;
  const { r, tile } = a;
  const f = t * a.rings;
  const done = Math.floor(f);
  const rho = Math.max(0, r - done * tile);
  // Whole rings: outside radius rho (arch above the centre line, legs below it).
  const whole = new Path2D();
  whole.rect(0, 0, W, r);
  whole.moveTo(cx - rho, r);
  whole.arc(cx, r, rho, Math.PI, Math.PI * 2);
  whole.closePath();
  const legs = new Path2D();
  legs.rect(0, r, cx - rho, H - r);
  legs.rect(cx + rho, r, W - (cx + rho), H - r);
  ctx.save();
  ctx.clip(whole, 'evenodd');
  ctx.drawImage(full, 0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.clip(legs);
  ctx.drawImage(full, 0, 0, W, H);
  ctx.restore();
  // The ring being laid.
  const rin = Math.max(0, rho - tile);
  const leg = H - r;
  const arcLen = Math.PI * (rho + rin) / 2;
  const sAt = (f - done) * (leg * 2 + arcLen);
  const part = new Path2D();
  part.rect(cx - rho, H - Math.min(sAt, leg), rho - rin, Math.min(sAt, leg));
  if (sAt > leg) {
    const th = Math.min(Math.PI, ((sAt - leg) / arcLen) * Math.PI);
    part.moveTo(cx, r);
    part.arc(cx, r, rho + 1, Math.PI, Math.PI + th);
    part.closePath();
  }
  if (sAt > leg + arcLen) part.rect(cx + rin, r, rho - rin, Math.min(leg, sAt - leg - arcLen));
  ctx.save();
  ctx.clip(part);
  // Keep the wedge to this ring only.
  const ring = new Path2D();
  ring.rect(0, 0, W, H);
  ring.moveTo(cx - rin, r);
  ring.arc(cx, r, rin, Math.PI, Math.PI * 2);
  ring.lineTo(cx + rin, H);
  ring.lineTo(cx - rin, H);
  ring.closePath();
  ctx.clip(ring, 'evenodd');
  ctx.drawImage(full, 0, 0, W, H);
  ctx.restore();
}

export const PETAL_RGB = PETAL;

/** A faint wall of dark glass tiles, as a repeating background for the sections. */
export function wallUrl() {
  const tile = 12;
  const n = 24;
  const c = document.createElement('canvas');
  c.width = c.height = tile * n;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#020202';
  ctx.fillRect(0, 0, c.width, c.height);
  const rand = rng(12);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const r = rand();
      const v = 9 + rand() * 9;
      let col = `rgb(${v | 0},${v | 0},${(v + 1) | 0})`;
      if (r > 0.996) {
        const pc = [PETAL.orange, PETAL.maroon, PETAL.teal, PETAL.cyan][Math.floor(rand() * 4)]!;
        col = `rgb(${(pc[0] * 0.3) | 0},${(pc[1] * 0.3) | 0},${(pc[2] * 0.3) | 0})`;
      }
      ctx.fillStyle = col;
      const j = (rand() - 0.5) * 1.2;
      ctx.fillRect(x * tile + 1 + j, y * tile + 1 - j, tile - 2, tile - 2);
    }
  return c.toDataURL('image/png');
}

/* ------------------------------------------------------------------ */
/* The page's one grammar: tiles on a 12px course, laid in colour       */
/* ------------------------------------------------------------------ */

export const T = 12;

/**
 * A border of glass tiles in one petal colour, for panels set into the wall
 * (used as a CSS border-image: slice T, repeat round). Each edge carries ten
 * tiles of slightly different tone so the repeat never looks stamped.
 */
export function tileBorderUrl(c: Rgb, seed: number) {
  const n = 12;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n * T * 2;
  const ctx = cv.getContext('2d')!;
  ctx.scale(2, 2);
  const rand = rng(seed);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (x > 0 && x < n - 1 && y > 0 && y < n - 1) continue;
      const corner = (x === 0 || x === n - 1) && (y === 0 || y === n - 1);
      const k = corner ? 0.55 : 0.7 + rand() * 0.38;
      const dark = !corner && rand() < 0.18;
      const v: Rgb = dark ? [22, 22, 24] : [c[0] * k, c[1] * k, c[2] * k];
      ctx.fillStyle = `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})`;
      const j = (rand() - 0.5) * 0.8;
      ctx.fillRect(x * T + 1 + j, y * T + 1 - j, T - 2, T - 2);
      if (!dark && rand() < 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x * T + 1.5, y * T + 1.5, T - 3, 1.2);
      }
    }
  return cv.toDataURL('image/png');
}
