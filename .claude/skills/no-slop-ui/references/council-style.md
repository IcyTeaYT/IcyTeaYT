# The Council style

The default direction, taken from the TIS Tech Council site (tistechcouncil.pages.dev): a dark, motion-rich site in the spirit of Linear, Vercel and Apple, built with Motion and Lenis. What the live site's metadata shows: pure `#000` theme colour, dark colour scheme, proper description / Open Graph / Twitter card, `viewport-fit=cover`, a no-JavaScript message, and copy that is plain and specific ("Student-built tech for a smarter, more connected TIS." / "Share your idea."). If screenshots or the repo are available, match them over anything here.

## Tokens

| Token | Value | Use |
|---|---|---|
| bg | `#000` | Page. Pure black, not a tinted near-black |
| fg | `#fff` | Headings, primary text, primary button fill |
| fg-2 | white 72 % | Body copy |
| fg-3 | white 52 % | Secondary text (still ≥ 4.5:1 on black) |
| fg-4 | white 34 % | Placeholders, decoration only |
| surface-1/2/3 | white 3 / 5.5 / 8.5 % | Elevation by luminance: panel → hover → active |
| line / line-strong | white 9 / 16 % | Hairlines, dividers, focus-within |
| edge-top | white 20 % | Light catching the top edge of raised things |
| accent | `#fff` | Replace only with a colour from the subject (brand, product, meaning) |
| radius | 6 · 10 · 14 · 22 · 32 · pill | Buttons pill, inputs 14, panels 22, hero media 32. Nested radius = outer − padding |
| ease | `cubic-bezier(.22,1,.36,1)` | All entrances and UI transitions |

`assets/base.html` (single file) and `assets/react/tokens.css` (Tailwind v4) implement these.

## Type

One family is enough. Choose per brief; don't use the same one on every project.

| Family | Feels like | Use when |
|---|---|---|
| Geist (default) | Engineered, Vercel | Tech, tools, councils, dev products |
| Inter Tight / Inter Display | Precise, Linear | Dense product UI, dashboards |
| Instrument Sans | Warmer, rounder | Education, community, consumer |
| Schibsted Grotesk / Hanken Grotesk | Editorial-leaning grotesk | Media, portfolios |
| Onest | Friendly, Cyrillic-ready | Uzbek/Russian + English sites |
| Instrument Serif / Newsreader | Editorial serif | Only as whole display lines, never one accented word |

- Weights: 500 for display and headings (heavy weights at huge sizes look cheap), 400 body, 500 UI.
- Tracking tightens as size grows: display −0.055em, h1 −0.045em, h2 −0.035em, h3 −0.02em, body 0, small +0.005em.
- Line height: display 0.92, h1 0.98, h2 1.05, body 1.55. Body measure ≤ 62ch; lead ≤ 38ch.
- `text-wrap: balance` on headings, `pretty` on paragraphs. Tabular numerals for data.
- Sentence case everywhere. No tracked ALL-CAPS labels.

## Light and material

Depth comes from light, not grey shadows (shadows are invisible on black and read as template chrome).
- **Edge**: a 1px gradient border, bright at the top and fading down — things look lit from above (`.edge`).
- **Spot**: the edge and surface brighten under the cursor (`.spot` + pointer tracking). For things people act on.
- **Glow-top**: a soft light source above a section. Once or twice per page.
- **Grain**: 3–4 % noise over everything to stop gradient banding.
- **Lit text**: a white→55 % vertical fade on one display line at most.
- Overlays (nav, sheets): black 60 % + 14px blur + hairline. Glass only there.

## Composition patterns (ideas, not templates)

Pick per section from what the content is. Never repeat the same pattern twice in a row.

1. **Statement + instrument** — big heading left, a working piece of the product right (a form, a live search, a mini dashboard). The hero *does* something.
2. **Index list** — rows separated by hairlines with a status on the right, instead of a card grid. Scans faster, looks editorial.
3. **Sticky title + steps** — heading sticks while numbered steps scroll. Only for real sequences.
4. **Product frame** — the real UI rebuilt in HTML inside a large rounded frame; one scroll-linked zoom or state change.
5. **Proof line** — one real number with the sentence that makes it matter. Not a row of four stats.
6. **Full-bleed band** — one photo/video edge to edge, graded to match, no text on busy areas.
7. **Closing ask** — one sentence, one button, generous space. The same verb as the hero CTA.

Alignment: left-aligned by default; centre only short, symmetric moments (closing ask). Use the 12-column grid asymmetrically (7/5, 5/7, 8/4 with an empty column).

## Colour for meaning

Colour appears only when it carries information: status dots (amber = testing, green = shipped, red = problem), the brand's own colour inside its product visuals, charts. Keep dots small and pair them with text.

## Imagery

Real photos (campus, people, product) graded consistently; product UI rebuilt in code; diagrams drawn for the subject. No stock high-fives, no abstract 3D blobs, no random gradient meshes.

## Other directions

If the brief asks for light, playful, editorial or brand-led design, keep the loop, the slop rules and the quality floor, but derive new tokens from the subject: its materials, vernacular and existing brand. Light Council variant: `#fff` bg, black alpha surfaces and lines, same type and motion rules (`:root[data-theme="light"]` in base.html).
