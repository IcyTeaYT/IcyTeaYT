#!/usr/bin/env node
// adkit.mjs — the ads-and-videos skill's one-command toolkit. Claude Code runs these itself.
//
//   node <skill>/scripts/adkit.mjs init [dir]        build a ready-to-render project (safe to re-run)
//   node tools/adkit.mjs doctor                       what works on this machine + which optional keys are set
//   node tools/adkit.mjs prep [public/clips]          normalise every clip: 30 fps, ≥1080p (lanczos), bt709, no audio
//   node tools/adkit.mjs review [ad.json]             render the key frame of every beat → review/sheet.png
//   node tools/adkit.mjs render [ad.json] [out/ad.mp4] max-quality render → loudness master → pacing report
//
// Quality defaults (same whether assets came from free or paid sources):
//   H.264 CRF 16, x264 preset slow, JPEG frames at quality 95, bt709 colour, AAC 320 kbps,
//   audio mastered to -14 LUFS / -1 dBTP (two-pass loudnorm), clips normalised before the edit.
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REMOTION = '4.0.530';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, '..');
const IN_SKILL = fs.existsSync(path.join(SKILL_ROOT, 'assets', 'LaunchKit.tsx'));
const WIN = process.platform === 'win32';
const log = (...a) => console.log(...a);
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
const ok = (cmd) => spawnSync(cmd, { shell: true, stdio: 'ignore' }).status === 0;

