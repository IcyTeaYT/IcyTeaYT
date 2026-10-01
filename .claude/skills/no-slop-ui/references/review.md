# Review: prove it isn't slop

Run this before showing the user anything.

1. **Lint** — `python3 scripts/slop_check.py <file or src/>`. Fix every ERROR. Fix every WARN or state why the brief wants it.
2. **Look** — `node scripts/screenshot.mjs <file.html | http://localhost:5173> shots` (needs Playwright + Chromium: `npm i -D playwright && npx playwright install chromium`, or `CHROME_PATH=` an existing Chrome). Open `390-top.png`, `390-full.png`, `1440-top.png`, `1440-full.png`. Fix horizontal overflow, elements past the edge, text < 12px, mobile tap targets < 40px, console errors.
   No browser available? Review the code against the checklist below and say that it wasn't visually verified.
3. **Critique** with these tests:
   - **Swap test**: would this page work for a different organisation with only the name changed? Then it's generic — put the subject's real things in.
   - **Squint test**: blur your eyes at the screenshot. Is there one clear focal point per screen and a clear reading order?
   - **Default test**: for each section, is this the first layout anyone would produce for a similar prompt? If yes, change it.
   - **Chanel test**: remove one accessory (a glow, a badge, a label, an animation).
4. **Floor** — keyboard through the page (visible focus, logical order), reduced motion on (`--reduced` flag), AA contrast (body ≥ 4.5:1), 44px touch targets, meta description + OG image + theme-color, images with alt, no layout shift from fonts (`display=swap`, fallback stack).

## Checklist
- [ ] Hero shows the most characteristic thing of this subject, and says what it is in ≤ 8 words
- [ ] Tokens: ≤ 6 colours, one family (or two clearly distinct), radius by level
- [ ] No two consecutive sections use the same pattern
- [ ] One orchestrated motion moment; reveals ≤ 2; everything responds to input
- [ ] Real content everywhere; no placeholder names or numbers
- [ ] slop_check clean (or justified), screenshots reviewed at 390 and 1440
- [ ] Works without JS and with reduced motion
