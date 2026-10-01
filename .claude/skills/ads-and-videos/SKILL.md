---
name: ads-and-videos
description: Make scroll-stopping short-form ads and videos — tech/startup brand films and launch videos built in code with Remotion (black canvas, tiny synced captions, fast B&W cuts, strobe bursts, counters, product UI with cursor clicks, logo outros), AI-generated product commercials (Seedance / Veo / Kling via Krea or Higgsfield — shot lists, start-frame + motion prompts, keeping the product identical), "tools you need" showcase reels, and talking-head hooks with TikTok-style captions. Use this whenever the user wants an ad, promo, reel, TikTok, Short, launch video, product video, client commercial, UGC-style ad, motion graphics, or shares a video and says "make one like this" — even if they don't name a tool.
---

# Ads & videos

The goal is a video people don't scroll past and that sells one idea. Tools come second: most bad ads fail on the hook, the pacing, or the sound — not the software.

## Pick the format

| Format | Looks like | Made with | Read |
|---|---|---|---|
| **Brand film / launch** | Black canvas, tiny captions, 0.4–1.3 s B&W cuts, product UI moments, logo outro | Remotion + free archival/NASA/Pixabay stock (auto-downloaded) | `references/remotion-kit.md`, `references/automation.md` |
| **AI product commercial** | "How it's made" macros → hero shot → lifestyle, all AI-generated | Free: Kling/Hailuo daily credits (checklist) + Wan 2.2 on Hugging Face (automatic) → Remotion. Paid optional: fal.ai | `references/ai-video.md`, `references/prompt-library.md`, `references/automation.md` |
| **Showcase / listicle reel** | "Cool web devs don't gatekeep… pt 5": screen recordings with caption boxes | `record_site.mjs` (auto screen capture) + Remotion `SiteShowcase` | `references/remotion-kit.md`, `references/automation.md` |
| **Hybrid** | Talking-head hook → AI or stock clips → coded end card | All of the above | both |

Every format opens with a **hook** and closes with a **CTA** — see `references/hooks-and-scripts.md`. Every format finishes in `references/edit-and-sound.md`.

## Zero-setup start (Claude Code)

Do the setup yourself; never hand the user a setup checklist.
1. If the current folder has no Remotion project, run `node ~/.claude/skills/ads-and-videos/scripts/adkit.mjs init .` (path may differ; it's this skill's `scripts/adkit.mjs`). It installs packages, copies the kit + tools into `src/` and `tools/`, bundles the font, installs the free Python tools, and renders a test frame. Re-running is safe.
2. `node tools/adkit.mjs doctor` shows what's available. Install anything missing yourself; ask once before system-level installs (Node, Python). ffmpeg is not required — Remotion's bundled copy is used automatically.
3. Optional keys go in `.env` (template in `.env.example`); everything works with no keys.

## What to ask the user for (keep it minimal)

- **Product ads: 1–2 photos, never more.** One clear photo of the whole product on a plain background in good light (phone camera, full resolution); optionally one close-up of the logo/detail. `tools/frames_from_photo.py` turns them into every start frame (macro crops, studio pedestal/spotlight/colour shots with the background removed). If it warns the photo is cut off or busy, ask for one better photo instead of using a bad frame.
- **Brand films, showcase reels: nothing.** Footage comes from free sources, websites are recorded automatically.
- **Hooks:** default to a kinetic-text hook; use a talking-head clip only if the user offers one.
- Logo SVG and music are nice-to-have; missing ones become placeholders / silence-safe edits.

## Quality is the same on free tools

Only the AI clip generator differs between free and paid; everything else is identical, and these rules keep the result at the paid level:
- **Logo and hero shots never come from the weakest model.** Use real-photo frames with a slow push-in (perfect identity, zero cost), or the free daily credits of a top model (Kling/Hailuo via `shot_cards.py`). The automatic free Wan route is for atmosphere and B-roll only.
- **Every clip is normalised** before the edit: `node tools/adkit.mjs prep` (30 fps, ≥1080p lanczos upscale, bt709).
- **Every take is reviewed** (extract a frame, look at it); reject warped logos, hands, colour drift.
- **Look before rendering:** `node tools/adkit.mjs review` renders the key frame of every beat to `review/sheet.png`.
- **Max-quality render + mastering:** `node tools/adkit.mjs render` = CRF 16, x264 slow, JPEG 95 frames, bt709, AAC 320k, two-pass loudness to −14 LUFS / −1 dBTP, then a pacing/loudness report.
- **Voice:** `tts_free.py` adds a broadcast polish (EQ, de-ess, compression); the user's own voice is still the most authentic.

