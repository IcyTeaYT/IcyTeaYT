import { rng, type Rgb } from '../mosaic/paint';

/**
 * The mission, spelled in tiles: a wall of dark glass tiles, and the tiles
 * that fall inside the letters light up one after another. The letters are
 * rasterised once per size; per scroll frame only the lit tiles are drawn.
 */

const PETALS: Rgb[] = [
  [242, 152, 57],
  [176, 40, 66],
  [12, 128, 134],
  [16, 170, 204],
];

export interface LitTile {
  x: number;
  y: number;
  /** When it lights, 0–1 across the reveal. */
  t: number;
  flash: Rgb;
  v: number;
}

export interface TileText {
  ts: number;
  tiles: LitTile[];
  /** CSS px: where the lettering ends, for the line under it. */
  left: number;
  bottom: number;
}

/** Lays out `text` in heavy Inter over the frame and finds the tiles inside the letters. */
export function layoutTileText(W: number, H: number, text: string, pad: number): TileText {
  const narrow = W < 700;
  const fs = narrow ? Math.min(W * 0.12, 56) : Math.min(W * 0.075, 112);
  const ts = Math.max(4, Math.round(fs / (narrow ? 9 : 11)));
  const maxW = Math.min(W - pad * 2, fs * 9.5);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.font = `650 ${fs}px "Inter Variable", Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  // Wrap.
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  const lh = fs * 1.02;
  const support = narrow ? 190 : 150; // room for the line underneath
  const blockH = lines.length * lh;
  // Snap the block to the tile grid so letters sit on whole tiles.
  const top = Math.round((H - blockH - support) / 2 / ts) * ts;
  const left = Math.round(pad / ts) * ts;
  ctx.fillStyle = '#fff';
  lines.forEach((l, i) => ctx.fillText(l, left, top + (i + 0.8) * lh));
  const data = ctx.getImageData(0, 0, W, H).data;
  const rand = rng(46);
  const tiles: LitTile[] = [];
  const cover = (x0: number, y0: number) => {
    let a = 0;
    for (let dy = 0.25; dy < 1; dy += 0.5)
      for (let dx = 0.25; dx < 1; dx += 0.5) {
        const x = Math.min(W - 1, Math.floor(x0 + dx * ts));
        const y = Math.min(H - 1, Math.floor(y0 + dy * ts));
        a += data[(y * W + x) * 4 + 3]!;
      }
    return a / (4 * 255);
  };
  let maxX = 1;
  for (let y = 0; y < H; y += ts)
    for (let x = 0; x < W; x += ts) {
      if (cover(x, y) < 0.45) continue;
      maxX = Math.max(maxX, x);
      tiles.push({ x, y, t: 0, flash: PETALS[Math.floor(rand() * 4)]!, v: 226 + rand() * 26 });
    }
  // Light left to right, a little ragged, like a display switching on.
  for (const tl of tiles) tl.t = Math.min(1, ((tl.x - left) / Math.max(1, maxX - left)) * 0.82 + rand() * 0.18);
  return { ts, tiles, left, bottom: top + blockH + ts };
}

/** The unlit wall: every tile dark glass. Painted once per size. */
export function paintWall(canvas: HTMLCanvasElement, W: number, H: number, ts: number, res: number) {
  canvas.width = Math.round(W * res);
  canvas.height = Math.round(H * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);
  const rand = rng(7);
  const g = Math.max(1, ts * 0.14);
  for (let y = 0; y < H; y += ts)
    for (let x = 0; x < W; x += ts) {
      const v = 13 + rand() * 13;
      ctx.fillStyle = `rgb(${v | 0},${v | 0},${(v + 2) | 0})`;
      ctx.fillRect(x + g / 2, y + g / 2, ts - g, ts - g);
    }
}

/** The lit letters at reveal progress `k` (0–1). Each tile flashes a petal colour, then settles to white glass. */
export function drawLit(canvas: HTMLCanvasElement, W: number, H: number, res: number, tt: TileText, k: number) {
  if (canvas.width !== Math.round(W * res)) {
    canvas.width = Math.round(W * res);
    canvas.height = Math.round(H * res);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const { ts } = tt;
  const g = Math.max(1, ts * 0.14);
  for (const tl of tt.tiles) {
    if (tl.t > k) continue;
    const age = Math.min(1, (k - tl.t) / 0.06);
    const r = tl.flash[0] + (tl.v - tl.flash[0]) * age;
    const gg = tl.flash[1] + (tl.v - tl.flash[1]) * age;
    const b = tl.flash[2] + (tl.v - 4 - tl.flash[2]) * age;
    ctx.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
    ctx.fillRect(tl.x + g / 2, tl.y + g / 2, ts - g, ts - g);
  }
}
