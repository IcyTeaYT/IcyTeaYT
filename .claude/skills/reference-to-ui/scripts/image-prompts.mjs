#!/usr/bin/env node
// Write an image prompt sheet (IMAGE-PROMPTS.md) for ChatGPT or Nano Banana (Gemini), composed for
// the 3D-photo scroll engine in assets/cinematic/. No dependencies.
//
//   node image-prompts.mjs --subject "a stone path through a misty highland valley" --setting "Scottish highlands" \
//     --light "golden hour, low sun from the right" --shots 3 --text left --palette "#2b3a2a,#e8c27a" --out IMAGE-PROMPTS.md
import fs from 'fs';

const HELP = `Usage: node image-prompts.mjs [--spec spec.json] [fields...] [--out IMAGE-PROMPTS.md]

  subject    what the scene shows (required)                 "a quiet harbour town at dawn"
  setting    where                                            "Mediterranean coast"
  light      time and light                                   "blue hour, warm window lights"
  mood       feel                                             "calm, premium"
  palette    page colours, comma separated hex                "#0b1020,#f2c48d"
  text       where the headline sits: left|right|center|top|bottom|none (default left)
  shots      frames in the scroll journey, 1 to 6 (default 1). Frames 2+ are edits of the previous image.
  journey    how the camera travels between frames            "walk down the path toward the house, then inside"
  layers     true: also prompts for a background plate and a cut-out subject (strong parallax)
  sections   supporting stills for the page below, comma separated "the cabin interior,a cup of coffee on a table"
  brand      the user's own brand (kept out of the images; used in the sheet title)
  aspect     16:9 | 21:9 | 3:2 (default 16:9); a 9:16 phone version is always offered`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const flags = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); flags[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'; }
let spec = flags.spec ? JSON.parse(fs.readFileSync(flags.spec, 'utf8')) : {};
spec = { ...spec, ...Object.fromEntries(Object.entries(flags).filter(([k]) => !['spec', 'out'].includes(k))) };
if (!spec.subject) { console.error('Missing --subject.\n\n' + HELP); process.exit(1); }

function colourName(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0; if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  if (l < 0.08) return 'near-black'; if (l > 0.93) return s > 0.3 ? 'pale cream' : 'off-white';
  if (s < 0.12) return l < 0.3 ? 'charcoal' : l < 0.6 ? 'stone grey' : 'silver grey';
  const hue = h < 15 ? 'red' : h < 40 ? 'orange' : h < 55 ? 'amber' : h < 70 ? 'golden yellow' : h < 160 ? 'green' : h < 195 ? 'teal' : h < 250 ? (l < 0.3 ? 'navy' : 'blue') : h < 290 ? 'violet' : h < 335 ? 'magenta' : 'crimson';
  if (l >= 0.65 && h >= 20 && h < 60) return 'warm champagne';
  return `${l < 0.22 ? 'deep' : l < 0.4 ? 'dark' : l < 0.65 ? (s > 0.6 ? 'vivid' : 'muted') : 'soft'} ${hue}`;
}
const cap = (x) => x ? x[0].toUpperCase() + x.slice(1) : x;
const palette = spec.palette ? spec.palette.split(',').map((x) => x.trim()).filter(Boolean) : [];
const words = [...new Set(palette.map(colourName))].slice(0, 3);
const paletteLine = words.length ? `Colour palette of ${words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words.at(-1) : words[0]}.` : '';
const text = (spec.text || 'left').toLowerCase();
const shots = Math.max(1, Math.min(6, Number(spec.shots || 1)));
const aspect = spec.aspect || '16:9';
const light = spec.light || 'soft natural light';
const mood = spec.mood || 'calm, premium, cinematic';
const setting = spec.setting ? `, ${spec.setting}` : '';
const SPACE = {
  left: 'The main subject sits in the right two-thirds; the left third is calm and uncluttered (sky, wall, water or soft shadow) for a headline.',
  right: 'The main subject sits in the left two-thirds; the right third is calm and uncluttered for a headline.',
  center: 'The subject sits low and centred; the upper middle is open sky or a calm background for a centred headline.',
  top: 'The subject sits in the lower half; the top third is open and calm for text.',
  bottom: 'The subject sits in the upper half; the bottom third is darker and calm for text.',
  none: 'Balanced composition with one clear focal point.',
};
// What makes a still work with depth-based camera moves.
const DEPTH = 'Clear depth layers: a defined foreground element, a midground subject and a distant background, with visible separation between them. Open sky or distant scenery in part of the frame. No thin, wispy foreground details at the frame edges (no stray branches, wires, hair or fences crossing the frame). Sharp focus throughout.';
const LOOK = `Photorealistic, shot on a full-frame cinema camera with a 35mm lens, natural film grain, realistic materials, true-to-life scale, high dynamic range. Mood: ${mood}.`;
const GUARD = 'No text, no letters, no logos, no watermarks, no signs, no people facing the camera.';

const hero = (ar) => [
  `${ar === '9:16' ? 'Vertical' : 'Wide'} cinematic photograph of ${spec.subject}${setting}.`,
  `${cap(light)}.`, paletteLine,
  ar === '9:16' ? 'Subject centred in the middle third, open calm space above and below for text.' : SPACE[text] || SPACE.left,
  DEPTH, LOOK, GUARD, `Aspect ratio ${ar}, highest resolution available.`,
].filter(Boolean).join(' ');

const journey = spec.journey || 'move the camera steadily forward along the main path toward the subject';
const step = (i) => `Using the attached image as the previous frame: ${journey}. This is step ${i} of ${shots}: the camera is now ${i === shots ? 'at the final resting point, a composed, satisfying view of the destination' : `about ${Math.round((i - 1) / (shots - 1) * 100)}% of the way along that path`}. Keep everything else identical: same place, same time of day and light (${light}), same colour grade, same weather, same style and lens. Nothing new appears that would not be visible from the new position. ${SPACE[text] || ''} ${DEPTH} ${GUARD} Aspect ratio ${aspect}, highest resolution available.`;

const sections = spec.sections ? spec.sections.split(',').map((s) => s.trim()).filter(Boolean) : [];
const title = `${spec.brand ? spec.brand + ': ' : ''}${spec.subject}${setting}`;

let md = `# Image prompts: ${title}

These images become the page's scroll film: each still gets a depth map, then the camera moves through it in 3D as the visitor scrolls, with drifting sky, fog, light and particles added in code. **Text sits:** ${text}. **Frames in the journey:** ${shots}.${palette.length ? ` **Palette:** ${palette.map((p) => `${p} (${colourName(p)})`).join(', ')}.` : ''}

**Which tool**
- **Nano Banana (Gemini app or Google AI Studio):** best for the journey frames, because you can attach the previous image and ask for the next step while it keeps the scene consistent. Pick the ${aspect} aspect ratio where offered.
- **ChatGPT (image generation):** excellent single heroes and supporting stills. Ask for "wide ${aspect}" (or pick landscape). It can also make a transparent-background PNG for the layers option.
- **Resolution matters most:** pick the highest output size offered (Nano Banana Pro: 4K; ChatGPT: the largest landscape/portrait size). If an image comes out under about 2560 px wide, upscale it x2 or x4 with the free Upscayl app before sending it. Never resize it up in a normal editor.
- Generate 2 to 4 options per prompt and keep the best. Download the full-size original file (PNG or high-quality JPG), not a screenshot or a chat preview.

---

## 1. Hero frame (${aspect})

\`\`\`text
${hero(aspect)}
\`\`\`

Phone version (optional, 9:16). Skip it if the hero still works cropped around its subject; the engine crops toward the focus point on phones:

\`\`\`text
${hero('9:16')}
\`\`\`
`;

if (shots > 1) {
  md += `
---

## 2. Journey frames (attach the previous image each time)

Camera path: ${journey}. Use Nano Banana with the previous frame attached, or ChatGPT in the same chat with the previous image. If a frame drifts (new colours, a different building, extra objects), regenerate that step before moving on.
${Array.from({ length: shots - 1 }, (_, k) => `
**Frame ${k + 2} of ${shots}**

\`\`\`text
${step(k + 2)}
\`\`\`
`).join('')}`;
}

if (spec.layers === 'true' || spec.layers === true) {
  md += `
