# Cinematic footage with Higgsfield

Use this when the page needs footage that only a camera (or a video model) can make: a jet over clouds, a drone push through a city, a product hero shot with real light. Code cannot fake this, and local CPU rendering is far below what Higgsfield's hosted models (Kling, Veo, Seedance, Hailuo, Wan, Higgsfield's own DoP and Soul) produce. You write the prompts; the user generates on higgsfield.ai (free credits or their plan, no API key); you build the page from what comes back.

Model names and menus on Higgsfield change often. Write prompts that work on any current image-to-video model, and tell the user to pick the newest version of whichever model is listed.

## When to use it

- The example (a video, a reel, a site) has photographic or cinematic motion: a moving camera through a real-looking scene.
- The user has no footage of their own for it (always ask first: their own drone clip or product video beats generated footage).
- Not for: UI animation, text reveals, parallax of flat layers. Those are code (`references/gsap.md`).

## Workflow

1. **Shot spec from the example.** Run `scripts/video-ref.sh` on the example and note: subject, setting, light and time of day, camera move (direction, speed, start and end framing), duration, where the page text sits (left, right, centre), and how the clip is used:
   - `scroll`: scrubbed by scroll (Vela, Apple). Needs one continuous, slow, constant camera move. No cuts, no speed ramps, no fast subject motion.
   - `loop`: a background that plays forever. Needs start frame = end frame.
   - `play`: plays once as a hero video. Most freedom.
2. **Generate the prompt sheet:**
   ```bash
   node <skill-dir>/scripts/higgsfield-prompts.mjs --spec shot.json --out PROMPTS.md
   # or quick flags:
   node <skill-dir>/scripts/higgsfield-prompts.mjs --subject "a white private jet" --setting "above a sea of clouds" \
     --light "golden hour, low sun behind the camera" --camera dolly-in --use scroll --text left \
     --palette "#0b1020,#f2c48d" --out PROMPTS.md
   ```
   Spec fields are listed by `--help`. Pull the palette from the page's tokens so the footage matches the site.
3. **Give the user `PROMPTS.md`** and the short version in chat: which tool, which model, which settings, the two prompts to paste. Ask them to send back the best result (upload, Drive link, or file path). Offer the variations if the first one misses.
4. **Check what comes back** with `scripts/video-ref.sh`: one continuous shot, no cuts, no warping, subject stays consistent, text-safe area stays clear, no watermark over the subject. If it fails, say which check failed and give the matching variation prompt.
5. **Build:** `scripts/frames.sh` (native resolution and fps) then the scroll-sequence player in `assets/scroll-sequence/`, or a `<video autoplay muted loop playsinline>` for `loop` and `play`. Then the normal compare / record / slop-check loop.

## Writing the prompts (rules the script follows)

**Start frame first, then animate it.** Image-to-video gives far more control than text-to-video: the composition, subject design and colours are locked before motion is added.

Start-frame prompt order: shot type and lens, subject (specific: model, material, colour), setting, light (direction, time, quality), palette, composition (where the empty space is for text), camera and film look, realism cues. Ask for one image per aspect: 16:9 for desktop, 9:16 for phones (or one 16:9 if the phone crop from `frames.sh --crop-x` keeps the subject).

Video prompt order: camera move first (direction, speed, distance), then what moves in the scene and how much, then what stays still, then light behaviour, then "one continuous shot". Keep it short; the start frame already carries the look.

For `scroll` shots:
- Camera: one move only, slow and constant ("slow, steady dolly forward"), 5 to 10 s.
- Subject motion small and continuous (a jet drifting, clouds rolling), never sudden.
- Ask for no cuts, no zoom ramps, no shake, no morphing.
- Generate at the highest resolution and frame rate offered; scrubbing exposes every soft frame.

For `loop` shots: use the model's start and end frame option with the same image in both, and keep the motion cyclical (clouds, water, light shimmer).

Avoid list (put it in the negative prompt where the model has one, otherwise phrase it positively in the main prompt): text, letters, logos, watermarks, cuts, transitions, flicker, warping, melting, extra limbs, duplicate subjects, sudden speed changes, camera shake.

Never ask for real brands, logos, celebrities or trademarked products (a "private jet", not a named manufacturer's jet; a "flagship smartphone", not a named phone). Name the user's own brand only if they own it, and keep logos out of the footage; add them on the page instead.

## Camera vocabulary

The script maps these to prompt phrasing and to the closest Higgsfield DoP-style camera preset name:

| `--camera` | Prompt phrasing | Good for |
|---|---|---|
| `dolly-in` | slow steady dolly forward toward the subject | scroll reveals, approach shots |
| `dolly-out` | slow steady dolly backward, revealing the scene | endings, scale reveals |
| `orbit` | slow orbit around the subject, constant speed | products, landmarks |
| `crane-up` | slow crane up, rising above the subject | establishing, reveal skyline |
| `crane-down` | slow crane down, descending toward the subject | arrival |
| `truck-left` / `truck-right` | slow lateral tracking move | parallax past foreground |
| `pan-left` / `pan-right` | slow pan across the scene | panoramas |
| `fpv` | smooth FPV drone flight forward, gentle banking | energetic hero (`play` only) |
| `push-through` | slow push forward through a gap or opening | transitions between sections |
| `static` | locked-off camera, only the scene moves | `loop` backgrounds |
