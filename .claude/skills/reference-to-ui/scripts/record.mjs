// Record a page as video: a smooth scroll from top to bottom, or N seconds of it playing.
// Usage: node record.mjs <url|file.html> <outDir> [--scroll] [--seconds 8] [--mobile] [--selector .section]
//   --scroll     scroll the whole page (or just through --selector) over --seconds
//   --mobile     390x844 instead of 1280x720
// Output: <outDir>/scroll.mp4 (or .webm without ffmpeg). Then run video-ref.sh on it.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { launch, toUrl } from './_browser.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [target, outDir = 'recording'] = args.filter((a, i) => !a.startsWith('--') && !['--seconds', '--selector'].includes(args[i - 1]));
if (!target) { console.error('Usage: node record.mjs <url|file.html> <outDir> [--scroll] [--seconds 8] [--mobile] [--selector .x]'); process.exit(1); }
const seconds = Number(flag('--seconds', 8));
const mobile = args.includes('--mobile');
const vp = mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 };
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(outDir, '.video'); fs.rmSync(tmp, { recursive: true, force: true });

const browser = await launch([target]);
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: vp } });
const page = await ctx.newPage();
await page.goto(toUrl(target), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.waitForTimeout(1200);
if (args.includes('--scroll')) {
  const sel = flag('--selector', null);
  const [from, to] = await page.evaluate((sel) => {
    if (sel) { const el = document.querySelector(sel); const top = el.getBoundingClientRect().top + scrollY; return [top, top + el.offsetHeight - innerHeight]; }
    return [0, document.documentElement.scrollHeight - innerHeight];
  }, sel);
  const steps = Math.round(seconds * 30);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out like a person scrolling
    await page.evaluate((y) => window.scrollTo(0, y), from + (to - from) * e);
    await page.waitForTimeout(1000 / 30);
  }
} else {
  await page.waitForTimeout(seconds * 1000);
}
await page.waitForTimeout(800);
await ctx.close(); await browser.close();
const webm = fs.readdirSync(tmp).find((f) => f.endsWith('.webm'));
const name = args.includes('--scroll') ? 'scroll' : 'play';
let out = path.join(outDir, `${name}.webm`);
fs.renameSync(path.join(tmp, webm), out); fs.rmSync(tmp, { recursive: true, force: true });
try {
  const mp4 = path.join(outDir, `${name}.mp4`);
  execSync(`ffmpeg -v error -y -i "${out}" -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart "${mp4}"`);
  fs.rmSync(out); out = mp4;
} catch { /* no ffmpeg: keep webm */ }
console.log(`Saved ${out}`);
