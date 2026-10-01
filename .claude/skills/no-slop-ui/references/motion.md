# Motion

Motion either answers a person (hover, press, open, confirm) or tells one story (the hero entrance, a product changing state). Everything else is noise.

## Budget per page
- **1** orchestrated entrance (hero): children rise out of a soft blur, 80 ms apart, 1 s, `ease [.22,1,.36,1]`.
- **1–2** scroll moments that mean something (product frame zooms/changes, a step list progresses).
- **Unlimited** micro-interactions that respond to input: press scale .98, spotlight, focus, tab indicator glide.
- Lenis smooth scroll site-wide (lerp 0.1), off for reduced motion.

## Timing
| Kind | Duration / spring |
|---|---|
| Hover colour/opacity | 150–200 ms ease-out |
| Press | spring stiffness 420, damping 32 |
| Tabs / pills (layoutId) | same UI spring |
| Entrances | 0.8–1 s ease-out, stagger 60–90 ms |
| Panels / sheets | spring stiffness 140, damping 22 |
| Nav hide/show | 450 ms ease-out |

Animate `transform`, `opacity`, and small `filter: blur` only. Never animate layout properties on scroll.

## React (Motion + Lenis) — see assets/react/
```tsx
<MotionConfig reducedMotion="user">
  <SmoothScroll>
    <Nav … />
    <Sequence>            {/* the hero, once */}
      <Item><h1 …/></Item>
      <Item><p …/></Item>
      <Item><SpotlightCard as="form">…</SpotlightCard></Item>
    </Sequence>
    <Reveal>…</Reveal>    {/* 1–2 per page */}
  </SmoothScroll>
</MotionConfig>
```

Scroll-linked product frame:
```tsx
const ref = useRef<HTMLDivElement>(null);
const {scrollYProgress} = useScroll({target: ref, offset: ['start end', 'center center']});
const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
const radius = useTransform(scrollYProgress, [0, 1], [32, 22]);
<motion.div ref={ref} style={{scale, borderRadius: radius}} className="edge overflow-hidden">…real UI…</motion.div>
```

Number ticker (real numbers only):
```tsx
const mv = useMotionValue(0); const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
useEffect(() => { if (inView) animate(mv, 157, {duration: 1.2, ease: [0.22, 1, 0.36, 1]}); }, [inView]);
<motion.span className="tabular-nums">{text}</motion.span>
```

Modals with Lenis: call `lenis.stop()` on open and `lenis.start()` on close (`useLenis()` from `lenis/react`), and put `data-lenis-prevent` on scrollable panels.

## Vanilla (single-file pages) — built into assets/base.html
`data-sequence` on the hero container, `data-reveal` on 1–2 elements, `.spot` on interactive surfaces. Motion's `animate`, `inView`, `stagger` and Lenis are loaded from pinned jsDelivr URLs.

## GSAP (only for timelines and pinning)
Use GSAP + ScrollTrigger when you need pinned, scrubbed, multi-step choreography. Sync it with Lenis:
```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
(and create Lenis with `autoRaf: false` in that case).

## Reduced motion
- CSS: the base kills transitions/animations under `prefers-reduced-motion`.
- React: `MotionConfig reducedMotion="user"`; `SmoothScroll` returns plain children.
- Content must be fully visible without JS and without motion (base hides reveal targets only under `.js`).