function loadEnv(dir = '.') {
  const p = path.join(dir, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const ffmpegCmd = () => (ok('ffmpeg -version') ? 'ffmpeg' : 'npx --no-install remotion ffmpeg');
const ffprobeCmd = () => (ok('ffprobe -version') ? 'ffprobe' : 'npx --no-install remotion ffprobe');
const python = () => ['python3', 'python', 'py -3'].find((p) => ok(`${p} --version`));

/* ───────────────────────── init ───────────────────────── */
function init(dir = '.') {
  if (!IN_SKILL) { console.error('Run init from the skill folder: node ~/.claude/skills/ads-and-videos/scripts/adkit.mjs init'); process.exit(2); }
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) { console.error(`Node ${process.versions.node} is too old — install Node 18+ (nodejs.org) and re-run.`); process.exit(2); }
  dir = path.resolve(dir);
  fs.mkdirSync(dir, { recursive: true });
  process.chdir(dir);
  log(`▸ project: ${dir}`);

  const write = (f, content, overwrite = false) => {
    if (!overwrite && fs.existsSync(f)) return;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
  };
  const pkgPath = 'package.json';
  const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : { name: path.basename(dir).toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'ad-studio', private: true };
  pkg.scripts = { ...(pkg.scripts || {}), studio: 'remotion studio', review: 'node tools/adkit.mjs review', render: 'node tools/adkit.mjs render', doctor: 'node tools/adkit.mjs doctor' };
  pkg.dependencies = { ...(pkg.dependencies || {}),
    remotion: REMOTION, '@remotion/cli': REMOTION, '@remotion/bundler': REMOTION, '@remotion/renderer': REMOTION,
    '@remotion/fonts': REMOTION, '@remotion/transitions': REMOTION, react: '^19.0.0', 'react-dom': '^19.0.0',
    '@fontsource-variable/inter': '^5.2.0' };
  pkg.devDependencies = { ...(pkg.devDependencies || {}), typescript: '^5.6.0', '@types/react': '^19.0.0', playwright: '^1.50.0' };
  write(pkgPath, pkg, true);
  write('tsconfig.json', { compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, resolveJsonModule: true, esModuleInterop: true, lib: ['DOM', 'ES2020'] }, include: ['src'] });
  write('remotion.config.ts', `import {Config} from '@remotion/cli/config';\n\n// Same max-quality settings as tools/adkit.mjs render, for renders started from Studio.\nConfig.setVideoImageFormat('jpeg');\nConfig.setJpegQuality(95);\nConfig.setCrf(16);\nConfig.setColorSpace('bt709');\nConfig.setOverwriteOutput(true);\n`);
  write('src/index.ts', `import {registerRoot} from 'remotion';\nimport {RemotionRoot} from './Examples';\n\nregisterRoot(RemotionRoot);\n`);
  for (const f of ['LaunchKit.tsx', 'JsonAd.tsx', 'Examples.tsx', 'example-ad.json']) fs.copyFileSync(path.join(SKILL_ROOT, 'assets', f), path.join('src', f));
  if (!fs.existsSync('ad.json')) fs.copyFileSync(path.join(SKILL_ROOT, 'assets', 'example-ad.json'), 'ad.json');
  fs.mkdirSync('tools', { recursive: true });
  for (const f of fs.readdirSync(path.join(SKILL_ROOT, 'scripts'))) if (/\.(py|mjs|sh)$/.test(f)) fs.copyFileSync(path.join(SKILL_ROOT, 'scripts', f), path.join('tools', f));
  for (const d of ['public/clips', 'public/stills', 'public/fonts', 'public/sfx', 'review', 'out']) fs.mkdirSync(d, { recursive: true });
  write('.gitignore', 'node_modules/\nout/\nreview/\n.env\n__pycache__/\n');
  write('.env.example', '# All optional. The skill works with none of these.\nPIXABAY_API_KEY=      # free, more stock choice: pixabay.com/api/docs\nHF_TOKEN=             # free, bigger daily AI-video quota: huggingface.co/settings/tokens\n# Paid, only if you choose to:\nFAL_KEY=\nELEVENLABS_API_KEY=\n');

  log('▸ installing packages (first time takes a few minutes)…');
  sh('npm install --no-audit --no-fund --loglevel=error');
  const font = ['node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'].find((f) => fs.existsSync(f));
  if (font) fs.copyFileSync(font, 'public/fonts/Inter.woff2');
  else log('! Inter font file not found — renders fall back to system sans-serif.');

  const py = python();
  if (py) {
    log('▸ installing free Python tools (edge-tts, gradio_client)…');
    const pip = `${py} -m pip install --user --quiet edge-tts gradio_client`;
    if (!ok(pip) && !ok(`${pip} --break-system-packages`)) log('! pip install failed — run it manually: ' + pip);
    log('▸ installing photo tools (Pillow + rembg background removal)…');
    const pip2 = `${py} -m pip install --user --quiet pillow "rembg[cpu]"`;
    if (!ok(pip2) && !ok(`${pip2} --break-system-packages`)) log('! rembg install failed — studio frames need it: ' + pip2);
  } else log('! Python 3 not found — install it (python.org) for stock downloads, voiceover and AI-clip tools.');

  if (!process.argv.includes('--no-browsers')) {
    log('▸ installing Chromium for website recordings/screenshots…');
    if (!ok('npx playwright install chromium')) log('! Playwright browser install failed — retry later with: npx playwright install chromium');
  }
  log(`▸ ffmpeg: ${ok('ffmpeg -version') ? 'system ffmpeg' : "Remotion's bundled ffmpeg (no install needed)"}`);
  log('▸ smoke test: rendering one frame…');
  return review('src/example-ad.json', { limit: 1, quiet: true }).then(() => {
    log('\n✓ Ready. Next: write ad.json, then `node tools/adkit.mjs review` and `node tools/adkit.mjs render`.');
    doctor();
  });
}

