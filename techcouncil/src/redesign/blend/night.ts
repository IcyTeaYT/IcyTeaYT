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
  band: { top: number; h: number },
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

  // The wave courses around it all.
  const inBand = (p: Pt) => p.y > band.top - t * 0.6 && p.y < band.top + band.h + t * 0.6;
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
