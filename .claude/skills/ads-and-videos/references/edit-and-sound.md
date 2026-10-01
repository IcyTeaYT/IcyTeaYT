# Edit, sound, export, QA

## Capturing material

- **Talking-head hook:** phone back camera, 4K 30 fps, face lit by a window in front of you, lav or phone mic 20 cm away, background with depth. Say the hook 5 ways; use the best take's first 3 s.
- **Screen recordings (showcase reels, app demos):** Screen Studio (Mac, auto-zoom + smooth cursor) or FocuSee / OBS (Windows). Record at 1440p+ and 60 fps, browser in full screen, hide bookmarks and notifications, scroll slowly with a trackpad, 5–8 s per site. Filming a laptop with a phone (like the showcase reference) is also valid — lock exposure, dim the room so the screen pops.
- **Stock/archival:** `tools/stock.py` — Internet Archive/Prelinger and NASA (no key), Pixabay (free key). Pexels' site still works for manual downloads (its API stopped issuing new keys). Paid: Artgrid, Storyblocks.

## Pacing rules

- The first cut happens by 1.5–5 s (after the hook line lands).
- Body cuts: 0.4–1.3 s for montage, 2–3 s holds only on hero/proof beats.
- Cut on consonants of the VO or on kick/snare hits. Pre-lap audio: let the next shot's sound start 2–4 frames before the picture cut.
- Strobe bursts (2–4-frame shots) to punctuate section changes — max twice per video.
- Speed ramps into and out of hero shots; hard cuts everywhere else.
- End on the CTA frame held long enough to read twice (≥1.5 s).

## Sound (half the perceived quality)

- Layers: VO → music → SFX → room tone/ambience.
- SFX checklist: whoosh on every entrance, click on every button, soft tick per odometer digit, riser into the turn/outro, impact/sub-drop on the logo. Sources: Epidemic Sound, Artlist, Freesound (check licence).
- Music: licensed (Epidemic, Artlist, Musicbed) or the platform's library if posting natively. Duck music −8 to −12 dB under voice.
- Master to about −14 LUFS integrated (platforms normalise around there), true peak ≤ −1 dBTP. The references were mastered louder (−8 to −14 LUFS) — louder is fine for social, clipping is not.
- In Remotion: `<Audio src={staticFile('music.mp3')} volume={0.35} />`, `<Sfx src={staticFile('sfx/click.mp3')} at={24} />` inside the beat.

## Captions

- Always on. Two styles: understated (brand film `Caption`) or word-by-word (`WordCaptions` / CapCut auto-captions).
- Sentence case, max ~5 words on screen, high contrast, inside safe zones: avoid top 8 %, bottom 20 %, right 13 % (TikTok/Reels UI).
- Spell-check brand names and numbers manually.

## Grade

One look across every clip: B&W high-contrast (brand film), warm film (lifestyle/product), or clean natural (tech demos). Add light grain to glue AI/stock/phone footage together.

## Export

| Use | Size | Notes |
|---|---|---|
| Reels / TikTok / Shorts | 1080×1920, 30 fps | H.264, high bitrate (Remotion `--crf=16..18`) |
| Feed ad | 1080×1350 (4:5) | Recompose, don't letterbox |
| YouTube / website hero | 1920×1080 | 16:9 edit; for web loops also export WebM + a poster frame |

## QA before posting

- [ ] Hook works with sound off, in the first 1.5 s
- [ ] Every caption readable at arm's length, none under platform UI
- [ ] No shot > 2.5 s without motion or a new caption
- [ ] Product/logo identical in every shot; end card uses the real logo
- [ ] No clipping audio; music ducks under voice
- [ ] One CTA, on screen ≥ 1.5 s
- [ ] Rights: music, footage, AI plan terms; AI label on if required
- [ ] Cover frame chosen (a readable title frame, not a blurry mid-cut)

## Posting

Native upload (not via third-party schedulers when testing), caption with the hook restated + the CTA keyword, 3–5 specific hashtags max, pin a comment with the link/keyword, reply to early comments fast. For series, keep the title format identical so viewers recognise it.
