# GSAP for example-driven sites

Use these only to reproduce motion the example actually has. Read the example's motion first (`scripts/video-ref.sh` for videos, or scroll the live site), write down what moves, when, how far and with what easing, then pick the matching pattern below. `ui-ux-pro-max --domain gsap` has more presets.

## Setup (plain HTML; all plugins are free since GSAP 3.13)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js"></script>
<!-- only if used: SplitText.min.js, Flip.min.js, ScrollToPlugin.min.js (same path) -->
<!-- smooth scroll, only if the example has that weighted feel: -->
<link rel="stylesheet" href="https://unpkg.com/lenis@1.3.4/dist/lenis.css">
<script src="https://unpkg.com/lenis@1.3.4/dist/lenis.min.js"></script>
```

npm: `npm i gsap lenis`, then `import gsap from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger'; gsap.registerPlugin(ScrollTrigger);`. React: `npm i @gsap/react` and use `useGSAP()` for cleanup.

## Ground rules

- Wrap everything in `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` branch. In the reduced branch, show the final state.
- **Content is visible without JS.** Set the hidden start state from JS (`gsap.set` / `from()`), never in CSS, so a script failure or a blocked CDN still shows everything.
- Call `ScrollTrigger.refresh()` after fonts and hero images load (`document.fonts.ready`, `img.decode()`).
- Pin 1 or 2 sections per page at most. Test pinned sections at 390px wide.
- Animate `transform` and `opacity` only. No animating `width`, `top` or `filter: blur()` on large areas.
- Match the example's timing. Measure it from the video (frames between start and end divided by fps) instead of guessing `duration: 1`.

## Lenis smooth scroll wired to ScrollTrigger

```js
const lenis = new Lenis({ lerp: 0.1 });            // 0.08 to 0.12 for "heavy" sites
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
Skip Lenis on touch devices if the example does not need it (`if (!matchMedia('(pointer: coarse)').matches)`).

## Pattern: scroll-scrubbed footage (image sequence)

For "the jet/drone/product moves as you scroll". Frames from `scripts/frames.sh`.

```html
<section class="seq" style="height: 400vh">
  <div class="seq__stage" style="position: sticky; top: 0; height: 100svh; overflow: hidden">
    <canvas class="seq__canvas" data-media style="width: 100%; height: 100%"></canvas>
  </div>
</section>
```
```js
const N = 241, set = matchMedia('(max-width: 700px)').matches ? 'sm' : 'lg';
const imgs = Array.from({ length: N }, (_, i) => { const im = new Image(); im.src = `frames/${set}/${String(i + 1).padStart(3, '0')}.webp`; return im; });
const cv = document.querySelector('.seq__canvas'), ctx = cv.getContext('2d'), state = { f: 0 };
function size() { const d = Math.min(devicePixelRatio, 2); cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; draw(); }
function draw() {
  const im = imgs[Math.round(state.f)]; if (!im.complete) return;
  const s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
}
imgs[0].onload = size; addEventListener('resize', size);
gsap.to(state, { f: N - 1, ease: 'none', snap: 'f', onUpdate: draw,
  scrollTrigger: { trigger: '.seq', start: 'top top', end: 'bottom bottom', scrub: 0.5 } });
```
Quality: export frames at the source's native resolution and frame rate (1920px, 24fps, WebP q80); a separate portrait crop for phones. Lower values look blurry and stepped. A dependency-free version of this player (no GSAP needed) is bundled at `assets/scroll-sequence/player.js` with a page template.

## Pattern: hero text that fades/lifts out as the scene starts

```js
gsap.to('.hero__copy', { opacity: 0, y: -24, ease: 'none',
  scrollTrigger: { trigger: '.seq', start: 'top top', end: '15% top', scrub: true } });
```

## Pattern: line-by-line text reveal (SplitText)

```js
document.fonts.ready.then(() => {
  SplitText.create('.reveal', { type: 'lines', mask: 'lines', autoSplit: true, onSplit(self) {
    return gsap.from(self.lines, { yPercent: 100, duration: 0.9, ease: 'power4.out', stagger: 0.08,
      scrollTrigger: { trigger: self.elements[0], start: 'top 85%' } });
  } });
});
```

## Pattern: pinned section with horizontal scroll

```js
const track = document.querySelector('.h-track');
gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none',
  scrollTrigger: { trigger: '.h-wrap', pin: true, scrub: 1, end: () => '+=' + (track.scrollWidth - innerWidth), invalidateOnRefresh: true } });
```
On phones, consider a native horizontal scroller (`overflow-x: auto; scroll-snap-type: x mandatory`) instead of pinning.

## Pattern: stacked cards (each pins and the next slides over)

```js
gsap.utils.toArray('.stack-card').forEach((card, i, all) => {
  if (i === all.length - 1) return;
  ScrollTrigger.create({ trigger: card, start: 'top top', pin: true, pinSpacing: false, endTrigger: all[all.length - 1], end: 'top top' });
  gsap.to(card, { scale: 0.92, opacity: 0.6, ease: 'none', scrollTrigger: { trigger: all[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
});
```

## Pattern: layered parallax

```js
gsap.utils.toArray('[data-speed]').forEach((el) => {
  gsap.to(el, { yPercent: -10 * Number(el.dataset.speed), ease: 'none',
    scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
});
```

## Pattern: image clip reveal

```js
gsap.from('.clip-img', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power3.inOut',
  scrollTrigger: { trigger: '.clip-img', start: 'top 80%' } });
```

## Checking motion against a video example

1. `scripts/video-ref.sh example.mov ref/` gives a contact sheet and a motion timeline.
2. `node scripts/record.mjs http://localhost:PORT/ out/ --scroll` records your build scrolling, then run `scripts/video-ref.sh out/scroll.mp4 out/` on it.
3. Compare the two contact sheets side by side: same order of events, similar timing, same easing feel. Fix the biggest mismatch and repeat.
4. Run `design-motion-principles` in Audit mode on the build.
