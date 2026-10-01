#!/usr/bin/env node
// screenshot.mjs — look at what you built. Screenshots at phone + desktop widths, plus layout QA.
//
//   npm i -D playwright && npx playwright install chromium      (once)
//   node screenshot.mjs <url | path/to/file.html> [outDir=shots] [--widths=390,1440] [--reduced] [--dark|--light]
//   CHROME_PATH=/path/to/chrome node screenshot.mjs ...           (use an existing Chrome/Chromium)
//
// Writes <outDir>/<width>-top.png (first screen) and <width>-full.png (whole page) and prints:
// horizontal overflow, elements wider than the viewport, console errors, failed requests, images without alt,
// text under 12px, and tap targets under 40px on mobile.
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolve Playwright from the project you run this in (not from the skill folder).
const requireFromCwd = createRequire(resolve(process.cwd(), 'noop.js'));
let chromium;
try { ({ chromium } = requireFromCwd('playwright')); } catch {
  try { ({ chromium } = requireFromCwd('playwright-core')); } catch {
    console.error('Playwright not found in this project. Run: npm i -D playwright && npx playwright install chromium');
    process.exit(2);
  }
}

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node screenshot.mjs <url|file.html> [outDir] [--widths=390,1440] [--reduced]'); process.exit(2); }
const outDir = args.filter((a) => !a.startsWith('--'))[1] ?? 'shots';
const widths = (args.find((a) => a.startsWith('--widths='))?.split('=')[1] ?? '390,1440').split(',').map(Number);
const reduced = args.includes('--reduced');
const scheme = args.includes('--light') ? 'light' : 'dark';
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(target)).href;
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
for (const w of widths) {
  const mobile = w < 768;
  const page = await browser.newPage({
    viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url().slice(0, 100)}`));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => errors.push(`goto: ${e.message}`));
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(1600); // let the entrance sequence finish
  await page.screenshot({ path: `${outDir}/${w}-top.png` });

  // Scroll through so in-view reveals fire, then back to top for the full-page shot.
  await page.evaluate(async () => {
    const step = Math.max(200, innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); }
    await new Promise((r) => setTimeout(r, 900)); scrollTo(0, 0); await new Promise((r) => setTimeout(r, 500));
  });
  await page.screenshot({ path: `${outDir}/${w}-full.png`, fullPage: true });

  const qa = await page.evaluate((isMobile) => {
    const vw = document.documentElement.clientWidth;
    const out = { overflowX: document.documentElement.scrollWidth - vw, wide: [], tinyText: 0, smallTargets: [], noAlt: 0 };
    const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && r.width > 0 && (r.right > vw + 1 || r.left < -1) && out.wide.length < 8) {
        let p = el.parentElement, clipped = false;
        while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') { clipped = true; break; } p = p.parentElement; }
        if (!clipped) out.wide.push(`${label(el)} (${Math.round(r.left)}→${Math.round(r.right)}px)`);
      }
      if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 12 && cs.visibility !== 'hidden') out.tinyText++;
      if (isMobile && el.matches('a, button, [role="button"], input, select, textarea') && r.width > 0 && (r.width < 40 || r.height < 40) && out.smallTargets.length < 8) out.smallTargets.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    out.noAlt = document.querySelectorAll('img:not([alt])').length;
    return out;
  }, mobile);

  console.log(`\n=== ${w}px ${mobile ? '(mobile)' : '(desktop)'} → ${outDir}/${w}-top.png, ${outDir}/${w}-full.png`);
  console.log(`horizontal overflow: ${qa.overflowX > 0 ? `YES (${qa.overflowX}px) ✗` : 'none ✓'}`);
  if (qa.wide.length) console.log(`elements past the viewport edge: ${qa.wide.join(', ')}`);
  console.log(`text under 12px: ${qa.tinyText}${qa.tinyText ? ' (check legibility)' : ' ✓'}`);
  if (mobile) console.log(`tap targets under 40px: ${qa.smallTargets.length ? qa.smallTargets.join(', ') : 'none ✓'}`);
  console.log(`images without alt: ${qa.noAlt || 'none ✓'}`);
  console.log(`errors: ${errors.length ? '\n  ' + errors.slice(0, 10).join('\n  ') : 'none ✓'}`);
  await page.close();
}
await browser.close();
