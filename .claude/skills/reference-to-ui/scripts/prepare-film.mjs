#!/usr/bin/env node
// Prepare stills for the cinematic engine at the highest quality, in one command.
// For each image: a full-resolution desktop WebP, a sharp 9:16 phone version (the one you made,
// or a crop around the focus point), high-quality depth maps for both, a resolution report, and the
// ready-to-paste "shots" config for cinema.js.
//
//   node prepare-film.mjs <out-dir> shot1.png [shot2.png ...] [--phone shot1-9x16.png,shot2-9x16.png] [--focus 0.55,0.5;0.47,0.45]
//
//   --phone  phone (9:16) versions in the same order; use "-" to auto-crop that shot
//   --focus  per shot "x,y" (0..1, image space), separated by ";"; default 0.5,0.5
//   --fast   8-bit depth model (smaller download, slightly softer edges)
// Needs ffmpeg and the skill's Playwright setup (scripts/doctor.sh).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--phone', '--focus'].includes(argv[i - 1]));
const [outDir, ...inputs] = positional;
if (!outDir || !inputs.length) {
  console.error('Usage: node prepare-film.mjs <out-dir> shot1.png [shot2.png ...] [--phone a.png,-] [--focus 0.55,0.5;0.5,0.5] [--fast]');
  process.exit(1);
}
const phones = (opt('--phone') || '').split(',').map((s) => s.trim());
const focuses = (opt('--focus') || '').split(';').map((f) => (f ? f.split(',').map(Number) : [0.5, 0.5]));
const fast = argv.includes('--fast');
fs.mkdirSync(outDir, { recursive: true });

const probe = (f) => {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number);
  return { w, h };
};
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const depth = (img, out) => {
  const tmp = out.replace(/\.webp$/, '.png');
  execFileSync('node', [path.join(HERE, 'depth.mjs'), img, tmp, '--quality', fast ? 'fast' : 'high'], { stdio: ['ignore', 'ignore', 'inherit'] });
  ff(['-i', tmp, '-vf', "scale='min(2048,iw)':-2:flags=lanczos", '-c:v', 'libwebp', '-quality', '92', out]);
  fs.rmSync(tmp);
};

const report = [];
const shots = [];
inputs.forEach((src, i) => {
  const name = `shot${i + 1}`;
  const focus = focuses[i] || [0.5, 0.5];
  const { w, h } = probe(src);
  console.log(`\n${name}: ${path.basename(src)} (${w}x${h})`);

  // Desktop: native resolution up to 3840 wide, near-lossless WebP.
  const desk = path.join(outDir, `${name}.webp`);
  ff(['-i', src, '-vf', "scale='min(3840,iw)':-2:flags=lanczos", '-c:v', 'libwebp', '-quality', '92', '-compression_level', '6', desk]);
  const dw = Math.min(3840, w);
  console.log('  desktop image ... ok'); depth(desk, path.join(outDir, `${name}.depth.webp`)); console.log('  desktop depth ... ok');

  // Phone: the supplied 9:16 image, or a 9:16 crop around the focus point at full source height.
  const ph = phones[i] && phones[i] !== '-' ? phones[i] : null;
  const mob = path.join(outDir, `${name}-m.webp`);
  let mw, mh, cropped = false;
  if (ph) {
    const p = probe(ph); mw = p.w; mh = p.h;
    ff(['-i', ph, '-vf', "scale=-2:'min(3200,ih)':flags=lanczos", '-c:v', 'libwebp', '-quality', '92', '-compression_level', '6', mob]);
  } else {
    cropped = true;
    const cw = Math.min(w, Math.round((h * 9) / 16));
    const x = Math.max(0, Math.min(w - cw, Math.round(focus[0] * w - cw / 2)));
    mw = cw; mh = h;
    ff(['-i', src, '-vf', `crop=${cw}:${h}:${x}:0,scale=-2:'min(3200,ih)':flags=lanczos`, '-c:v', 'libwebp', '-quality', '92', '-compression_level', '6', mob]);
  }
  console.log(`  phone image ${cropped ? '(cropped around focus)' : '(supplied)'} ... ok`);
  depth(mob, path.join(outDir, `${name}-m.depth.webp`)); console.log('  phone depth ... ok');

  // Quality report: how many real image pixels land on each target screen.
  const notes = [];
  if (dw < 2560) notes.push(`desktop source is ${dw}px wide; below 2560 it softens on retina laptops (aim for 3840)`);
  if (mw < 1170) notes.push(`phone image is ${mw}px wide; modern phones show 1170-1290px, so supply a 9:16 image at least 1440x2560 (or upscale)`);
  report.push({ name, desktop: `${dw}px`, phone: `${mw}x${mh}${cropped ? ' crop' : ''}`, notes });

  shots.push({
    image: `${path.basename(outDir)}/${name}.webp`, depth: `${path.basename(outDir)}/${name}.depth.webp`,
    imageMobile: `${path.basename(outDir)}/${name}-m.webp`, depthMobile: `${path.basename(outDir)}/${name}-m.depth.webp`,
    from: +(i / inputs.length).toFixed(3), to: +((i + 1) / inputs.length).toFixed(3), focus,
    start: { dolly: 0, x: 0, y: 0, zoom: 1 }, end: { dolly: 0.5, x: 0.03, y: -0.01, zoom: 1.04 },
  });
});

console.log('\nQuality report');
for (const r of report) {
  console.log(`  ${r.name}: desktop ${r.desktop}, phone ${r.phone} ${r.notes.length ? '' : '- sharp on every screen'}`);
  r.notes.forEach((n) => console.log(`    ! ${n}`));
}
const cfg = { shots, transition: 0.1, atmosphere: { skyDrift: 0.7, fog: { amount: 0.15 }, particles: { amount: 0.25 }, grain: 0.015, vignette: 0.35 } };
fs.writeFileSync(path.join(outDir, 'film.json'), JSON.stringify(cfg, null, 2));
console.log(`\nWrote ${path.join(outDir, 'film.json')} (paste into data-cine, then tune focus, camera moves and atmosphere).`);
