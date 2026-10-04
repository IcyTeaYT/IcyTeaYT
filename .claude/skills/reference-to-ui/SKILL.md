---
name: reference-to-ui
description: Build, rebuild or restyle any UI (website, landing page, app screen, component, scroll/GSAP motion site) from real examples, pulling in every installed design skill (ui-ux-pro-max, GSAP patterns, awesome-design-md, awesome-claude-design, Refero styles, design-motion-principles, taste/soft/minimalist/brutalist, ui-styling) so it never looks AI-generated. Use whenever the user asks to build or redesign a UI, says "make it similar to this", "copy this UI", "make it look like this", "screenshot to code", "use this as an example", "animations like this", "it looks AI generated", or shares a screenshot, URL, screen recording or video of a design. The example always leads; the other skills fill gaps. Makes cinematic scroll sites without video tools: writes ChatGPT/Nano Banana image prompts, turns the stills into 3D camera journeys with depth maps and living atmosphere, with procedural shader scenes as backup. Proves the result with bundled capture, compare, record and slop-check scripts.
---

# reference-to-ui

You are the conductor. **The example leads; every other design skill plays under it.**

- **No example, no UI.** Every visual and motion decision traces back to a real example: a screenshot, live site, screen recording, Refero style, brand DESIGN.md, or the project's own brand assets. Never "what a modern website looks like".
- **Other skills fill gaps, never override.** `ui-ux-pro-max`, the GSAP guide, the style skills and the brand libraries supply what the example does not show (states, mobile, accessibility, free font substitutes, motion code). If a skill's rule contradicts the example, the example wins.
- **Precedence:** the user's words > the example > the project's existing design system > skill suggestions.
- **Done means proven:** the scripts below say it matches and is clean, not "it looks right".

Read these as you need them (all in this skill folder):

| File | Read when |
|---|---|
| `references/skill-router.md` | Step 1 and 3: which installed skill to use for what, with exact commands |
| `references/sources.md` | No example given, or the user mentions Refero, Godly or a gallery |
| `references/gsap.md` | The example has scroll, pinned, scrubbed or animated motion |
| `references/cinematic.md` | **Any cinematic / scroll-film site** ("like Vela", "cinematic", "scroll story"): sources, laws, plan, copy rules, self-test, publishing |
| `assets/cinematic/` | The engine: `cinema.js` + `cinema.css` (stills + depth maps → 3D camera journey with atmosphere and paced captions), `cinema-shaders.js` (backup scenes: clouds, ocean, aurora, liquid, silk), `example.html` |
| `assets/scroll-sequence/` | Scroll-scrubbed real footage (dependency-free player + page template) |
| `references/higgsfield.md` | Optional: only if the user wants AI-generated video and has a Higgsfield account |

## Scripts (`<skill-dir>/scripts/`)

Node 18+ and Playwright (project install, else global) for `.mjs`; `ffmpeg` and `python3` for `.sh`. **First use on a machine:** `bash <skill-dir>/scripts/doctor.sh` (add `--install` to install what is missing).

| Script | Does |
|---|---|
| `node capture.mjs <url\|file> <out>` | Screenshots (1440 desktop, 390 mobile, full page + fold) and `tokens.json` of measured fonts, sizes, colours, spacing, radii, shadows, sections |
| `bash video-ref.sh <video> <out>` | Video example → `sheet.png` (16 timestamped frames), `keys/` (frame at each change), `motion.txt` (when motion starts, peaks, settles) |
| `bash frames.sh <video> <out> [--fps N --start S --end S --crop-x 0.5]` | Clip → WebP sequences for scroll-scrubbing: `lg/` native res and fps, `sm/` portrait crop for phones |
| `node compare.mjs <ref.png> <url\|file> <out> [--width N] [--fold]` | Build vs reference: `side-by-side.png`, `diff.png` (red = differs), mismatch % and worst bands |
| `node record.mjs <url\|file> <out> [--scroll] [--seconds 8] [--mobile] [--selector .x]` | Records the build (scrolling or playing) to mp4 for comparing against a video example |
| `node slop-check.mjs <url\|file> [--allow rule,...]` | Flags AI-template patterns; exits 1 on any HIGH. Mark real footage canvases with `data-media` |
| `node higgsfield-prompts.mjs --subject ... --camera dolly-in --use scroll --text left --out PROMPTS.md` | Writes a Higgsfield prompt sheet: start-frame image prompts (16:9 + 9:16), image-to-video prompts for Kling, Higgsfield presets, Veo, Seedance/Hailuo/Wan, negative prompt, settings, variations. `--help` for all fields |
| `node image-prompts.mjs --subject ... --shots 3 --journey "..." --text left --palette "#..,#.." [--layers true] [--sections "a,b"] --out IMAGE-PROMPTS.md` | Writes ChatGPT / Nano Banana prompts: hero (16:9 + 9:16), consistent journey frames as edits of the previous image, optional layers and section stills, all composed for depth moves |
| `node prepare-film.mjs <out> shot1.png [shot2.png] [--phone a.png,-] [--focus "x,y;x,y"]` | **Use for every cinematic build.** Full-resolution desktop + 9:16 phone WebPs, high-quality depth maps for both, a resolution report, and the `shots` config |
| `node depth.mjs <image> [out.png] [--quality high\|fast]` | Depth map (white = near) with the free Depth Anything V2 model in headless Chromium; no Python, no key; about 20 s |
| `bash doctor.sh [--install]` | Checks Node, Playwright, Chromium, ffmpeg, python3; prints or runs the install commands |

