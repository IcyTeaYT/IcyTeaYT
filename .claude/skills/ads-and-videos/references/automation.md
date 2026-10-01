# Automation: Claude Code makes the finished video

In Claude Code the deliverable is a rendered `.mp4` (plus the project so it can be edited), not a list of prompts. Claude runs everything below itself and only stops for: approving spend, things only the user can film, and the final review.

## 0. Setup — Claude does it, once per project
```bash
node ~/.claude/skills/ads-and-videos/scripts/adkit.mjs init .     # project + kit + tools + font + free Python tools + test frame
node tools/adkit.mjs doctor                                       # what's available; fix anything ✗ yourself
```
Free by default; paid services only if the user opts in. Optional keys live in `.env` (gitignored), never in code.

| Need | Free (default) | Paid (only if the user asks) |
|---|---|---|
| Stock footage | `stock.py archive` / `stock.py nasa` (no key), `stock.py pixabay` (free key) | — |
| Product start frames | `frames_from_photo.py` from 1–2 photos (crops + studio composites) | `fal_generate.py` image models |
| Environment/lifestyle frames | `hf_video.py` single call on a Kontext / Qwen-Image-Edit Space | `fal_generate.py` |
| AI clips, logo/hero shots | Real-photo frames + push-in, or Kling/Hailuo free credits via `shot_cards.py` | `fal_generate.py` (Seedance…) |
| AI clips, B-roll | `hf_video.py` (Wan 2.2 Space, automatic) | `fal_generate.py` |
| Website/app footage | `record_site.mjs` | — |
| Voiceover + word timings | `tts_free.py` (+ broadcast polish) or the user's recording + Whisper | `tts_elevenlabs.py` |
| Render + master | `adkit.mjs review` / `render` | — |

## 1. Plan (2 minutes, then confirm once)
Break down the reference (`scripts/breakdown.sh`), write hook options, script and beat sheet. Show the beat sheet and asset plan (which route per shot); get one "go".

## 2. Get the assets
**Stock montage (brand film):** (Pexels paused new API keys — use these)
```bash
python3 tools/stock.py archive "factory workers" --n 3 --cut 2 --out public/clips/arch   # public-domain archival film, no key
python3 tools/stock.py nasa "rocket launch" --n 2 --cut 2.5 --out public/clips/rocket    # NASA footage, no key
python3 tools/stock.py pixabay "human eye macro" --n 2 --out public/clips/eye            # free PIXABAY_API_KEY in .env
python3 tools/stock.py pixabay "brain scan" --photos --n 2 --out public/stills/mri
```
B&W grading in `Footage` makes mixed stock look like one film. Keep `credits.json`.

**Product start frames from 1–2 photos:**
```bash
python3 tools/frames_from_photo.py product.jpg --auto            # first look: full, 2 detail crops, pedestal, spotlight, seamless
python3 tools/frames_from_photo.py product.jpg closeup.jpg --plan frames.json   # after viewing the photo: exact crop boxes
```
Look at the photo first and put crop boxes on the logo, texture, stitching, label. Real-photo crops with a slow push-in (`"kind": "image"`, `push: 0.08`) are the highest-quality free macro shots — the product can't drift.

**AI clips — pick the route per shot:**
- **Hero/product/logo shots → free app credits (best free quality).** Write `shots.json` (product bible in every image prompt, motion-only video prompts, `start_image` = the user's real product photo where possible), then `python3 tools/shot_cards.py shots.json --out shots.html`. The user opens it on their phone, generates each shot in Kling (66 free credits/day, refreshes daily) or Hailuo, and saves files with the exact names into `public/clips/`. Spread over a few days if needed. Ask the user to check free downloads for watermarks.
- **B-roll / atmosphere / abstract → fully automatic and free.** `python3 tools/hf_video.py --list zerogpu-aoti/wan2-2-fp8da-aoti-faster` (confirm endpoint + input names), put `space`/`api`/`video_args` in the shots file, then `python3 tools/hf_video.py --batch shots_free.json`. Re-run tomorrow when the free quota ends — finished clips are skipped. If the Space is gone, search Hugging Face Spaces for "wan 2.2 image to video" running on ZeroGPU.
- **Paid, only on request:** `fal_generate.py` (verify model schema at `https://fal.ai/models/<id>/llms.txt`, dry-run, show the cost, wait for approval).

Then normalise everything: `node tools/adkit.mjs prep public/clips`.

Review every take yourself: `ffmpeg -v error -ss 1.5 -i public/clips/03_stitch_t1.mp4 -frames:v 1 review/03_t1.png`, look at the frames, reject warped logos/hands/colour drift.

**Free-tier quality tips:** free tiers are usually 720p — fine for Reels once graded with grain; keep logos on slow/static moves; generate 2 takes of hero shots and 1 of B-roll; the edit (pacing, sound, captions, grade) is where most of the "expensive" look comes from.

**Screen recordings (showcase reel / app demo):**
```bash
node tools/record_site.mjs https://basement.studio public/clips/basement.mp4 --seconds=5 --hold=1
node tools/record_site.mjs http://localhost:5173 public/clips/app.mp4 --seconds=6 --distance=1800
```

**Voiceover (free):**
```bash
python3 tools/tts_free.py script.txt --voice en-US-AndrewNeural --out public/vo.mp3      # → public/vo.words.json
python3 tools/beats_from_words.py script.txt public/vo.words.json > beats.json          # beat durations from the VO
```
Uzbek/Russian voices exist too (`uz-UZ-SardorNeural`, `ru-RU-DmitryNeural`). For client work prefer the user's own voice.

**Things only the user can provide:** the talking-head hook clip, music (`public/music.mp3` — free: YouTube Audio Library / platform sounds when posting natively), their logo SVG, real product photos. Missing ones render as labelled placeholders, so never block on them — say what's missing.

## 3. Assemble `ad.json`
Merge `beats.json` durations with a `type` and `src` per beat (see `JsonAd.tsx` › `BeatSpec`). Add `voiceover`, `music`, `words` (for TikTok captions), `sfx` (`{src, at}` in frames). Example: `assets/example-ad.json`.

## 4. Check before the full render
```bash
node tools/adkit.mjs review        # key frame of every beat → review/sheet.png + a legend
```
Open `review/sheet.png` and fix anything off before rendering.
Check: captions inside safe zones, nothing cut off, product identical across shots, numbers correct.

## 5. Render + verify
```bash
node tools/adkit.mjs render        # max quality → loudness master (−14 LUFS) → out/ad.mp4 + pacing/loudness report
```
Compare pacing with the reference; look at `review/final/contact_sheet.png`.

## 6. Deliver
Path to `out/ad.mp4`, a cover frame (`npx remotion still Ad out/cover.png --frame=<best> --props=ad.json`), the posting caption + CTA, and a list of anything still placeholder.

## Failure handling
- HF Space busy / quota used → `hf_video.py` stops cleanly; re-run later. Space removed → find another Wan 2.2 Space and `--list` it.
- fal job fails/times out (paid route) → retry that shot once, then simplify the motion prompt.
- A take is close but flawed → regenerate with a shorter duration or slower camera move.
- Render error about a missing file → the `src` path is wrong (paths are relative to `public/`).