---

## ${shots > 1 ? 3 : 2}. Layers (optional, for stronger parallax)

Background plate: attach the hero image.

\`\`\`text
Using the attached image: remove the main subject (${spec.subject}) completely and fill the space with what would naturally be behind it, matching the light, perspective and grain exactly. Keep everything else identical. ${GUARD}
\`\`\`

Subject alone: ChatGPT can output a transparent background; in Nano Banana use a flat plain background.

\`\`\`text
Using the attached image: isolate only the main subject (${spec.subject}) exactly as it appears, same angle, light and size, on a ${'transparent background (PNG)'}. If transparency is not available, use a perfectly flat mid-grey background. ${GUARD}
\`\`\`
`;
}

if (sections.length) {
  md += `
---

## Supporting stills for the page sections

Same world as the hero: attach the hero image so the light and colour match.
${sections.map((s, i) => `
**Section image ${i + 1}: ${s}**

\`\`\`text
Using the attached image only as the reference for light, colour grade and style: a cinematic photograph of ${s}, in the same world, same time of day (${light}), same palette and lens character. ${paletteLine} ${LOOK} ${GUARD} Aspect ratio 3:2.
\`\`\`
`).join('')}`;
}

md += `
---

## Before sending them back, check each image

- Nothing melted or doubled (hands, windows, railings, wheels), no stray text or logo anywhere, including tiny signs.
- The text side of the frame is calm.
- Journey frames look like one place seen from a moving camera, not different places.

Then send the files (upload, Drive link or file path). Next step on this side: \`scripts/depth.mjs\` makes a depth map for each, and the page is built with \`assets/cinematic/\`.
`;

if (flags.out) { fs.writeFileSync(flags.out, md); console.log(`Wrote ${flags.out}: hero${shots > 1 ? ` + ${shots - 1} journey frames` : ''}${spec.layers ? ' + layers' : ''}${sections.length ? ` + ${sections.length} section stills` : ''}.`); }
else process.stdout.write(md);
