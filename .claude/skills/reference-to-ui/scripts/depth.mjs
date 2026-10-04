// Make a depth map for a still image (white = near, black = far), for the 3D-photo camera moves
// in assets/cinematic/. Runs the free Depth Anything V2 model inside headless Chromium via
// transformers.js: no Python, no API key. First run downloads the model (about 100 MB, cached after).
//
//   node depth.mjs <image> [out.png] [--quality fast|high] [--dilate 3] [--blur 1.5]
//
//   --quality  high = full model (default, about 100 MB once, sharpest edges), fast = 8-bit model (about 25 MB)
//   --dilate   grow near objects by N px so camera moves stretch the background, not the subject (default 3)
//   --blur     soften the map in px to avoid jagged parallax (default 1.5)
import fs from 'fs';
import path from 'path';
import http from 'http';
import { launch } from './_browser.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const [input, outArg] = pos;
if (!input || !fs.existsSync(input)) { console.error('Usage: node depth.mjs <image> [out.png] [--quality fast|high] [--dilate 3] [--blur 1.5]'); process.exit(1); }
const out = outArg || input.replace(/\.[a-z0-9]+$/i, '') + '.depth.png';
const quality = flag('--quality', 'high');
const dilate = Number(flag('--dilate', 3));
const blur = Number(flag('--blur', 1.5));

const page = `<!doctype html><meta charset="utf-8"><body><script type="module">
import { pipeline, env, RawImage } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
env.allowLocalModels = false;
try {
  const est = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: ${JSON.stringify(quality === 'high' ? 'fp32' : 'q8')}, device: 'wasm' });
  const img = await RawImage.fromURL('/input');
  const { depth } = await est(img);
  // depth: single-channel RawImage, bright = near. Resize to the source size, normalise, dilate, blur.
  const src = depth.toCanvas();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  let d = g.getImageData(0, 0, c.width, c.height);
  let lo = 255, hi = 0;
  for (let i = 0; i < d.data.length; i += 4) { const v = d.data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const k = 255 / Math.max(1, hi - lo);
  for (let i = 0; i < d.data.length; i += 4) { const v = (d.data[i] - lo) * k; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  // Max filter (dilate near regions): keep the brightest of shifted copies.
  const dil = ${dilate};
  if (dil > 0) {
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const tg = t.getContext('2d');
    tg.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'lighten';
    for (let r = 1; r <= dil; r++) for (const [dx, dy] of [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,-r],[r,-r],[-r,r]]) g.drawImage(t, dx, dy);
    g.globalCompositeOperation = 'source-over';
  }
  const b = ${blur};
  if (b > 0) { const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const tg = t.getContext('2d'); tg.filter = 'blur(' + b + 'px)'; tg.drawImage(c, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(t, 0, 0); }
  window.__result = c.toDataURL('image/png');
} catch (e) { window.__error = String(e && e.stack || e); }
</script>`;

const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page); }
  if (req.url === '/input') { res.writeHead(200, { 'content-type': mime[path.extname(input).toLowerCase()] || 'application/octet-stream' }); return res.end(fs.readFileSync(input)); }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

// Local page: launch without a proxy (Chromium cannot reach 127.0.0.1 through one); the CDN and model load directly.
const browser = await launch([url]);
const pg = await browser.newPage();
pg.on('pageerror', (e) => console.error('page error:', e.message));
const t0 = Date.now();
console.log(`Estimating depth (${quality === 'high' ? 'full' : '8-bit'} model; first run downloads it)...`);
await pg.goto(url);
await pg.waitForFunction(() => window.__result || window.__error, null, { timeout: 600000, polling: 500 });
const err = await pg.evaluate(() => window.__error);
const data = await pg.evaluate(() => window.__result);
await browser.close(); server.close();
if (err) { console.error('Depth failed:', err); process.exit(1); }
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(`Saved ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s (white = near, black = far).`);
