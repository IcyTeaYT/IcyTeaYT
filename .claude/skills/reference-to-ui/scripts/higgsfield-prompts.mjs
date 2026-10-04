#!/usr/bin/env node
// Write a Higgsfield prompt sheet (PROMPTS.md) for one cinematic shot.
// No dependencies. See references/higgsfield.md for the workflow.
//
//   node higgsfield-prompts.mjs --spec shot.json --out PROMPTS.md
//   node higgsfield-prompts.mjs --subject "a white private jet" --setting "above a sea of clouds" \
//     --light "golden hour, low sun" --camera dolly-in --use scroll --text left --out PROMPTS.md
import fs from 'fs';

const HELP = `Usage: node higgsfield-prompts.mjs [--spec shot.json] [fields...] [--out PROMPTS.md]

Fields (flags or JSON keys):
  subject     what the shot is about, specific (required)      "a white private jet"
  setting     where it is                                        "above a sea of golden clouds"
  light       time and light                                     "golden hour, low sun behind camera"
  mood        feel                                               "calm, premium, quiet luxury"
  palette     hex colours from the page, comma separated         "#0b1020,#f2c48d"
  camera      ${'dolly-in dolly-out orbit crane-up crane-down truck-left truck-right pan-left pan-right fpv push-through static'}
  motion      what moves in the scene                            "the jet drifts forward, clouds roll slowly"
  use         scroll | loop | play   (default scroll)
  text        where page text sits: left | right | center | top | bottom | none (default left)
  duration    seconds, 5 or 10 (default: 10 for scroll, 5 otherwise)
  aspect      16:9 | 21:9 | 9:16 | 1:1 (default 16:9; a 9:16 start frame is added for phones)
  lens        e.g. "35mm anamorphic" (default chosen from camera)
  name        title for the sheet
  brand       the user's own brand name (kept out of the frame; only used in the sheet title)`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { const k = args[i].slice(2); const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'; flags[k] = v; }
}
let spec = {};
if (flags.spec) spec = JSON.parse(fs.readFileSync(flags.spec, 'utf8'));
spec = { ...spec, ...Object.fromEntries(Object.entries(flags).filter(([k]) => !['spec', 'out'].includes(k))) };
if (!spec.subject) { console.error('Missing --subject.\n\n' + HELP); process.exit(1); }

const use = (spec.use || 'scroll').toLowerCase();
if (!['scroll', 'loop', 'play'].includes(use)) { console.error(`--use must be scroll, loop or play (got "${use}")`); process.exit(1); }
const camera = (spec.camera || (use === 'loop' ? 'static' : 'dolly-in')).toLowerCase();
const text = (spec.text || 'left').toLowerCase();
const aspect = spec.aspect || '16:9';
const duration = Number(spec.duration || (use === 'scroll' ? 10 : 5));

const CAMERA = {
  'dolly-in':     { say: 'slow, steady dolly forward toward the subject at constant speed', preset: 'Dolly In', lens: '35mm' },
  'dolly-out':    { say: 'slow, steady dolly backward at constant speed, revealing more of the scene', preset: 'Dolly Out', lens: '35mm' },
  'orbit':        { say: 'slow orbit around the subject at constant speed, subject stays centred', preset: '360 Orbit (or Arc)', lens: '50mm' },
  'crane-up':     { say: 'slow crane up, rising smoothly above the subject', preset: 'Crane Up', lens: '24mm' },
  'crane-down':   { say: 'slow crane down, descending smoothly toward the subject', preset: 'Crane Down', lens: '24mm' },
  'truck-left':   { say: 'slow lateral tracking shot moving left at constant speed, foreground passing the lens', preset: 'Truck Left', lens: '35mm' },
  'truck-right':  { say: 'slow lateral tracking shot moving right at constant speed, foreground passing the lens', preset: 'Truck Right', lens: '35mm' },
  'pan-left':     { say: 'slow, smooth pan to the left across the scene', preset: 'Pan Left', lens: '35mm' },
  'pan-right':    { say: 'slow, smooth pan to the right across the scene', preset: 'Pan Right', lens: '35mm' },
  'fpv':          { say: 'smooth FPV drone flight forward with gentle banking, fluid and stable', preset: 'FPV Drone', lens: '14mm' },
  'push-through': { say: 'slow push forward through an opening into the scene beyond, constant speed', preset: 'Through Object In (or Dolly In)', lens: '24mm' },
  'static':       { say: 'locked-off static camera, no camera movement at all', preset: 'Static', lens: '50mm' },
};
const cam = CAMERA[camera];
if (!cam) { console.error(`Unknown --camera "${camera}". Options: ${Object.keys(CAMERA).join(', ')}`); process.exit(1); }
const lens = spec.lens || `${cam.lens}${camera === 'fpv' ? '' : ' cinema lens'}`;

