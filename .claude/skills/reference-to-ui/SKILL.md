---
name: reference-to-ui
description: Build, rebuild or restyle any UI (website, landing page, app screen, component) from real examples so it never looks AI-generated. Use whenever the user asks to build or redesign a UI, says "copy this UI", "make it look like this", "screenshot to code", "use this as an example", "it looks AI generated", or shares a screenshot or URL of a design. Requires a reference before coding, then proves the result with bundled capture, compare and slop-check scripts.
---

# reference-to-ui

The rule: **no reference, no UI.** Every visual decision comes from a real example (a screenshot, a live site, the project's own brand assets, or a real brand system), never from "what a modern website looks like". Templates come from defaults; references kill defaults.

The work is done when the bundled scripts say so, not when the code "looks right".

Scripts live in `<skill-dir>/scripts/` (Node 18+, Playwright; they use the project's Playwright, else the global one):

| Script | What it does |
|---|---|
| `node capture.mjs <url\|file.html> <outDir>` | Screenshots desktop (1440) and mobile (390), full page and fold, and writes `tokens.json`: measured fonts, type sizes, weights, line heights, colours, backgrounds, borders, radii, shadows, gaps, paddings, max widths, every heading's styles, and the section layout with heights. |
| `node compare.mjs <ref.png> <url\|file.html> <outDir> [--width N] [--fold]` | Renders the build at the reference's width, writes `side-by-side.png`, `diff.png` (red = differs), `summary.json` with mismatch % and the worst 100px bands. Handles retina screenshots. |
| `node slop-check.mjs <url\|file.html> [--allow rule,rule]` | Scans the rendered page on desktop and mobile for AI-template patterns. Exits 1 on any HIGH finding. |

Keep all captures in a scratch folder (scratchpad, or `.ref/` added to `.gitignore`). Never commit them unless asked.

## Step 1: Get the reference (blocking)

Work out which of these you have, in this order:

1. **User gave a screenshot or image**: that is the reference. Read it at full size. If only desktop was given and mobile matters, design mobile from the same tokens.
2. **User gave a URL**: run `capture.mjs` on it. Use the measured `tokens.json` values; do not estimate what was measured.
3. **User gave a vibe or brand name** ("like Linear", "Apple-style"): open the matching file in the `awesome-design-md` skill (`.claude/skills/awesome-design-md/design-md/<brand>/`) and treat it as the design system.
4. **Nothing given**: do not invent a style. Ask the user, in one message, for 1 to 3 sites or screenshots they like, and offer 2 or 3 concrete options from `awesome-design-md` that fit the project. While waiting, collect the project's own assets (step 2). Only proceed without an external reference if the user says to, and then the project's own brand assets are the reference.

Always also collect the **project's own assets**: logo files and their colours, photos, real copy, real names, real dates, real links. With an external reference, the reference supplies layout, rhythm, type and density; the project's assets supply colour, imagery and words. If they clash, keep the reference's structure and the project's identity.

Decide the mode and tell the user in one line:
- **Clone**: match the reference as closely as possible (layout, type, colour, spacing).
- **Adapt**: take the reference's structure, type scale, spacing and feel, applied to this project's content and brand. This is the default when the user says "use it as an example".

## Step 2: Write the spec (before code)

Write `SPEC.md` in the scratch folder. Keep it short and concrete:

1. **Sections**, top to bottom, with the reference's height for each (from `tokens.json` sections, or measured off the screenshot) and its grid (columns, max width, gutters).
2. **Tokens** with exact values: background, surface, text, muted text, one accent (two at most), border; font families; a type scale (size/weight/line-height/letter-spacing for display, h1, h2, h3, body, small, label); spacing scale; radius; shadow. Mark each `measured`, `from screenshot`, or `from brand`.
3. **Components** and their states (nav, buttons, cards, inputs, footer).
4. **Assets**: what exists, what is a placeholder, what is substituted. A paid font gets the closest free match (name both). Missing images get a neutral, honestly labelled placeholder, never a decorative gradient.
5. **Copy**: the real text for every block. If the project does not have it, list what the user must supply. Never write filler stats, testimonials, user counts, "Live" badges, or fake product UI.

## Step 3: Build

- Use the project's existing stack and conventions. Put every token in one place (CSS variables or the Tailwind theme) and reference only tokens. A colour or size that is not in the spec does not go in.
- Build in order: tokens, page skeleton with real section heights and spacing, typography, components, then any motion. Motion only if the reference has it, and content must render fully with motion disabled.
- Never gate visibility on an IntersectionObserver or `whileInView` without a fallback. Text must be visible if the observer never fires.
- Mobile: no horizontal scroll, body text 16px or larger, tap targets about 44px, nav reachable.

## Step 4: Prove it (mandatory loop)

Serve the build locally (the project's dev server, or `npx http-server` for static files). Then:

1. `compare.mjs` against each reference screenshot (desktop, and mobile if you have one). Use `--fold` to compare just the first screen when the page lengths are meant to differ (adapt mode).
2. Open `side-by-side.png` and `diff.png` and look at them. List the three biggest differences in order: layout and proportions first, then type (size, weight, line height, font), then colour, then details.
3. Fix those three, rerun, repeat.
4. Run `slop-check.mjs`. Fix every HIGH finding. A finding may only be `--allow`ed if the reference itself has that pattern; say so to the user.

Stop when:
- **Clone**: the differences in the side-by-side are only the declared substitutions (fonts, images). As a guide, full-page mismatch under about 10% for the same content; look at the worst bands, not just the total.
- **Adapt**: the side-by-side shows the same structure, proportions, type scale, density and mood, and every section uses the project's real content.
- Both: `slop-check.mjs` exits 0 (or only allowed findings), mobile checked.

Do not stop early because it "looks close". Do not tell the user it matches unless the last compare run shows it.

## Step 5: Hand over

Send the user the final `side-by-side.png` (and mobile). Report in a few lines: the reference used, the mode, what matches, what is substituted or guessed (with why), and what they need to provide (fonts, photos, copy).

## Never (unless the reference has it)

These are what made a past build in this repo fail review ("swap the name and it launches any startup"):

- Glass pills like "EST. 2026", numbered or uppercase eyebrows above every heading ("01 / About")
- Gradient text, several glow blobs, dot grids with cursor spotlight, particle canvases, grain plus noise plus blur stacked together
- Tilted or infinite marquees, spotlight-border cards, bento grids filled with fake dashboards
- Giant gradient wordmark in the footer, initials-on-gradient avatars
- The same motto or purpose sentence in several sections
- Invented numbers, statuses or quotes

Tests to run in your head on every section:
- **Swap test**: replace the project name with any other. If the section still works unchanged, it is generic. Bring in the project's own colours, logo shapes, photos or real artefacts.
- **Reference test**: point to where in the reference this choice comes from. If you cannot, remove it.
- **Restraint**: one light source, one accent system, one type pairing (two families at most).