## Workflow

1. **Break down any reference first.** Run `bash scripts/breakdown.sh ref.mp4 out/` (ffmpeg): cut timestamps, shot lengths, pacing, hook frames, contact sheet, loudness. Look at `contact_sheet.png` and `hook.png`. Name the format, the hook type, the pacing, the CTA. Copy the *structure*, never the footage, music or branding.
2. **Brief in one line each:** audience, the single message, the hook, the CTA, platform + length. If the user gave a product/brand, use its real name, real numbers, real UI. Ask at most one question; otherwise assume sensibly and say what you assumed.
3. **Script → beat sheet.** Write the voiceover/captions as phrases, then a beat table: `# | time | seconds | visual | caption/VO | sound`. This table is the edit — get it right before producing anything.
4. **Produce** with the format's reference file and `references/automation.md`. Placeholders first (missing clips render as labelled boxes), real assets second, then render the mp4.
5. **Edit, sound, export, QA** with `references/edit-and-sound.md`.

## Calibration: measured from real viral references

| Reference | Hook | Body pacing | Ending |
|---|---|---|---|
| Brand film ("You can't make a tech company look cool") | 4.9 s person at desk + quote caption | 0.4–1.3 s cuts; two strobe bursts of 0.07–0.1 s shots; last ~40 % is UI + outro on black | URL → tagline → logo, ~1.3 s each |
| AI ad ("Just made a $3,250 client video for $4") | 3.2 s talking head, price-gap claim | ~1 s AI clips, 2–3 s holds on hero shots | 4 s end frame + "Comment KREA for a guide" |
| Showcase reel ("Cool web devs don't gatekeep… pt 5") | Series title over first item | 3–4.5 s per site, caption box = site + one-line reason | Fade out on last item |

All three: 9:16 1080×1920, 23–38 s, loud masters (−8 to −14 LUFS), captions on screen the whole time.

## What Claude delivers

- **In Claude Code (default): the finished `.mp4`, using free tools only.** Follow `references/automation.md`: Claude sets up the project (`adkit.mjs init`), downloads stock (`scripts/stock.py`: Internet Archive + NASA with no key, Pixabay with a free key), turns 1–2 product photos into start frames (`scripts/frames_from_photo.py`), records websites (`scripts/record_site.mjs`), makes the voiceover + word timings (`scripts/tts_free.py`), times the beats to the VO (`scripts/beats_from_words.py`), gets AI clips either automatically on a free Hugging Face Space (`scripts/hf_video.py`) or via a phone checklist for free app credits (`scripts/shot_cards.py`), writes `ad.json`, preps clips, reviews every beat (`adkit.mjs review`), renders + masters (`adkit.mjs render`) and verifies the result. Paid APIs (`fal_generate.py`, `tts_elevenlabs.py`) only if the user opts in, after a cost estimate. Stop only for things only the user can supply (their face on camera, music, logo, free-app clips) and for final review.
- **In the Claude app (no code execution for renders):** the plan (hooks, script, beat sheet, `ad.json`, `shots.json`, prompts) plus the exact commands to run in Claude Code.

Assets live in `assets/`: `LaunchKit.tsx` (components), `Examples.tsx` (BrandFilm, ShowcaseReel, HybridAd, and the data-driven `Ad`), `JsonAd.tsx`, `example-ad.json`.

## Non-negotiables

- First 1.5 s must work on mute: a readable claim or a striking image. No logos or slow fades as the opener.
- One idea per video. If the script has two "and also"s, cut one.
- Captions always on, inside safe zones (avoid top 8 %, bottom 20 %, right 13 %).
- Cut on words and beats; no shot runs > 2.5 s without motion or a new caption.
- Sound design on every UI moment and transition; music ducked under voice.
- Honest: label AI content where platforms require it; only licensed music/footage; no real people's likeness or other brands' logos without rights; for client work say it's AI-made.
