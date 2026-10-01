---
name: no-slop-ui
description: Design and build interfaces that look made by a senior designer, not generated. The TIS Tech Council standard — pure-black canvas, light as material, precise type, real content, one orchestrated motion moment, Motion + Lenis smooth scroll, Linear/Vercel/Apple-level craft. Use for ANY website, landing page, portfolio, club or startup site, web-app screen, dashboard, form, component or HTML artifact; whenever the user says premium, clean, modern, sleek, like Apple or Linear or Vercel, no AI slop, or make it look good/better; and when reviewing or fixing UI that looks generic or templated. Includes a slop linter and a screenshot QA tool.
---

# No-slop UI

The bar is the TIS Tech Council site: dark, precise, calm, motion that feels expensive, copy that says exactly what it means. Slop is what you get when every decision is the first one that comes to mind. This skill makes each decision on purpose, then proves it with a linter and screenshots.

## The loop (every time, even for "quick" pages)

1. **Understand.** One sentence each: what it is, who it's for, the one action that matters. Collect real content: name, one-line pitch, real proof (projects, numbers, people), real assets. Ask at most one question; otherwise make sensible assumptions and say them.
2. **Plan before code.** Write a short design plan:
   - tokens: palette as hex (4–6), type family + roles, radius/spacing scale
   - an ASCII wireframe of the hero + the next two sections, each using a different composition pattern (`references/council-style.md`)
   - the one signature moment (what someone will remember)
   - what you are deliberately *not* doing
3. **Slop-review the plan.** For each decision ask: is this the default anyone would produce for a similar prompt? Check it against `references/slop-blacklist.md`. Change what matches; note the change in one line.
4. **Build with the kit** — `assets/base.html` for single files and claude.ai artifacts, `assets/react/` for projects (React/Next + Tailwind v4 + Motion + Lenis). Compose sections from the plan; never ship placeholder sections.
5. **Lint.** `python3 scripts/slop_check.py <file or src/>` — fix every ERROR and WARN, or state why the brief wants it.
6. **Look at it.** `node scripts/screenshot.mjs <file.html | http://localhost:5173> shots` → open the 390px and 1440px screenshots; fix overflow, cut-off text, tiny tap targets, console errors. If Playwright is missing, install it yourself (`npm i -D playwright && npx playwright install chromium`) — don't ask the user to. Only if no browser can run at all, say the page wasn't visually verified.
7. **Polish.** Run the tests in `references/review.md` (swap test, squint test, remove one accessory), re-read every line of copy against `references/copy.md`.

## The Council style (default direction)

Use it unless the brief asks for something else; details and tokens in `references/council-style.md`.

- **Pure black** (`#000`), depth from luminance — white at 3 / 5.5 / 8.5 % for surfaces, 9 / 16 % for hairlines — never grey drop shadows.
- **Light is the accent.** Edges lit from above, a cursor spotlight on things you can act on, one soft glow per section at most. Colour only when it means something (status, the brand's own product colour, data).
- **Type carries the design.** One family chosen for the brief (Geist by default), weight 500 at display sizes, tracking tightening as size grows, sentence case, ≤ 62ch body.
- **Real things instead of decoration.** The product UI rebuilt in HTML, real projects with real status, real photos, real numbers. The hero *does* something (a working form, a live demo) or shows the most characteristic thing of the subject.
- **Motion with a budget.** One orchestrated entrance (the hero), Lenis smooth scroll, 1–2 scroll moments that explain something, and crisp responses to every input (press, spotlight, sliding tab indicator). Reduced motion always respected. See `references/motion.md`.
- **Quality floor.** 360–1920px without horizontal scroll, visible focus, AA contrast, ≥ 44px touch targets, description + OG image + `theme-color`, works without JS.

For other directions (light, editorial, playful, brand-led) keep the loop, the blacklist and the floor, and derive new tokens from the subject itself.

## Never by default (full table with alternatives in references/slop-blacklist.md)

- Icon + title + two lines ×3 feature grids; equal-tile bentos; everything centred; announcement pills; fake logo walls.
- Tracked ALL-CAPS eyebrows; "01 — Section" numbering on non-sequences; one italic/gradient word in a headline; mono micro-labels; "A · B · C" meta strings.
- Purple→blue gradients, Tailwind indigo/violet, terracotta on cream, acid-green/vermilion single accents, `#0B0B0B` posing as black, blurred colour blobs.
- Same radius + soft grey shadow on every card, glass everywhere, icons in tinted circles, emoji/✨, "→" on every button.
- Fade-up on every section, hover-lift on every card, parallax for its own sake, bouncy text.
- "Unlock / Elevate / Seamless / Supercharge / Empower", "Welcome to…", "Get started today", "Learn more", lorem/Acme/John Doe.

## Kit

| File | What it is |
|---|---|
| `assets/base.html` | Single-file shell: tokens, type roles, `.edge` `.spot` `.glow-top` `.grain` `.lit`, buttons, auto-hiding nav, Lenis + Motion (pinned CDN), `data-sequence` hero entrance, `data-reveal`, cursor spotlight, reduced-motion + no-JS safety, meta tags. No sections — you compose them. |
| `assets/react/tokens.css` | Tailwind v4 `@theme` with the same tokens + `edge`, `spot`, `glow-top`, `text-lit` utilities, Lenis CSS, focus ring |
| `assets/react/*.tsx` | `SmoothScroll`, `Sequence`/`Item`/`Reveal`, `SpotlightCard`, `Button`, `Nav` (hide on scroll, sliding active pill), `Tabs` (accessible, spring indicator), `Field` (label/hint/error), `motion.ts` presets |
| `scripts/slop_check.py` | Linter for the tells above + accessibility/meta floor. `--strict` fails on warnings, `--json` for tooling |
| `scripts/screenshot.mjs` | Playwright screenshots at 390 + 1440 with QA report: overflow, off-screen elements, tiny text, small tap targets, missing alt, console/network errors. `--reduced` to check reduced motion |

React setup: `npm i motion lenis @fontsource-variable/geist` + Tailwind v4 (`@tailwindcss/vite`), import `tokens.css` and the font in the entry, wrap the app in `<MotionConfig reducedMotion="user"><SmoothScroll>…</SmoothScroll></MotionConfig>`. The kit is typechecked (React 19, motion 13, lenis 1.3) and the tokens compile with Tailwind 4.3.

## Output

- claude.ai: one self-contained HTML file built from `base.html` (published as an artifact or presented), plus a two-line summary of the design decisions.
- Claude Code / projects: components in the user's stack using `assets/react/`, then lint + screenshots before saying it's done.
- Reviews of existing UI: run the linter and screenshots on it, then give a prioritised fix list (biggest visual win first) and offer to apply it.