const SPACE = {
  left: 'subject placed in the right two-thirds of the frame, calm uncluttered negative space on the left third for headline text',
  right: 'subject placed in the left two-thirds of the frame, calm uncluttered negative space on the right third for headline text',
  center: 'subject low in the frame, clean open sky or background in the upper centre for a centred headline',
  top: 'subject in the lower half, clean open upper third for text',
  bottom: 'subject in the upper half, clean darker lower third for text',
  none: 'balanced composition, subject as the clear focal point',
};
const space = SPACE[text] || SPACE.left;
const palette = spec.palette ? spec.palette.split(',').map((s) => s.trim()).filter(Boolean) : [];
// Image and video models read colour words, not hex codes.
function colourName(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (l < 0.08) return 'near-black';
  if (l > 0.93) return s > 0.3 ? 'pale cream' : 'off-white';
  if (s < 0.12) return l < 0.3 ? 'charcoal' : l < 0.6 ? 'stone grey' : 'silver grey';
  const hue = h < 15 ? 'red' : h < 40 ? 'orange' : h < 55 ? 'amber' : h < 70 ? 'golden yellow' : h < 160 ? 'green' : h < 195 ? 'teal' : h < 250 ? (l < 0.3 ? 'navy' : 'blue') : h < 290 ? 'violet' : h < 335 ? 'magenta' : 'crimson';
  const tone = l < 0.22 ? 'deep' : l < 0.4 ? 'dark' : l < 0.65 ? (s > 0.6 ? 'vivid' : 'muted') : (h >= 20 && h < 60 ? 'warm champagne' : 'soft');
  return tone === 'warm champagne' ? 'warm champagne' : `${tone} ${hue}`;
}
const paletteWords = palette.map(colourName);
const uniqueWords = [...new Set(paletteWords)].slice(0, 3);
const paletteLine = palette.length ? `colour palette of ${uniqueWords.length > 1 ? uniqueWords.slice(0, -1).join(', ') + ' and ' + uniqueWords.at(-1) : uniqueWords[0]}` : '';
const setting = spec.setting ? `, ${spec.setting}` : '';
const light = spec.light || 'soft natural light';
const mood = spec.mood || 'premium, calm, cinematic';
const motion = spec.motion || (use === 'loop' ? 'subtle, continuous ambient motion in the scene' : 'gentle natural motion in the scene');

const USE = {
  scroll: {
    why: 'Scrubbed by scroll position, so every frame is seen up close and played backwards too.',
    rules: 'one continuous shot, no cuts, no transitions, constant camera speed from first to last frame, no speed ramps, no camera shake, subject stays consistent and sharp',
    tips: ['Pick the longest duration offered (10 s is ideal; 5 s works with a shorter scroll).', 'Highest resolution and frame rate offered. Turn any "motion blur" or "dynamic" boost down if there is a choice.', 'Reject takes where the subject morphs, the camera speeds up, or a cut appears.'],
  },
  loop: {
    why: 'Plays forever behind content, so the last frame must flow into the first.',
    rules: 'seamless loop, the last frame matches the first frame, subtle cyclical motion only, no cuts, no camera movement unless it returns to the start',
    tips: ['Use the start-and-end-frame option with the SAME image in both slots.', '5 s is enough; the page loops it.', 'Keep motion subtle: clouds, water, light shimmer, steam, slow particles.'],
  },
  play: {
    why: 'Plays once as the hero video when the page loads.',
    rules: 'one continuous shot, smooth cinematic camera move, no cuts, no transitions',
    tips: ['5 s keeps the file light; 10 s if the move needs time.', 'End on a frame that works as a still: it becomes the poster image.'],
  },
}[use];

const avoid = 'text, letters, captions, logos, watermarks, brand names, cuts, scene transitions, flicker, warping, melting, morphing, distorted geometry, duplicate subjects, extra limbs, sudden speed changes, camera shake, low resolution, oversharpening';

const still = (ar) => [
  `Cinematic ${ar === '9:16' ? 'vertical ' : 'wide '}photograph, ${lens}, ${spec.subject}${setting}.`,
  `${light[0].toUpperCase() + light.slice(1)}${paletteLine ? `, ${paletteLine}` : ''}.`,
  `${ar === '9:16' ? 'Subject centred in the middle third with clean space above and below for text' : space[0].toUpperCase() + space.slice(1)}.`,
  `Mood: ${mood}. Shot on a large-format cinema camera, natural film grain, realistic materials and reflections, true-to-life scale, high dynamic range, sharp focus on the subject, ultra realistic, award-winning cinematography.`,
  'No text, no logos, no watermark.',
].join(' ');

const videoMain = `${cam.say[0].toUpperCase() + cam.say.slice(1)}. ${motion[0].toUpperCase() + motion.slice(1)}. ${light[0].toUpperCase() + light.slice(1)} stays consistent through the shot. ${USE.rules[0].toUpperCase() + USE.rules.slice(1)}. Photorealistic, cinematic, ${mood}.`;
const videoShort = `${cam.say}; ${motion}; ${use === 'loop' ? 'seamless loop' : 'one continuous shot, constant speed, no cuts'}.`;
const veo = `A single continuous cinematic shot. ${cam.say[0].toUpperCase() + cam.say.slice(1)}, filmed on a ${lens}. ${spec.subject[0].toUpperCase() + spec.subject.slice(1)}${setting}. ${motion[0].toUpperCase() + motion.slice(1)}. ${light[0].toUpperCase() + light.slice(1)}${paletteLine ? `; ${paletteLine}` : ''}. ${space[0].toUpperCase() + space.slice(1)}. The camera speed never changes and there are no cuts. No on-screen text, no dialogue, no people speaking. Mood: ${mood}.`;

