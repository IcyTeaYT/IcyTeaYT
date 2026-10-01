#!/usr/bin/env node
// record_site.mjs — smooth, frame-perfect scroll recording of a website for showcase reels / app demos.
// Captures each frame deterministically (no dropped frames), then encodes with ffmpeg.
//
//   npm i -D playwright && npx playwright install chromium     (once; or CHROME_PATH=/path/to/chrome)
//   node record_site.mjs https://lenis.dev public/clips/lenis.mp4 [--seconds=6] [--fps=30] [--width=1440] [--height=900]
//        [--hold=0.8] [--distance=2400] [--wait=2500] [--scale=1]
//
// --hold      seconds to stay on the first screen (let the hero animate)
// --distance  pixels to scroll (default: up to 3 screens or the page end)
// --wait      ms to wait after load before recording (fonts, intro animations, WebGL)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const requireFromCwd = createRequire(resolve(process.cwd(), 'noop.js'));
let chromium;
try { ({ chromium } = requireFromCwd('playwright')); } catch {
  try { ({ chromium } = requireFromCwd('playwright-core')); } catch { console.error('Run: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
}

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const opt = (k, d) => Number(args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const [target, out = 'recording.mp4'] = pos;
if (!target) { console.error('usage: node record_site.mjs <url|file> <out.mp4> [--seconds=6] [--fps=30]'); process.exit(2); }
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const fps = opt('fps', 30), seconds = opt('seconds', 6), hold = opt('hold', 0.8);
const width = opt('width', 1440), height = opt('height', 900), scale = opt('scale', 1);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => console.error('load warning:', e.message));
await page.waitForTimeout(opt('wait', 2500));
const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const distance = Math.min(maxScroll, opt('distance', height * 3));
const dir = mkdtempSync(join(tmpdir(), 'rec-'));
const total = Math.round(seconds * fps), holdFrames = Math.round(hold * fps);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
for (let i = 0; i < total; i++) {
  const t = Math.max(0, (i - holdFrames) / Math.max(1, total - holdFrames - 1));
  const y = Math.round(ease(Math.min(1, t)) * distance);
  await page.evaluate((y) => { if (window.lenis?.scrollTo) window.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, y);
  await page.waitForTimeout(1000 / fps);
  await page.screenshot({ path: join(dir, `f_${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await browser.close();
let ffmpeg = ['ffmpeg'];
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ffmpeg = [process.platform === 'win32' ? 'npx.cmd' : 'npx', '--no-install', 'remotion', 'ffmpeg']; }
execFileSync(ffmpeg[0], [...ffmpeg.slice(1), '-y', '-v', 'error', '-framerate', String(fps), '-i', join(dir, 'f_%05d.jpg'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', resolve(out)], { stdio: 'inherit' });
rmSync(dir, { recursive: true, force: true });
console.log(`✓ ${out}  ${width}x${height} ${seconds}s @${fps}fps, scrolled ${distance}px`);
