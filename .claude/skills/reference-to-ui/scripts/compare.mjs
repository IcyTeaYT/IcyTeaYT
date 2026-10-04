// Compare a build against a reference image: side-by-side, diff heatmap, per-band mismatch.
// Usage: node compare.mjs <reference.png> <url|file.html> <outDir> [--width 1440] [--fold]
import fs from 'fs';
import path from 'path';
import { launch, toUrl, settle } from './_browser.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [refPath, target, outDir = 'compare'] = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--width'));
if (!refPath || !target) { console.error('Usage: node compare.mjs <reference.png> <url|file.html> <outDir> [--width 1440] [--fold]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const browser = await launch([target]);
// Read reference size.
const probe = await browser.newPage();
const refData = 'data:image/png;base64,' + fs.readFileSync(refPath).toString('base64');
const refSize = await probe.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return { w: i.naturalWidth, h: i.naturalHeight }; }, refData);
await probe.close();

const width = Number(flag('--width', refSize.w));
const fold = args.includes('--fold');
const page = await browser.newPage({ viewport: { width, height: fold ? refSize.h : 900 }, deviceScaleFactor: 1 });
await page.goto(toUrl(target), { waitUntil: 'load', timeout: 60000 });
await settle(page);
const buildPath = path.join(outDir, 'build.png');
await page.screenshot({ path: buildPath, fullPage: !fold });
await page.close();

const work = await browser.newPage({ viewport: { width: 800, height: 600 } });
const buildData = 'data:image/png;base64,' + fs.readFileSync(buildPath).toString('base64');
const result = await work.evaluate(async ({ refData, buildData, refW }) => {
  const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const [a, b] = await Promise.all([load(refData), load(buildData)]);
  const scale = b.naturalWidth / a.naturalWidth; // normalise reference to build width (handles retina screenshots)
  const W = b.naturalWidth, Ha = Math.round(a.naturalHeight * scale), H = Math.max(Ha, b.naturalHeight);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ca = mk(W, H), cb = mk(W, H);
  const xa = ca.getContext('2d'), xb = cb.getContext('2d');
  xa.fillStyle = xb.fillStyle = '#ff00ff'; xa.fillRect(0, 0, W, H); xb.fillRect(0, 0, W, H);
  xa.drawImage(a, 0, 0, W, Ha); xb.drawImage(b, 0, 0);
  const da = xa.getImageData(0, 0, W, H).data, db = xb.getImageData(0, 0, W, H).data;
  const cd = mk(W, H), xd = cd.getContext('2d'); xd.drawImage(b, 0, 0); xd.fillStyle = 'rgba(255,255,255,0.75)'; xd.fillRect(0, 0, W, H);
  const out = xd.getImageData(0, 0, W, H);
  const band = 100, bands = [];
  let diffTotal = 0;
  for (let y0 = 0; y0 < H; y0 += band) {
    let d = 0, n = 0;
    for (let y = y0; y < Math.min(H, y0 + band); y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const delta = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      n++;
      if (delta > 24) { d++; out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; out.data[i + 3] = 255; }
    }
    diffTotal += d;
    bands.push({ y: y0, pct: +(100 * d / n).toFixed(1) });
  }
  xd.putImageData(out, 0, 0);
  // Side-by-side with labels.
  const gap = 24, sbs = mk(W * 2 + gap, H + 40), xs = sbs.getContext('2d');
  xs.fillStyle = '#888'; xs.fillRect(0, 0, sbs.width, sbs.height);
  xs.font = 'bold 24px sans-serif'; xs.fillStyle = '#fff';
  xs.fillText('REFERENCE', 10, 28); xs.fillText('BUILD', W + gap + 10, 28);
  xs.drawImage(ca, 0, 40); xs.drawImage(cb, W + gap, 40);
  return {
    sbs: sbs.toDataURL('image/png'), diff: cd.toDataURL('image/png'),
    refHeight: Ha, buildHeight: b.naturalHeight, scale: +scale.toFixed(3),
    mismatchPct: +(100 * diffTotal / (W * H)).toFixed(2), bands,
  };
}, { refData, buildData, refW: refSize.w });
await browser.close();

const save = (name, url) => fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
save('side-by-side.png', result.sbs); save('diff.png', result.diff);
const worst = [...result.bands].sort((x, y) => y.pct - x.pct).slice(0, 5);
const summary = { mismatchPct: result.mismatchPct, refHeight: result.refHeight, buildHeight: result.buildHeight, heightDelta: result.buildHeight - result.refHeight, refScale: result.scale, worstBands: worst };
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ ...summary, bands: result.bands }, null, 2));
console.log(`Mismatch ${result.mismatchPct}% | height ref ${result.refHeight}px vs build ${result.buildHeight}px (${summary.heightDelta >= 0 ? '+' : ''}${summary.heightDelta})`);
console.log('Worst bands (y px: % differing):', worst.map(b => `${b.y}: ${b.pct}%`).join(', '));
console.log(`Saved ${outDir}/side-by-side.png, diff.png (red = differs), build.png, summary.json`);