// Variations: a different camera, a different light, a tighter framing.
const altCam = { 'dolly-in': 'crane-up', 'dolly-out': 'orbit', orbit: 'dolly-in', 'crane-up': 'dolly-in', 'crane-down': 'dolly-in', 'truck-left': 'dolly-in', 'truck-right': 'dolly-in', 'pan-left': 'truck-left', 'pan-right': 'truck-right', fpv: 'dolly-in', 'push-through': 'dolly-in', static: 'dolly-in' }[camera];
const altLight = /night|blue hour|dusk/i.test(light) ? 'golden hour, low warm sun' : /golden|sunset|sunrise/i.test(light) ? 'blue hour just after sunset, cool ambient light with warm practical lights' : 'golden hour, low warm sun';

const title = spec.name || `${spec.brand ? spec.brand + ': ' : ''}${spec.subject}${setting}`;
const md = `# Higgsfield prompts: ${title}

**Use on the page:** \`${use}\`. ${USE.why}
**Camera:** ${camera} (Higgsfield camera preset: **${cam.preset}**, if the model you pick offers presets).
**Duration:** ${duration} s. **Aspect:** ${aspect} for desktop${aspect !== '9:16' ? ', plus a 9:16 start frame for phones (optional)' : ''}.
**Text sits:** ${text}.${palette.length ? ` **Palette:** ${palette.map((p, i) => `${p} (${paletteWords[i]})`).join(', ')}.` : ''}

Model names on Higgsfield change. In each step pick the newest version of the model named, or the closest one listed.

---

## Step 1: start frame (image)

Higgsfield **Soul** or any photoreal image model. Aspect **${aspect}**, highest quality. Generate 4, keep the best.

\`\`\`text
${still(aspect)}
\`\`\`
${aspect !== '9:16' ? `
Phone version (optional, aspect **9:16**). Skip it if the desktop frame still works when cropped to the centre:

\`\`\`text
${still('9:16')}
\`\`\`
` : ''}
Check the image before animating: subject looks right, nothing melted or extra, the text area is clean, no text or logos crept in.

---

## Step 2: animate it (image to video)

Upload the start frame from Step 1. ${use === 'loop' ? 'Turn on **start and end frame** and put the same image in both. ' : ''}Duration **${duration} s**, highest resolution offered.

**Kling (recommended for steady camera moves)**. Prompt:

\`\`\`text
${videoMain}
\`\`\`

Negative prompt:

\`\`\`text
${avoid}
\`\`\`

**Higgsfield DoP / camera presets.** Preset: **${cam.preset}**. Prompt:

\`\`\`text
${videoShort}
\`\`\`

**Veo (best realism and light)**. Prompt (Veo has no negative prompt, so the rules are written in):

\`\`\`text
${veo}
\`\`\`

**Seedance, Hailuo or Wan.** Prompt:

\`\`\`text
${videoMain}
\`\`\`

Tips for this shot:
${USE.tips.map((t) => `- ${t}`).join('\n')}
- Generate 2 to 4 takes and send back the best one. Download the highest quality MP4 available.

---

## Variations (if the first takes miss)

**A. Different camera (${altCam}).**

\`\`\`text
${CAMERA[altCam].say[0].toUpperCase() + CAMERA[altCam].say.slice(1)}. ${motion[0].toUpperCase() + motion.slice(1)}. ${USE.rules[0].toUpperCase() + USE.rules.slice(1)}. Photorealistic, cinematic.
\`\`\`

**B. Different light (${altLight}).** Regenerate the start frame with this light line, then reuse the Step 2 prompt:

\`\`\`text
${still(aspect).replace(/^(.*?\.\s)(.*?\.)/, `$1${altLight[0].toUpperCase() + altLight.slice(1)}${paletteLine ? `, ${paletteLine}` : ''}.`)}
\`\`\`

**C. Calmer motion** (for warping or speed changes). Add to the start of the Step 2 prompt:

\`\`\`text
Very slow, minimal, perfectly smooth motion. Nothing in the scene changes shape.
\`\`\`

---

## Step 3: send it back

Send the MP4 (upload, Drive link or file path). It gets checked for cuts, warping, consistency and a clean text area, then turned into ${use === 'scroll' ? 'a scroll-scrubbed frame sequence' : use === 'loop' ? 'a looping background video' : 'the hero video'} for the page.${use === 'scroll' ? ' Frames are exported at the clip\'s native resolution and frame rate.' : ''}
If your plan adds a watermark, say where it sits so the crop or layout can avoid it.
`;

if (flags.out) { fs.writeFileSync(flags.out, md); console.log(`Wrote ${flags.out} (${md.length} chars). Camera ${camera}, use ${use}, ${duration}s, ${aspect}.`); }
else process.stdout.write(md);