Keep captures, recordings and frames you are not shipping in a scratch folder, never committed unless asked.

## Step 1: Get the example (blocking)

Use the first that applies (details in `references/sources.md`):

1. **Screenshot/image:** read it at full size. Measure from pixels: content width, gutters, section heights, type sizes against known elements.
2. **URL:** `capture.mjs`. Use measured values; never estimate what was measured. Click through menus or hover states with `playwright-cli` if the example's interactions matter.
3. **Video** (`.mov`, `.mp4`, screen recording, reel): `video-ref.sh`, then read `sheet.png`, the key frames and `motion.txt`. Write down what moves, in what order, how far, for how long, with what easing. Note whether motion is footage (a video playing or scrubbing), UI animation, or both. Footage is not code: it needs real visuals. Ask for the user's own footage or photos first; if they have none, follow `references/cinematic.md` (AI stills from ChatGPT or Nano Banana brought to life in code, shader scenes as backup).
4. **Brand name** ("like Stripe"): `awesome-design-md/design-md/<brand>/`. **Aesthetic family** ("editorial", "cinematic", "brutalist"): `awesome-claude-design/design-md/<family>/`.
5. **Refero:** use the style DESIGN.md or original site URL the user gives, or the Refero MCP if connected. **Never crawl Refero**; its robots.txt blocks AI agents.
6. **Nothing:** ask for 1 to 3 examples and offer 2 or 3 named options from the brand libraries. Do not invent a look.

Also always collect the **project's own assets**: logo, colours, photos, real copy, names, dates, links, footage.

Pick the mode and tell the user in one line:
- **Clone:** match the example as closely as possible.
- **Adapt** (default for "make it similar to this", "use this as an example"): the example's layout, rhythm, type scale, density, motion and mood, with the project's content and identity.

If you clone a real brand, swap its name, logo and proprietary imagery for the user's (or a clearly fictional) brand, and say so.

## Step 2: Spec (before code)

Write `SPEC.md` in the scratch folder. Short and concrete:

1. **Sections** top to bottom with heights and grid (columns, max width, gutters), from the example.
2. **Tokens** with exact values (colours with roles, font families, type scale, spacing, radius, shadow). Mark each `measured`, `from screenshot`, `from video`, `from DESIGN.md` or `from brand`.
3. **Motion timeline** (if any): trigger (load, scroll, hover), what moves, from/to, duration or scroll distance, easing. From `video-ref.sh` output or the live site.
4. **Components** and states.
5. **Gaps the example does not cover** (mobile nav, empty/error states, footer, focus states) and which skill fills each. Run `ui-ux-pro-max` here (see `references/skill-router.md`):
   - `--domain google-fonts` / `typography` for free substitutes of paid fonts in the example
   - `--domain ux` for forms, focus, contrast, touch targets
   - `--domain gsap` for the preset nearest the example's motion
   - `--domain landing` only for sections the example lacks
6. **Assets:** have / placeholder / substituted (name both fonts). Missing images get a neutral, labelled placeholder, never a decorative gradient.
7. **Copy:** real text for every block, or a list of what the user must supply. Never invent stats, testimonials, user counts, status badges or fake product UI.

## Step 3: Build

