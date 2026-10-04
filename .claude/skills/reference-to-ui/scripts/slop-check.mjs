// Flag the patterns that make a page look AI-template generated. Exit code 1 if any HIGH findings.
// Usage: node slop-check.mjs <url|file.html> [--allow gradient-text,marquee,...]
import { launch, toUrl, settle } from './_browser.mjs';

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--'));
const allowIdx = args.indexOf('--allow');
const allow = new Set(allowIdx >= 0 ? args[allowIdx + 1].split(',') : []);
if (!target) { console.error('Usage: node slop-check.mjs <url|file.html> [--allow rule1,rule2]'); process.exit(1); }

const browser = await launch([target]);
const all = [];
for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(toUrl(target), { waitUntil: 'load', timeout: 60000 });
  await settle(page);
  const findings = await page.evaluate((vpName) => {
    const f = []; const add = (rule, sev, el, note) => f.push({ rule, sev, vp: vpName, where: el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + (el.textContent || '').trim().slice(0, 40) + '"') : '', note });
    const els = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const fonts = new Set(); const accent = new Set();
    let radial = 0, blur = 0, glows = 0;
    for (const el of els) {
      const s = getComputedStyle(el);
      const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (txt) fonts.add(s.fontFamily.split(',')[0].replace(/["']/g, '').trim());
      if ((s.webkitBackgroundClip === 'text' || s.backgroundClip === 'text') && s.backgroundImage.includes('gradient')) add('gradient-text', 'HIGH', el, 'Gradient-filled text');
      radial += (s.backgroundImage.match(/radial-gradient/g) || []).length;
      if (s.backdropFilter && s.backdropFilter !== 'none') blur++;
      if (/rgba?\([^)]*\)\s+0px\s+0px\s+([3-9]\d|\d{3})px/.test(s.boxShadow)) glows++;
      if (parseFloat(s.filter.match(/blur\((\d+)/)?.[1] || 0) >= 40) glows++;
      if (s.animationName && s.animationName !== 'none' && /marquee|scroll|ticker|slide/i.test(s.animationName) && el.scrollWidth > innerWidth) add('marquee', 'MED', el, 'Infinite marquee/ticker');
      if (txt && parseFloat(s.fontSize) < 12 && el.textContent.trim().length > 2 && !el.closest('[aria-hidden="true"],.sr-only')) add('tiny-text', 'MED', el, `${s.fontSize} text`);
      if (/^H[1-3]$/.test(el.tagName)) {
        const prev = el.previousElementSibling;
        if (prev) { const ps = getComputedStyle(prev); const t = prev.textContent.trim();
          if (t.length < 40 && (ps.textTransform === 'uppercase' || /^\s*(\d{1,2}|0\d)\s*[\/.\-—–·]/.test(t)) && parseFloat(ps.fontSize) <= 14) add('eyebrow-kicker', 'MED', prev, 'Small uppercase/numbered kicker above heading'); }
      }
      if (txt && /^\s*(est\.?|since)\s*\d{4}/i.test(el.textContent) && parseFloat(s.borderRadius) > 12) add('est-pill', 'HIGH', el, '"EST. 20XX" pill');
      if (txt && /\b\d{2}\.\d%|\b99\.\d+%|\b10x\b|\b\d+k\+ (users|developers|teams)/i.test(el.textContent) && el.children.length === 0) add('suspicious-stat', 'HIGH', el, 'Stat that looks invented: verify it is real');
      const c = s.color.match(/\d+/g); if (c && txt) { const [r, g, b] = c.map(Number); const max = Math.max(r, g, b), min = Math.min(r, g, b); if (max - min > 60) accent.add(`${r},${g},${b}`); }
      if (/^(A|BUTTON)$/.test(el.tagName) && vpName === 'mobile') { const r = el.getBoundingClientRect(); if (r.height < 40 && r.width < 40 && el.textContent.trim().length < 3) add('small-tap-target', 'MED', el, `${Math.round(r.width)}x${Math.round(r.height)}px`); }
    }
    // Canvases marked data-media (footage/image sequences) are content, not effects.
    if ([...document.querySelectorAll('canvas:not([data-media])')].some(c => c.getBoundingClientRect().width > innerWidth * 0.5)) add('particle-canvas', 'MED', null, 'Large background canvas (particles/effects?). Mark real footage canvases with data-media.');
    if (radial >= 3) add('glow-blobs', 'HIGH', null, `${radial} radial-gradient layers`);
    if (glows >= 3) add('glows', 'MED', null, `${glows} large glow shadows/blurs`);
    if (blur >= 4) add('glassmorphism', 'MED', null, `${blur} backdrop-filter elements`);
    if (fonts.size > 3) add('too-many-fonts', 'MED', null, [...fonts].join(', '));
    if (accent.size > 4) add('too-many-accents', 'MED', null, `${accent.size} saturated text colours`);
    if (document.documentElement.scrollWidth > innerWidth + 1) add('horizontal-scroll', 'HIGH', null, `page is ${document.documentElement.scrollWidth}px wide`);
    for (const el of document.querySelectorAll('h1,h2,h3,p')) { if (el.closest('.cine__beat, [data-beat], [data-in][data-out]')) continue; /* scroll-paced film captions are hidden by design outside their band */ const s = getComputedStyle(el); if (el.textContent.trim() && (s.opacity === '0' || s.visibility === 'hidden')) add('hidden-content', 'HIGH', el, 'Text still invisible after scrolling (observer-gated?)'); }
    const texts = {}; for (const el of document.querySelectorAll('p,h1,h2,h3,blockquote')) { const t = el.textContent.trim().toLowerCase(); if (t.length > 25) texts[t] = (texts[t] || 0) + 1; }
    for (const [t, n] of Object.entries(texts)) if (n > 1) add('repeated-copy', 'MED', null, `"${t.slice(0, 50)}" appears ${n}x`);
    return f;
  }, vp.name);
  all.push(...findings);
  await page.close();
}
await browser.close();

const seen = new Set();
const out = all.filter(x => !allow.has(x.rule)).filter(x => { const k = x.rule + x.where + x.note; if (seen.has(k)) return false; seen.add(k); return true; });
if (!out.length) { console.log('Clean: no template patterns found.'); process.exit(0); }
for (const sev of ['HIGH', 'MED']) for (const x of out.filter(o => o.sev === sev)) console.log(`[${sev}] ${x.rule} (${x.vp}) ${x.where} ${x.note}`);
const high = out.filter(o => o.sev === 'HIGH').length;
console.log(`\n${high} HIGH, ${out.length - high} MED. Fix HIGH unless the reference has the same thing (then --allow it).`);
process.exit(high ? 1 : 0);
