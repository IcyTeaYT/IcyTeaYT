---
name: reference-to-ui
description: Build or rebuild a UI from a reference (screenshot, URL, Figma export, or the project's own brand assets) and verify it visually against that reference. Use when the user says "copy this UI", "make it look like this", "screenshot to code", "build this from this example", or when a UI keeps coming out generic. Works in a render-compare loop instead of guessing.
---

# reference-to-ui

Goal: the result looks like the reference (or like the project's own identity), not like a template. You verify by rendering and comparing, never by eyeballing the code.

## 0. Pick the mode

- **Clone**: user gave a screenshot/URL and wants it matched. Fidelity is the goal.
- **Inspired-by**: user gave an example for feel. Match structure, density, type scale and mood; do not copy branding or text.
- **Brand-first**: no reference, only the project. The reference is the project's own assets (logo, colours, photos, real copy). Find them first.

If the mode is unclear, ask one question. Otherwise pick and say which.

## 1. Gather the reference (before writing any code)

- Screenshot: read it at full size. Also request a mobile one if layout on phones matters.
- URL: open it with `playwright-cli` (or Playwright) at 1440x900 and 390x844, take screenshots, and pull real values: `getComputedStyle` for font-family, font-size, line-height, colours, spacing, border-radius, shadows. Prefer measured values over estimates.
- Brand-first: list the project's real logo files, colours, photos and copy. These are the design system. Anything the project already owns beats anything you invent.

## 2. Write a spec in plain text (short)

Before coding, write down:
1. **Layout skeleton**: sections top to bottom, grid columns, max width, section heights.
2. **Tokens**: colour palette (hex), type scale (family/size/weight/line-height), spacing scale, radius, shadow. Mark each `measured` or `estimated`.
3. **Components**: each distinct component and its states.
4. **Assets needed**: images, icons, fonts. Mark which you have, which are placeholders, which are substitutions (e.g. paid font to closest free font; say which).
5. **Unknowns**: hover, motion, responsive behaviour. State the guess.

## 3. Build

- Use the project's existing stack. Put tokens in one place (CSS variables or the Tailwind theme) and reference them; no magic numbers scattered through components.
- Build the skeleton first with real spacing and type, then components, then polish. Do not add effects the reference does not have.
- Use real content from the project. Never invent statistics, status, testimonials, user counts, or fake dashboards. If content is missing, use an honest placeholder or leave the section out.

## 4. Render-compare loop (mandatory)

1. Serve the page and screenshot it at the same viewport as the reference.
2. Put the two side by side. For clone mode, also run a pixel diff (e.g. `pixelmatch` or Playwright's `toHaveScreenshot` against the reference image) and look at where the diff clusters.
3. List the 3 biggest differences, fix them, re-render. Repeat until the remaining differences are only the declared unknowns/substitutions.
4. Check mobile (390 wide): no horizontal scroll, readable text, tap targets about 44px, nothing hidden that should show.
5. Never gate visibility on a scroll observer without a fallback (content must show if the observer never fires).

Show the user the final side-by-side image, and list what is intentionally different.

## 5. Anti-template rules (these caused a failed build before)

Do not stack decoration. The usual offenders, all banned unless the reference has them:
- glass "EST. 20XX" pills, numbered eyebrows above headings, gradient text
- dot grids with cursor spotlights, multiple glow blooms, particle canvases
- tilted marquees, spotlight borders, bento grids with fake product UI
- giant gradient footer wordmarks, initials-on-gradient avatars
- the same sentence (motto, purpose) repeated in several sections

Swap test: if replacing the project name with another name would still make the page work, it is too generic. Fix it by using the project's own colours, logo shapes, photos, and real artefacts as the visual system.

One light source, one accent system, one type pairing. Restraint reads as expensive.

## 6. Finish

- Report: mode used, what matched, what is substituted or guessed, and anything the user must supply (fonts, images, copy).
- Keep screenshots (reference, result, diff) in a scratch folder, not committed, unless asked.
