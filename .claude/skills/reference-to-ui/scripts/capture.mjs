// Capture a reference: screenshots + measured design tokens.
// Usage: node capture.mjs <url|file.html> <outDir>
import fs from 'fs';
import path from 'path';
import { launch, toUrl, VIEWPORTS, settle } from './_browser.mjs';

const [target, outDir = 'ref'] = process.argv.slice(2);
if (!target) { console.error('Usage: node capture.mjs <url|file.html> <outDir>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const browser = await launch([target]);
const report = { source: target, viewports: {} };
for (const [name, vp] of Object.entries(VIEWPORTS)) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto(toUrl(target), { waitUntil: 'load', timeout: 60000 });
  await settle(page);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  await page.screenshot({ path: path.join(outDir, `${name}-fold.png`) });
  report.viewports[name] = await page.evaluate(() => {
    const count = (m, k) => { if (k && k !== 'none' && k !== 'normal') m[k] = (m[k] || 0) + 1; };
    const top = (m, n = 12) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([v, c]) => ({ v, c }));
    const fonts = {}, sizes = {}, weights = {}, lineHeights = {}, letterSpacing = {}, text = {}, bg = {}, borders = {}, radii = {}, shadows = {}, gaps = {}, pads = {}, maxWidths = {};
    const headings = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') continue;
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (hasText) {
        count(fonts, s.fontFamily.split(',')[0].replace(/["']/g, '').trim());
        count(sizes, s.fontSize); count(weights, s.fontWeight); count(lineHeights, s.lineHeight);
        count(letterSpacing, s.letterSpacing); count(text, s.color);
      }
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') count(bg, s.backgroundColor);
      if (s.backgroundImage !== 'none') count(bg, s.backgroundImage.slice(0, 120));
      if (parseFloat(s.borderTopWidth) > 0) count(borders, `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`);
      count(radii, s.borderRadius === '0px' ? null : s.borderRadius);
      count(shadows, s.boxShadow);
      count(gaps, s.gap); 
      if (s.paddingTop !== '0px' || s.paddingLeft !== '0px') count(pads, `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`);
      if (s.maxWidth !== 'none') count(maxWidths, s.maxWidth);
      if (/^H[1-6]$/.test(el.tagName)) headings.push({ tag: el.tagName, text: el.textContent.trim().slice(0, 60), font: s.fontFamily.split(',')[0], size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, color: s.color, transform: s.textTransform });
    }
    const sections = [...document.querySelectorAll('header, nav, main > *, section, footer')]
      .map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: (el.className && el.className.baseVal === undefined ? String(el.className) : '').slice(0, 60) || undefined, top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) }; })
      .filter(s => s.height > 40);
    return {
      pageHeight: document.documentElement.scrollHeight,
      body: { bg: getComputedStyle(document.body).backgroundColor, color: getComputedStyle(document.body).color },
      fonts: top(fonts), fontSizes: top(sizes, 16), fontWeights: top(weights), lineHeights: top(lineHeights), letterSpacing: top(letterSpacing, 6),
      textColors: top(text), backgrounds: top(bg), borders: top(borders, 8), radii: top(radii, 8), shadows: top(shadows, 6),
      gaps: top(gaps, 8), paddings: top(pads, 10), maxWidths: top(maxWidths, 6),
      headings: headings.slice(0, 20), sections,
      fontFaces: [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`).slice(0, 20),
    };
  });
  await page.close();
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'tokens.json'), JSON.stringify(report, null, 2));
console.log(`Saved ${outDir}/desktop.png, mobile.png, *-fold.png, tokens.json`);
const d = report.viewports.desktop;
console.log('Fonts:', d.fonts.map(f => f.v).join(', '));
console.log('Body:', d.body, '| page height', d.pageHeight);
console.log('Top sizes:', d.fontSizes.slice(0, 8).map(f => f.v).join(' '));
console.log('Top text colours:', d.textColors.slice(0, 5).map(f => f.v).join(' | '));
console.log('Sections:', d.sections.length);
