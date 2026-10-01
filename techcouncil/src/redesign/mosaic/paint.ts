import { LOGO_PATHS, LOGO_VIEWBOX } from '@/components/brand/logoPaths';

/**
 * Canvas painters for the mosaic world. Everything here draws once per size
 * change (the mural) or once per scroll step (the facade), never on an idle
 * animation loop, so the page costs nothing while it sits still.
 */

export const TILE = {
  ground: [239, 235, 227],
  orange: [242, 152, 57],
  maroon: [149, 30, 52],
  teal: [7, 104, 110],
  cyan: [8, 151, 182],
  ink: [28, 26, 23],
} as const;
type Rgb = readonly [number, number, number];
const PALETTE: Rgb[] = [TILE.ground, TILE.orange, TILE.maroon, TILE.teal, TILE.cyan, TILE.ink];
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

function nearest(r: number, g: number, b: number) {
  let best = 0;
  let bestD = Infinity;
  PALETTE.forEach((p, i) => {
    const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

const [vbX, vbY, vbW, vbH] = LOGO_VIEWBOX.split(' ').map(Number) as [number, number, number, number];
const LOGO_FILL: [keyof typeof LOGO_PATHS, Rgb][] = [
  ['orange', TILE.orange],
  ['red', TILE.maroon],
  ['teal', TILE.teal],
  ['cyan', TILE.cyan],
  ['navy', TILE.ink],
];

/**
 * The science mural: the council's four-petal mark as a great flower at the
 * centre of three tilted orbits, with a scatter of single tiles (the ideas)
 * across the white smalt ground. Drawn on a tiny design canvas, one pixel per
 * tile, then laid as irregular tesserae with grout between them.
 */
export function paintMural(canvas: HTMLCanvasElement, cssW: number, cssH: number, tile: number, res: number, focus = { x: 0.62, y: 0.46 }) {
  const cols = Math.ceil(cssW / tile);
  const rows = Math.ceil(cssH / tile);

  const plan = document.createElement('canvas');
  plan.width = cols;
  plan.height = rows;
  const p = plan.getContext('2d', { willReadFrequently: true })!;
  const rgb = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`;
  p.fillStyle = rgb(TILE.ground);
  p.fillRect(0, 0, cols, rows);

  const cx = cols * focus.x;
  const cy = rows * focus.y;
  const size = Math.min(cols, rows) * 0.62;

  // Orbits, one tile thick.
  p.lineWidth = 1.15;
  ([
    [1.0, 0.36, -0.42, TILE.cyan],
    [0.86, 0.3, 0.5, TILE.teal],
    [1.18, 0.44, 0.08, TILE.orange],
  ] as const).forEach(([rx, ry, rot, c]) => {
    p.strokeStyle = rgb(c);
    p.beginPath();
    p.ellipse(cx, cy, size * rx, size * ry, rot, 0, Math.PI * 2);
    p.stroke();
  });

  // The mark itself.
  p.save();
  p.translate(cx - size * 0.5, cy - size * 0.5);
  p.scale(size / vbW, size / vbH);
  p.translate(-vbX, -vbY);
  for (const [k, c] of LOGO_FILL) {
    p.fillStyle = rgb(c);
    p.fill(new Path2D(LOGO_PATHS[k]));
  }
  p.restore();

  const plan01 = p.getImageData(0, 0, cols, rows).data;
  const rand = rng(1966); // Tashkent's modernist rebuild began after the 1966 earthquake

  canvas.width = Math.round(cssW * res);
  canvas.height = Math.round(cssH * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, cssW, cssH);

  const gap = Math.max(1, tile * 0.11);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      let idx = nearest(plan01[i]!, plan01[i + 1]!, plan01[i + 2]!);
      // Ideas: a few lone coloured tiles in the open ground.
      if (idx === 0 && rand() < 0.012) idx = 1 + Math.floor(rand() * 4);
      const c = PALETTE[idx]!;
      const k = 0.9 + rand() * 0.16; // smalt is never one flat colour
      ctx.fillStyle = `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
      const j = tile * 0.06;
      const w = tile - gap - rand() * j;
      const h = tile - gap - rand() * j;
      ctx.fillRect(x * tile + gap / 2 + (rand() - 0.5) * j, y * tile + gap / 2 + (rand() - 0.5) * j, w, h);
    }
  }
}

/** A one-row strip of tiles with a gap: where a sent idea lands. */
export function paintStrip(canvas: HTMLCanvasElement, cssW: number, tile: number, res: number, gapIndex: number) {
  const cols = Math.floor(cssW / tile);
  canvas.width = Math.round(cols * tile * res);
  canvas.height = Math.round(tile * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = GROUT;
  ctx.fillRect(0, 0, cols * tile, tile);
  const rand = rng(2026);
  const gap = Math.max(1, tile * 0.11);
  for (let x = 0; x < cols; x++) {
    const r = rand();
    if (x === gapIndex) continue;
    const c = r < 0.82 ? TILE.ground : PALETTE[1 + Math.floor(rand() * 4)]!;
    const k = 0.9 + rand() * 0.16;
    ctx.fillStyle = `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
    ctx.fillRect(x * tile + gap / 2, gap / 2, tile - gap, tile - gap);
  }
  return cols;
}

export interface Facade {
  path: Path2D;
  reveals: Path2D;
  /** The opening the camera flies through, in CSS px at rest. */
  target: { x: number; y: number; w: number; h: number };
  bandTop: number;
}

/**
 * The sun-screen: rows of tall arched openings in a concrete wall above a
 * solid band that carries the sign. Laid out for the viewport.
 */
export function layoutFacade(W: number, H: number): Facade {
  const narrow = W < 700;
  const cols = narrow ? 5 : W < 1100 ? 8 : 10;
  const cell = W / cols;
  const ow = cell * 0.7;
  const fin = cell - ow;
  const oh = ow * 1.75;
  const bandTop = narrow ? H * 0.36 : H * 0.5;
  const path = new Path2D();
  const reveals = new Path2D();
  let target = { x: 0, y: 0, w: ow, h: oh };
  let best = Infinity;
  const aim = { x: W * (narrow ? 0.5 : 0.64), y: bandTop - fin - oh * 0.55 };
  for (let top = bandTop - fin - oh; top > -oh - fin; top -= oh + fin) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell + fin / 2;
      const r = ow / 2;
      path.moveTo(x, top + oh);
      path.lineTo(x, top + r);
      path.arc(x + r, top + r, r, Math.PI, 0);
      path.lineTo(x + ow, top + oh);
      path.closePath();
      // The inner side wall catches shadow: a sliver on the right of the opening.
      const t = ow * 0.12;
      reveals.rect(x + ow - t, top + r, t, oh - r);
      reveals.moveTo(x + ow, top + r);
      reveals.arc(x + r, top + r, r, 0, -Math.PI * 0.32, true);
      reveals.arc(x + r, top + r, r - t, -Math.PI * 0.32, 0, false);
      reveals.closePath();
      const d = (x + ow / 2 - aim.x) ** 2 + (top + oh / 2 - aim.y) ** 2;
      if (d < best) {
        best = d;
        target = { x: x + ow / 2, y: top + oh * 0.58, w: ow, h: oh };
      }
    }
  }
  return { path, reveals, target, bandTop };
}

/** Scale at which the target opening swallows the whole screen. */
export function throughScale(W: number, H: number, f: Facade) {
  const needW = (2 * Math.max(f.target.x, W - f.target.x)) / (f.target.w * 0.82);
  const needH = (2 * Math.max(f.target.y, H - f.target.y)) / (f.target.h * 0.7);
  return Math.max(needW, needH) * 1.08;
}

export function drawFacade(ctx: CanvasRenderingContext2D, W: number, H: number, res: number, f: Facade, s: number) {
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const { x, y } = f.target;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-x, -y);
  ctx.fillStyle = CONCRETE;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(f.path);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = CONCRETE_SHADE;
  ctx.fill(f.reveals);
  // The joint between the screen and the sign band.
  ctx.fillStyle = CONCRETE_DEEP;
  ctx.fillRect(-W, f.bandTop - 2, W * 3, 2);
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