- Use the project's stack and conventions (`ui-styling` for React + Tailwind/shadcn). All tokens in one place (CSS variables or Tailwind theme); nothing off-spec.
- Order: tokens → skeleton with real section heights → typography → components → motion.
- **Style skills** (`soft-skill`, `minimalist-skill`, `brutalist-skill`, `taste-skill`, `gpt-tasteskill`): only when the example belongs to that family. Take their craft rules, not their layout mandates (see the router).
- **Motion:** implement from `references/gsap.md` (scroll, pin, scrub, image sequence, text reveal) and `design-motion-principles` Create mode (hover, micro-interactions, enter/exit). Match the example's measured timing. Hidden start states are set from JS, so content shows if scripts fail. Respect `prefers-reduced-motion`.
- **Cinematic sites** (a scroll film like Vela, a journey through a place, a hero that feels like a movie): follow `references/cinematic.md`. In short:
  1. Plan the page and the beat map first (`PLAN.md`), with copy in the customers' own words and one call to action.
  2. Visuals in this order: the user's own footage or photos → AI stills (`image-prompts.mjs` → user generates in ChatGPT or Nano Banana → `depth.mjs`) → a shader scene (`clouds`, `ocean`, `aurora`, `liquid`, `silk`) as backup or placeholder.
  3. Assets: `prepare-film.mjs` (never hand-resize). Hold the **quality floor** in `references/cinematic.md`: 3840 px desktop sources, 9:16 phone versions, native-density rendering, subtle effects, and 1:1 crops checked at deviceScaleFactor 3.
  4. Build with `assets/cinematic/` (copy `cinema.js`, `cinema.css`, and `cinema-shaders.js` if a shader scene is used; config documented in `cinema.js`, working page in `example.html`). Keep camera moves inside the ranges in the laws.
  5. While waiting for images, build everything else with a shader scene in the film slot, then swap in the stills.
  - Never prompt for real brands, logos, celebrities or named products; logos go on the page, not in images.
- **Footage build:** `frames.sh` at native resolution and fps (never below 18fps or 1600px for desktop, or it looks blurry and stepped); separate portrait crop for phones; `assets/scroll-sequence/player.js` (progressive loading, first frame immediately, reduced-motion fallback). For `loop`/`play` clips use `<video autoplay muted loop playsinline poster>` with a compressed MP4.
- Never gate visibility on an observer without a fallback.
- Mobile: no horizontal scroll, body text 16px+, tap targets about 44px, nav reachable.

## Step 4: Prove it (mandatory loop)

Serve locally (dev server, or `npx http-server`). Then:

1. **Static match:** `compare.mjs` against each reference screenshot (desktop, and mobile if you have one). `--fold` for first-screen-only in adapt mode.
2. **Motion match** (if the example moves): `record.mjs --scroll` (or play), then `video-ref.sh` on the recording. Compare its `sheet.png` with the example's: same order of events, similar timing, same easing feel.
3. Look at the images. List the three biggest differences: layout and proportions first, then type, then colour, then motion timing, then details. Fix, rerun, repeat.
4. `slop-check.mjs`: fix every HIGH. `--allow` only what the example itself has, and tell the user.
5. **UX pass:** 3 to 5 `ui-ux-pro-max --domain ux` queries for what you built; fix what applies. For motion-heavy pages, `design-motion-principles` Audit mode.
6. **Interaction pass:** click every control in a real browser (Playwright): menus, forms, carousels, modals, toggles. Zero console errors.

Stop when:
- **Clone:** remaining differences are only declared substitutions (fonts, images, brand). Mismatch under about 10% for identical content; with substituted images, judge the side-by-side.
- **Adapt:** same structure, proportions, type scale, density, motion and mood; real content throughout.
- Both: slop-check exits 0 (or only allowed findings), mobile checked, interactions work.

Never say it matches unless the last compare/record run shows it.

## Step 5: Hand over

- Send the user the final side-by-side image(s) and, for motion, the recording. If footage is still pending, send `PROMPTS.md` and say exactly what to send back.
- Give them a way to open it: a published preview link when the session can publish one, otherwise the exact command to serve it locally.
- Report in a few lines: example used, mode, which skills contributed what, what matches, what is substituted or guessed and why, and what they need to provide (fonts, photos, footage, copy).

## Never (unless the example has it)

These made a past build in this repo fail review ("swap the name and it launches any startup"):

- Glass pills like "EST. 2026", numbered or uppercase eyebrows above every heading
- Gradient text, several glow blobs, dot grids with cursor spotlight, particle canvases, grain + noise + blur stacked
- Tilted or infinite marquees, spotlight-border cards, bento grids of fake dashboards
- Giant gradient footer wordmark, initials-on-gradient avatars
- The same motto or purpose sentence in several sections
- Invented numbers, statuses or quotes
- Motion everywhere: animating every section because a skill says "static is forbidden"

Per-section tests:
- **Reference test:** point to where in the example this choice comes from. If you cannot, remove it.
- **Swap test:** replace the project name with another. If the section still works unchanged, bring in the project's own colours, imagery or artefacts.
- **Restraint:** one light source, one accent system, two type families at most, one signature motion moment.