/* ───────────────────────── doctor ───────────────────────── */
function doctor() {
  loadEnv();
  const req = createRequire(path.resolve('package.json'));
  const has = (m) => { try { req.resolve(m); return true; } catch { return false; } };
  const py = python();
  const pyHas = (m) => py && ok(`${py} -c "import ${m}"`);
  let pw = false;
  try { pw = fs.existsSync(req('playwright').chromium.executablePath()); } catch {}
  const k = (n) => (process.env[n] ? '✓' : '·');
  const rows = [
    ['Render engine (Remotion)', has('@remotion/renderer') ? '✓' : '✗ run init'],
    ['ffmpeg', ok('ffmpeg -version') ? '✓ system' : '✓ bundled with Remotion'],
    ['Python', py ? `✓ ${py}` : '✗ install Python 3'],
    ['Free voiceover (edge-tts)', pyHas('edge_tts') ? '✓' : '✗ pip install edge-tts'],
    ['Free AI clips (Hugging Face)', pyHas('gradio_client') ? `✓ ${process.env.HF_TOKEN ? 'with HF_TOKEN (bigger quota)' : 'anonymous (small quota)'}` : '✗ pip install gradio_client'],
    ['Website recording (Playwright)', pw ? '✓' : '✗ npx playwright install chromium'],
    ['Photo → frames (Pillow + rembg)', pyHas('rembg') ? '✓' : pyHas('PIL') ? '◐ crops only — pip install "rembg[cpu]"' : '✗ pip install pillow "rembg[cpu]"'],
    ['Stock: NASA + Internet Archive', '✓ no key needed'],
    ['Stock: Pixabay', process.env.PIXABAY_API_KEY ? '✓' : '· optional free key'],
    ['Paid (only if chosen): fal / ElevenLabs', `${k('FAL_KEY')} / ${k('ELEVENLABS_API_KEY')}`],
  ];
  log('\nadkit doctor');
  for (const [a, b] of rows) log(`  ${a.padEnd(34)} ${b}`);
}

/* ───────────────────────── prep ───────────────────────── */
function prep(dir = 'public/clips') {
  const ffm = ffmpegCmd(), ffp = ffprobeCmd();
  const files = fs.readdirSync(dir).filter((f) => /\.(mp4|mov|webm|mkv)$/i.test(f) && !f.includes('.prepped.'));
  if (!files.length) return log(`no clips in ${dir}`);
  for (const f of files) {
    try {
    const src = path.join(dir, f);
    const [w, h] = execSync(`${ffp} -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${src}"`, { shell: true }).toString().trim().split(',').map(Number);
    const portrait = h > w;
    const short = portrait ? w : h;
    // Upscale only when below 1080 on the short side; lanczos + light sharpen; keep aspect; even dims.
    const scale = short < 1080 ? (portrait ? 'scale=1080:-2:flags=lanczos,unsharp=5:5:0.5' : 'scale=-2:1080:flags=lanczos,unsharp=5:5:0.5') : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
    const tmp = src.replace(/\.(\w+)$/, '.prepped.mp4');
    sh(`${ffm} -y -v error -i "${src}" -vf "fps=30,${scale},format=yuv420p" -colorspace bt709 -color_primaries bt709 -color_trc bt709 -an -c:v libx264 -preset slow -crf 14 "${tmp}"`);
    fs.renameSync(tmp, src.replace(/\.(\w+)$/, '.mp4'));
    if (!src.endsWith('.mp4')) fs.unlinkSync(src);
    log(`✓ ${f}  ${w}x${h}${short < 1080 ? ' → upscaled to 1080' : ''}`);
    } catch (e) { log(`✗ ${f}: ${String(e.message || e).split('\n')[0]}`); }
  }
}

/* ───────────────────────── review + render ───────────────────────── */
async function remotionSession(adPath) {
  loadEnv();
  const req = createRequire(path.resolve('package.json'));
  const { bundle } = req('@remotion/bundler');
  const { openBrowser, selectComposition } = req('@remotion/renderer');
  const inputProps = JSON.parse(fs.readFileSync(adPath, 'utf8'));
  const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
  const browserExecutable = process.env.CHROME_PATH || null;
  const browser = await openBrowser('chrome', { browserExecutable });
  const composition = await selectComposition({ serveUrl, id: 'Ad', inputProps, puppeteerInstance: browser, browserExecutable });
  return { req, serveUrl, browser, composition, inputProps, browserExecutable };
}

