# Remotion kit

`assets/LaunchKit.tsx` (components) and `assets/Examples.tsx` (three full compositions) are tested on Remotion 4.0.530: strict typecheck, bundle, and rendered stills. Remotion mechanics (renders, Studio, captions, upgrades) are covered by the official skills — install them in the project too.

## Setup (Claude Code does this itself)

`node <skill>/scripts/adkit.mjs init .` builds everything below automatically (pinned Remotion, kit, tools, bundled Inter font, free Python tools, test frame). The manual steps are kept for reference.

## Manual setup

```bash
npx create-video@latest --yes --blank my-ad && cd my-ad
npx remotion skills add            # official Remotion agent skills
npm i @remotion/google-fonts
cp <skill>/assets/*.tsx <skill>/assets/example-ad.json src/   # and set "resolveJsonModule": true in tsconfig
# src/index.ts:  import {registerRoot} from 'remotion'; import {RemotionRoot} from './Examples'; registerRoot(RemotionRoot);
npm run dev                        # Studio: pick BrandFilm / ShowcaseReel / HybridAd
npx remotion render BrandFilm out/brand.mp4 --codec=h264 --crf=18
```
Assets go in `public/` and are referenced with `staticFile('clips/rocket.mp4')`.

## Components

| Component | Key props | Notes |
|---|---|---|
| `Hook` | `src, text, dur, grade` | Full-bleed footage + bold claim in the top third |
| `Footage` | `src, kind, dur, aspect, fullBleed, grade, push, fade, trimBefore, label` | Letterboxed band by default (16:9 in a 9:16 frame — the brand-film look). `grade`: `bw` `warm` `cool` `natural` `none`. Empty `src` = labelled placeholder |
| `Caption` | `text, dur, top, size` | The tiny understated caption. `top='66%'` under UI cards, `'49%'` for outro lines |
| `WordCaptions` | `words: {text,startMs,endMs}[], maxWords, top, highlight` | TikTok-style: 1–3 words, active word highlighted, breaks on pauses |
| `KineticWord` | `text, dur, size, italic` | One huge word per beat for footage-free ads |
| `BigStat` | `to, decimals, prefix, suffix, dur` | Counts up over footage |
| `Odometer` | `value, label, dur` | Rolling digits; auto-fits the roll inside `dur` and holds the final number |
| `ChartDraw` / `TypingField` / `ClickButton` | see file | Product UI moments; `UIReveal` wraps any custom card |
| `Glitch` | `at: frame[]` | Slice-shift burst on specific frames (hit a VO word) |
| `Strobe` | `srcs, framesEach` | 2–4-frame flicker montage between sections |
| `LogoMark` | `dur, size` | Bracket mark that spins and snaps; replace with the real logo SVG |
| `SiteShowcase` | `src, url, title, subtitle, dur` | Screen recording in a browser frame + caption boxes |
| `Sfx` | `src, at, volume` | Sound effect at a frame offset inside a beat |
| `SafeZones` | — | Red overlay of platform UI areas; shows in Studio only, never renders |

## Data-driven ads (what automation uses)

`JsonAd.tsx` renders any ad from a JSON spec: `npx remotion render Ad out/ad.mp4 --props=ad.json`. Beat types: `hook`, `footage` (with optional `stat` counter and `glitchAt`), `strobe`, `kinetic`, `odometer`, `chart`, `typing`, `click`, `site`, `text` (caption-only outro line), `logo`, `blank`. Top level: `voiceover`, `music`, `musicVolume`, `words` (word timings → TikTok captions), `sfx`, `fps/width/height`. Paths are relative to `public/`. See `assets/example-ad.json`.

## Editing an example

Each composition is a `Beat[]`: `{dur, caption?, captionTop?, render: (dur) => node}`. Reorder, retime and swap `render` — that's the whole edit. Total duration is computed from the beats.

## Rebuild the product UI in code

For the "product moment" beats, recreate the user's real UI as small React components (their actual labels, numbers, colors) and wrap in `UIReveal`. Code UI stays sharp at any zoom and each element can animate (typing, a toggle flipping, a number updating, a cursor path). Screenshots only as a last resort, and then full-res with a slow push-in.

## Pro touches

- Motion blur on fast moves: `@remotion/motion-blur` (`<CameraMotionBlur>`), used sparingly.
- Transitions: hard cuts are the default; `@remotion/transitions` (fade/slide/wipe) only between sections.
- Grain + vignette are built into `Footage`; keep them on for mixed-source footage.
- Fonts: the kit loads Inter from `public/fonts/Inter.woff2` with `@remotion/fonts` (offline-safe; `adkit init` puts it there). For a brand font, drop its .woff2 in `public/fonts/` and change the `loadFont` call + `theme.font`.
- 60 fps only for UI-heavy demos; 30 fps for everything else.

## Rendering troubleshooting

- Missing assets fail the render: keep placeholders until every `staticFile` exists.
- Long renders: `--concurrency=50%`; check a frame first with `npx remotion still <Id> out/f.png --frame=120`.
- Colour looks flat after upload: render with `--crf=16` and let the platform re-encode; don't upscale 720p footage.
