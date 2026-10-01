# AI product commercials

The "$3,250 video for $4" effect comes from three things: a locked product, a proper commercial shot list, and a real edit. The model matters less than people think.

## 1. Lock the product (before any video)

AI drifts: logos warp, colours shift, details change between shots.

- Ask for **1–2 photos max**: the whole product on a plain background in good light, plus optionally a logo/detail close-up. `tools/frames_from_photo.py` makes every studio/macro start frame from them; environment frames come from a free image-edit Space (`hf_video.py`, FLUX Kontext / Qwen-Image-Edit) with the photo as input.
- Write a **product bible** — one paragraph pasted verbatim into every image prompt: shape, material, exact colour words, logo text + placement, distinguishing details. Example: "a washed brick-red cotton dad cap, curved brim, white 3D-embroidered script logo 'Krea' across the front panels, small white embroidered text 'KREA © 2026 SAN FRANCISCO, CA' on the left side panel, visible topstitching on the brim".
- Make every shot's **start frame as an image first** — real-photo frames where possible, image edits of the real photo otherwise. Then animate that image. Image-to-video from a real photo holds the product far better than text-to-video.
- Keep one **style line** too (lighting + grade + lens feel) and reuse it, e.g. "soft top light, deep shadows, warm film grade, 35mm, shallow depth of field".

## 2. Shot list

Use the "process → hero → life" arc (see `prompt-library.md` for each shot's recipe). For a 20–25 s ad plan 10–14 shots; you'll use 0.5–3 s of each 4–5 s generation. Output as a table:

`# | secs used | shot | start-frame image prompt | motion prompt | model | notes`

## 3. Prompt formulas

**Image (start frame):** `[shot size + lens] of [PRODUCT BIBLE] [what's happening], [environment], [lighting], [STYLE LINE], photoreal commercial product photography`

**Motion (image-to-video):** describe only camera + motion + physics. Re-describing the product in new words invites a new product.
`[camera move + speed]. [subject action]. [physics: fabric flex, dust in light, steam, droplets]. Keep the product's shape, logo and colour exactly as in the first frame. [light change if any].`

Camera moves that sell: slow push-in, macro rack focus, 30–90° orbit, low dolly past, top-down rotation, speed-ramp whip. Show text/logos only on slow or static moves.

Start + end frame mode (where the model supports it) is the most controllable: generate both keyframes as images, let the model interpolate — perfect for "thread becomes logo" or "parts assemble" shots.

## 4. Model choice — verify, this changes monthly

If web search is available, check a current leaderboard (e.g. Artificial Analysis video arena) and the hub's model list first. Mid-2026 picture:

| Need | Pick | Why |
|---|---|---|
| Product/brand consistency, readable labels | Seedance 2.0 | Strongest prompt adherence and reference handling |
| Most photoreal hero shots, people, native audio | Veo 3.1 | Realism + sound; pricier, ~8 s clips |
| Motion/physics, 4K, volume on a budget | Kling 3.0 | Cheapest per clip, strong motion |
| One subscription for all | Krea, Higgsfield, Freepik, Runway | Hubs that host several models |

**Free routes (default — see `automation.md`):**

| Route | Quality | Effort | Limits |
|---|---|---|---|
| Kling / Hailuo / Krea free credits | Same models as paid, usually 720p on free | User clicks generate from the phone checklist | A few clips per day; check watermarks |
| Wan 2.2 on a Hugging Face Space (`hf_video.py`) | Good for B-roll and atmosphere, weaker on logos/text | Fully automatic | Small daily free GPU quota; Spaces can disappear |

Mix them: hero/logo shots from free app credits, B-roll from Wan, the rest from Pexels stock.

Paid budget (only if the user opts in): shots × takes (2–4) × price per clip. Roughly $0.5–$2.5 per 5–10 s clip in mid-2026 depending on model and plan; a 12-shot ad with 3 takes each ≈ 36 generations. Paid plans usually include commercial rights — check the plan.

## 5. Review every take

Reject takes with: logo/text changes, colour shift vs the bible, melting hands/fingers, physics glitches, flicker, camera move that ends on a bad frame. Keep a "selects" folder named `03_stitch_take2.mp4`. Upscale finals if needed (Topaz Video AI or the hub's upscaler) — never upscale in the edit.

## 6. Finish

- Grade all clips together (AI clips come back with different looks); add light grain so they match.
- Mute AI audio unless it's genuinely good; build the soundtrack yourself (see `edit-and-sound.md`).
- Composite the real logo/URL on the end card — never trust generated text for the final frame. Remotion `KineticWord`/`Caption` or the editor's titles.
- Optional hybrid: film a 3 s talking-head hook yourself (`HybridAd` composition), which makes the ad feel human and gives the "I made this for $4" framing.

## Honesty

Tell clients it's AI-generated and what the rights are. Turn on platform AI labels where required. Only use products/logos the user or client owns; never generate real people's likeness or other brands' products.