async function review(adPath = 'ad.json', { limit = Infinity, quiet = false } = {}) {
  const s = await remotionSession(adPath);
  const { renderStill } = s.req('@remotion/renderer');
  fs.mkdirSync('review', { recursive: true });
  for (const f of fs.readdirSync('review')) if (/^beat_\d+\.png$/.test(f)) fs.unlinkSync(path.join('review', f));
  let start = 0; const legend = [];
  const beats = s.inputProps.beats.slice(0, limit);
  for (const [i, b] of beats.entries()) {
    const frame = start + Math.min(b.dur - 1, Math.max(0, Math.round(b.dur * 0.65))); // after entrances settle
    start += b.dur;
    const out = `review/beat_${String(i + 1).padStart(2, '0')}.png`;
    await renderStill({ composition: s.composition, serveUrl: s.serveUrl, output: out, frame, inputProps: s.inputProps, puppeteerInstance: s.browser, browserExecutable: s.browserExecutable, scale: 0.5 });
    legend.push(`${String(i + 1).padStart(2, ' ')}. f${frame}  ${b.type}${b.caption ? ` — "${b.caption}"` : ''}${b.src ? `  [${b.src}]` : b.type === 'footage' ? '  [PLACEHOLDER]' : ''}`);
  }
  await s.browser.close({ silent: true });
  const cols = Math.min(6, beats.length);
  const rows = Math.ceil(beats.length / cols);
  sh(`${ffmpegCmd()} -y -v error -framerate 1 -i review/beat_%02d.png -vf "scale=270:-2,tile=${cols}x${rows}:padding=6:color=0x222222" -frames:v 1 review/sheet.png`);
  if (!quiet) { log('✓ review/sheet.png — look at it before rendering. Beats:'); log(legend.join('\n')); }
}

async function render(adPath = 'ad.json', out = 'out/ad.mp4') {
  const s = await remotionSession(adPath);
  const { renderMedia } = s.req('@remotion/renderer');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  let last = -1;
  await renderMedia({
    composition: s.composition, serveUrl: s.serveUrl, codec: 'h264', outputLocation: raw, inputProps: s.inputProps,
    puppeteerInstance: s.browser, browserExecutable: s.browserExecutable,
    crf: 16, x264Preset: 'slow', jpegQuality: 95, imageFormat: 'jpeg', colorSpace: 'bt709', audioBitrate: '320k',
    onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; process.stdout.write(`\rrendering ${'█'.repeat(p)}${'░'.repeat(20 - p)} ${Math.round(progress * 100)}%`); } },
  });
  await s.browser.close({ silent: true });
  log('');
  master(raw, out);
  fs.unlinkSync(raw);
  log(`✓ ${out}`);
  const bd = path.join('tools', 'breakdown.sh');
  if (fs.existsSync(bd) && ok('bash --version')) sh(`bash "${bd}" "${out}" review/final`);
}

/** Two-pass EBU R128 loudness to -14 LUFS / -1 dBTP; video stream copied untouched. */
function master(input, output) {
  const ffm = ffmpegCmd();
  const hasAudio = execSync(`${ffprobeCmd()} -v error -select_streams a -show_entries stream=index -of csv=p=0 "${input}"`, { shell: true }).toString().trim();
  if (!hasAudio) { fs.copyFileSync(input, output); log('(no audio track — skipped mastering)'); return; }
  const probe = spawnSync(`${ffm} -hide_banner -i "${input}" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -`, { shell: true, encoding: 'utf8' });
  const m = (probe.stderr || '').match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  let af = 'loudnorm=I=-14:TP=-1:LRA=11';
  if (m) {
    const j = JSON.parse(m[0]);
    af += `:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  }
  sh(`${ffm} -y -v error -i "${input}" -c:v copy -af "${af}" -ar 48000 -c:a aac -b:a 320k -movflags +faststart "${output}"`);
  log('✓ audio mastered to -14 LUFS / -1 dBTP');
}

/* ───────────────────────── cli ───────────────────────── */
const [cmd, ...rest] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const run = { init: () => init(rest[0]), doctor, prep: () => prep(rest[0]), review: () => review(rest[0]), render: () => render(rest[0], rest[1]) }[cmd];
if (!run) { log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 7).join('\n').replace(/^\/\/ ?/gm, '')); process.exit(cmd ? 2 : 0); }
Promise.resolve(run()).catch((e) => { console.error('\n✗', e.message || e); process.exit(1); });
