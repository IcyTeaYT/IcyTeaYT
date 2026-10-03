// Shared helper: load Playwright from the project, then the global install.
import { createRequire } from 'module';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export function loadPlaywright() {
  const req = createRequire(path.join(process.cwd(), 'noop.js'));
  try { return req('playwright'); } catch {}
  try { return req('@playwright/test'); } catch {}
  const globalRoot = execSync('npm root -g').toString().trim();
  const greq = createRequire(path.join(globalRoot, 'noop.js'));
  try { return greq('playwright'); } catch {}
  console.error('Playwright not found. Run: npm i -D playwright  (browsers: npx playwright install chromium)');
  process.exit(1);
}

const isLocal = (t) => !/^https?:\/\//.test(t) || /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(t);

// Pass the page(s) you will open: local pages skip the proxy entirely.
export async function launch(targets = []) {
  const { chromium } = loadPlaywright();
  // Honour HTTPS_PROXY / HTTP_PROXY: Playwright ignores them unless passed explicitly.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  const bypass = process.env.NO_PROXY || process.env.no_proxy;
  const opts = proxy && !(targets.length && targets.every(isLocal)) ? { proxy: { server: proxy, ...(bypass ? { bypass } : {}) } } : {};
  const preinstalled = '/opt/pw-browsers/chromium';
  try { return await chromium.launch(opts); } catch (e) {
    if (fs.existsSync(preinstalled)) return chromium.launch({ ...opts, executablePath: preinstalled });
    throw e;
  }
}

// Accept a URL, a local .html file, or a local image.
export function toUrl(target) {
  if (/^https?:\/\//.test(target) || target.startsWith('file://')) return target;
  return 'file://' + path.resolve(target);
}

export const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

export async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  // Trigger lazy/scroll-gated content, then return to top.
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(400);
}
