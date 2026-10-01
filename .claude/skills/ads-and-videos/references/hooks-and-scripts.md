# Hooks, structures, scripts, CTAs

## Hooks (first 1.5–3 s)

A hook = a visual that stops the thumb + a line that opens a loop. Offer the user 3 options from different families, then pick one.

| Family | Pattern | Example from the references / adaptable |
|---|---|---|
| Contrarian quote | Put the objection in quotes, then prove it wrong | "You can't make a tech company look cool" |
| Price/effort gap | Big number vs tiny number | "Just made a $3,250 client video for $4" |
| Insider list (series) | "X don't gatekeep… pt N" | "Cool web devs don't gatekeep… pt 5" (numbering signals more parts → follows) |
| Result first | Show the finished thing, then "here's how" | Final hero shot at 0 s, then rewind to process |
| Specific pain | Name a pain only the audience has | "IB students grading their own essays at 2am" |
| POV | Put viewer in a situation | "POV: your school finally has a working app" |
| Before / after | Split screen or hard cut | Old site → new site in one cut |
| Stop doing X | Correct a common habit | "Stop screenshotting your UI for launch videos" |

Rules: the claim must be true and paid off later in the video. Specific beats clever ("$4" beats "super cheap"). Faces and hands in frame at 0 s lift retention; so does motion in the first frame.

## Ad structures (pick one per video)

1. **Manifesto → product** (brand film): belief → evidence montage → turn ("but even the greatest…") → product moment → proof number → URL/tagline/logo.
2. **Process → hero → life** (product commercial): environment → material macros → making → logo reveal → hero → person using it → golden-hour end.
3. **Listicle** (showcase): series title → item (name + one-line reason + best visual) ×3–6 → "save this".
4. **Problem → agitate → solve** (performance ad): pain on screen → why it's worse than they think → product solving it in one demo → offer/CTA.
5. **Demo in 3 taps** (app ads): hook claim → tap 1, tap 2, tap 3 with cursor/finger → result → CTA.

## Script → beat sheet

Write the VO/caption line first, split into phrases of 1–4 words (brand film) or 3–8 words (talking head). One phrase = one beat. Timing guide at 30 fps:

- Brand film phrase: 18–30 frames (0.6–1 s); UI moments 45–75 frames; outro cards ~40 frames.
- Talking head: follow the speech; captions change every 1–3 words.
- Showcase item: 90–135 frames.

Beat sheet columns: `# | start | secs | visual | caption / VO | sound`. Mark the turn and the proof beat explicitly.

## CTAs

- **Comment keyword** ("Comment KREA for the guide") + an auto-DM tool (ManyChat or Instagram's built-in automation) — drives comments, which the algorithm rewards.
- **Save this** for lists and tutorials. **Follow for pt N+1** for series.
- Product ads: the URL on screen + one verb ("Try it free at…").
- Only one CTA per video.

## Voiceover

- Record your own on a phone in a closet (soft surfaces) or use an AI voice (ElevenLabs is the usual pick) — keep it calm, slightly slower than normal speech, pauses before the turn and the proof number.
- Get word timings with Whisper (`@remotion/install-whisper-cpp` + `@remotion/captions`, or the official Remotion captions skill) and map them to `WordCaptions` / beat durations.
