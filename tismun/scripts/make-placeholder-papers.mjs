/**
 * Generates a placeholder background paper for every committee in the mock
 * data, so the site has something real to show before the Secretariat's own
 * papers exist.
 *
 *   npm run papers
 *
 * Replace any generated file in public/papers/ with the real PDF whenever it
 * is ready — the filename must stay <committee-id>.pdf, matching the
 * "Background Paper URL" column in the sheet.
 *
 * The PDF is written by hand rather than with a library: these pages use only
 * the base-14 fonts every reader ships with, so the whole generator is one
 * dependency-free file.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'papers');
mkdirSync(OUT, { recursive: true });

const committees = JSON.parse(
  readFileSync(join(ROOT, 'src', 'data', 'mock', 'committees.json'), 'utf8'),
);

const PAGE_W = 595, PAGE_H = 842, MARGIN = 64;
const TEAL = '0.055 0.604 0.718';
const INK = '0.169 0.208 0.267';
const MUTED = '0.42 0.45 0.50';
const HAIRLINE = '0.894 0.906 0.922';

// Approximate advance widths as a fraction of font size. Good enough to wrap
// text tidily without shipping full AFM metric tables for the base-14 fonts.
const NARROW = new Set("iljtfrI.,;:'`|!()[]-");
const WIDE = new Set('mwMW@%');
function textWidth(str, size, bold = false) {
  let units = 0;
  for (const ch of str) {
    if (ch === ' ') units += 0.27;
    else if (NARROW.has(ch)) units += 0.31;
    else if (WIDE.has(ch)) units += 0.85;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) units += 0.68;
    else if (ch >= '0' && ch <= '9') units += 0.5;
    else units += 0.5;
  }
  return units * size * (bold ? 1.05 : 1);
}

function wrap(str, size, maxWidth, bold = false) {
  const words = str.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The base-14 fonts are declared with /WinAnsiEncoding, so curly quotes and
// dashes have real code points there — they are mapped rather than flattened
// to ASCII, which keeps the typography intact.
const WIN_ANSI = new Map([
  ['\u2018', 0x91], ['\u2019', 0x92], ['\u201c', 0x93], ['\u201d', 0x94],
  ['\u2022', 0x95], ['\u2013', 0x96], ['\u2014', 0x97], ['\u2026', 0x85],
]);

function pdfEscape(str) {
  return (
    str
      // Escape backslashes FIRST, or the octal escapes added below would
      // themselves be escaped and print as literal text.
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E\\]/g, (c) => {
        const code = WIN_ANSI.get(c) ?? c.charCodeAt(0);
        return code < 256 ? '\\' + code.toString(8).padStart(3, '0') : '?';
      })
  );
}

function buildContent(c) {
  const ops = [];
  const right = PAGE_W - MARGIN;
  const width = right - MARGIN;
  let y = PAGE_H - MARGIN;

  const text = (str, { font = 'F4', size = 10, color = INK, x = MARGIN, tc = 0 }) => {
    ops.push('BT', `${color} rg`, `/${font} ${size} Tf`, `${tc} Tc`, `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`, `(${pdfEscape(str)}) Tj`, '0 Tc', 'ET');
  };
  const rule = (w, h, color) => {
    ops.push(`${color} rg`, `${MARGIN} ${y.toFixed(2)} ${w} ${h} re`, 'f');
  };

  // Masthead
  text('TISMUN 2026', { font: 'F5', size: 9, color: TEAL, tc: 1.8 });
  y -= 14;
  rule(64, 1.6, TEAL);

  // Eyebrow
  y -= 52;
  text('BACKGROUND PAPER', { font: 'F5', size: 8.5, color: MUTED, tc: 1.4 });

  // Committee name
  y -= 34;
  for (const line of wrap(c.Name, 25, width, true)) {
    text(line, { font: 'F1', size: 25 });
    y -= 31;
  }

  // Abbreviation + room
  y -= 2;
  text(`${c.Abbreviation}  ·  ${c.Room}`, { font: 'F4', size: 10.5, color: MUTED });

  y -= 26;
  rule(width, 0.8, HAIRLINE);

  // Topics
  for (const [index, topic] of [c['Topic 1'], c['Topic 2']].entries()) {
    y -= 34;
    text(`TOPIC ${index + 1}`, { font: 'F5', size: 8.5, color: TEAL, tc: 1.4 });
    y -= 21;
    for (const line of wrap(topic, 14.5, width)) {
      text(line, { font: 'F2', size: 14.5 });
      y -= 20;
    }
    y += 20;
  }

  // Description
  y -= 38;
  rule(width, 0.8, HAIRLINE);
  y -= 30;
  for (const line of wrap(c.Description, 10.5, width)) {
    text(line, { font: 'F4', size: 10.5, color: MUTED });
    y -= 16;
  }

  // Placeholder notice. The panel is drawn from the text's own baselines so it
  // always closes below the last line.
  y -= 26;
  const noticeTop = y + 16;
  const noticeBottom = y - 55;
  const noticeHeight = noticeTop - noticeBottom;
  ops.push('0.98 0.98 0.97 rg', `${MARGIN} ${noticeBottom.toFixed(2)} ${width} ${noticeHeight} re`, 'f');
  ops.push(`${TEAL} rg`, `${MARGIN} ${noticeBottom.toFixed(2)} 2.5 ${noticeHeight} re`, 'f');
  text('Full background paper coming soon.', { font: 'F3', size: 13.5, x: MARGIN + 20 });
  y -= 20;
  text('The Secretariat will publish the complete guide — including the history of the', { font: 'F4', size: 9.5, color: MUTED, x: MARGIN + 20 });
  y -= 14;
  text('question, bloc positions and questions a resolution must answer — before the', { font: 'F4', size: 9.5, color: MUTED, x: MARGIN + 20 });
  y -= 14;
  text('conference. Delegates should begin their own research in the meantime.', { font: 'F4', size: 9.5, color: MUTED, x: MARGIN + 20 });

  // Footer
  y = MARGIN;
  rule(width, 0.8, HAIRLINE);
  y -= 16;
  text('Tashkent International School Model United Nations  ·  robb@tashschool.org', { font: 'F4', size: 8.5, color: MUTED });

  return ops.join('\n');
}

function buildPdf(content) {
  const fonts = [
    ['F1', 'Times-Bold'], ['F2', 'Times-Roman'], ['F3', 'Times-Italic'],
    ['F4', 'Helvetica'], ['F5', 'Helvetica-Bold'],
  ];
  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  const fontRefs = fonts.map(([key], i) => `/${key} ${4 + i} 0 R`).join(' ');
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << ${fontRefs} >> >> /Contents ${4 + fonts.length} 0 R >>`,
  );
  for (const [, base] of fonts) {
    objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`);
  }
  const stream = Buffer.from(content, 'latin1');
  objects.push(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);

  let pdf = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, 'latin1')]);
  });

  const xrefStart = pdf.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.concat([pdf, Buffer.from(xref, 'latin1')]);
}

for (const c of committees) {
  const pdf = buildPdf(buildContent(c));
  writeFileSync(join(OUT, `${c['Committee ID']}.pdf`), pdf);
  console.log(`${c['Committee ID'].padEnd(8)} ${(pdf.length / 1024).toFixed(1)} KB`);
}
