import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Shell } from '../shared/Shell';
import { AnnouncementBar, BAR_HEIGHT } from '@/components/AnnouncementBar';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/sections/Hero';
import { Mission } from '@/components/sections/Mission';
import { Marquee } from '@/components/sections/Marquee';
import { About } from '@/components/sections/About';
import { Projects } from '@/components/sections/Projects';
import { Founders } from '@/components/sections/Founders';
import { SuggestionBox } from '@/components/sections/SuggestionBox';
import { Faq } from '@/components/sections/Faq';
import { Footer } from '@/components/sections/Footer';
import { useNow } from '@/components/sections/Countdown';
import { SplitText } from '@/components/ui/SplitText';
import { Magnetic } from '@/components/ui/Magnetic';
import { Arrow } from '@/components/ui/Arrow';
import { HERO, MISSION } from '@/data/copy';
import { IntroContext } from '@/lib/intro';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { countdownParts } from '@/lib/suggestion';
import { drawFacade, layoutFacade, throughScale, type Facade, type Pt } from '../mosaic/paint';
import { CATEGORY_GLASS, courses, LINES, paintNightMural, paintNightStrip } from './night';

/**
 * Option: the original site, with the Mosaic folded in. The opening flies
 * through a black lattice facade to the council's flower in glass mosaic,
 * then glides down the mural to the inscription band where the mission is
 * set, as on the Mosaic, and pushes into one tile. After that it is the
 * original site, with the countdown as a clock face and a sent idea dropping
 * into the wall as a tile.
 */
const NAV_H = 72;
const NIGHT_WALL = { wall: '#0b0b0b', shade: '#050505', joint: '#1c1c1c' };
/** The opening's scroll, in screens; `at` turns a point in it into progress. */
const SCROLL = 3.6;
const at = (screens: number) => screens / SCROLL;
/** Where "Mission" in the nav lands: the inscription in frame. */
const MISSION_AT = at(2.35);

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function HeroCopy() {
  const { scrollTo } = useSmoothScroll();
  return (
    <>
      <h1 id="hero-title" className="type-display max-w-[14ch] text-[clamp(2.3rem,4.8vw,4.2rem)]">
        <SplitText text={HERO.title} play delay={0.15} stagger={0.07} />
      </h1>
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <motion.p className="max-w-[40ch] text-body-lg text-fog" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.7 }}>
          {HERO.lede}
        </motion.p>
        <motion.div className="flex flex-wrap items-center gap-x-3 gap-y-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.85 }}>
          <Magnetic strength={0.2}>
            <a
              href="#suggestions"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#suggestions');
              }}
              className="pill-ghost"
            >
              Suggest an idea
              <Arrow />
            </a>
          </Magnetic>
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('#projects');
            }}
            className="hidden min-h-[48px] items-center px-2 text-body text-fog transition-colors hover:text-paper sm:inline-flex"
          >
            See what we’ve built
          </a>
        </motion.div>
      </div>
    </>
  );
}

interface Geo {
  W: number;
  H: number;
  flower: Pt;
  band: { top: number; h: number };
  push: Pt;
  tile: number;
  MH: number;
  f: Facade;
  smax: number;
}

/**
 * The opening, pinned for 3.6 screens of scroll:
 *   0.1–1.3   fly through the lattice (its doors part) to the mural
 *   1.3–1.55  a beat on the flower
 *   1.55–2.35 glide down the mural to the inscription band, the mission set in it
 *   3.0–3.6   push into the black tile at its foot
 */
function Opening() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const muralBox = useRef<HTMLDivElement>(null);
  const muralCv = useRef<HTMLCanvasElement>(null);
  const facadeCv = useRef<HTMLCanvasElement>(null);
  const signBox = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const geoRef = useRef<Geo | null>(null);
  geoRef.current = geo;
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const inscription = useTransform(p, ...span([at(2.0), at(2.3), at(3.0), at(3.15)], [0, 1, 1, 0]));

  // Lay out for this viewport; paint the mural when the browser is idle.
  useEffect(() => {
    const el = stage.current!;
    let last = '';
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const key = `${W}x${H}`;
      if (key === last || !W || !H) return;
      last = key;
      const narrow = W < 700;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const flower = { x: W * (narrow ? 0.6 : 0.7), y: H * (narrow ? 0.3 : 0.42) };
      const R = Math.min(W, H) * (narrow ? 0.25 : 0.24);
      const band = { top: flower.y + R * 1.2, h: H * (narrow ? 0.74 : 0.58) };
      const MH = band.top + band.h + H * 0.6;
      const tile = (H / LINES / 2) * 1.4;
      const f = layoutFacade(W, H, NAV_H);
      const fc = facadeCv.current!;
      fc.width = Math.round(W * dpr);
      fc.height = Math.round(H * dpr);
      setGeo({ W, H, flower, band, push: { x: W / 2, y: band.top + band.h - tile / 2 }, tile, MH, f, smax: throughScale(W, H, f) });
      const mcv = muralCv.current!;
      mcv.style.opacity = '0';
      const paint = () => {
        const m = paintNightMural(mcv, W, MH, H, dpr, courses(W, H, MH), flower, R, band);
        mcv.style.width = `${W}px`;
        mcv.style.height = `${MH}px`;
        mcv.style.opacity = '1';
        setGeo((g) => (g && g.W === W && g.H === H ? { ...g, push: m.push } : g));
      };
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(paint, { timeout: 400 });
      else window.setTimeout(paint, 60);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const raf = useRef(0);
  const apply = (v: number) => {
    const g = geoRef.current;
    if (!g || !muralBox.current) return;
    const { W, H, flower, f, band } = g;
    const T = f.target;

    // Through the lattice.
    const fly = inOut(seg(v, at(0.1), at(1.3)));
    const s = Math.pow(g.smax, fly);
    const pan = smooth(seg(v, at(0.1), at(0.7)));
    const doors = settle(seg(v, at(0.15), at(0.5)));
    const cv = facadeCv.current;
    if (cv) {
      const through = s >= g.smax * 0.995;
      cv.style.opacity = through ? '0' : '1';
      if (!through) drawFacade(cv.getContext('2d')!, W, H, cv.width / W, f, s, pan, doors, NIGHT_WALL);
    }
    if (signBox.current) {
      const px = T.x + (W / 2 - T.x) * pan;
      const py = T.y + (H / 2 - T.y) * pan;
      signBox.current.style.transform = `translate(${px}px,${py}px) scale(${s}) translate(${-T.x}px,${-T.y}px)`;
      const out = seg(v, at(0.14), at(0.42));
      signBox.current.style.opacity = String(1 - out);
      signBox.current.style.visibility = out >= 1 ? 'hidden' : 'visible';
    }

    // The mural camera: closer on the flower, down to the inscription, then into one tile.
    // M is the mural point held at screen point S, at scale ms.
    const glide = inOut(seg(v, at(1.55), at(2.35)));
    const bandC = { x: W / 2, y: band.top + band.h / 2 };
    const ms0 = 1 + 0.08 * fly + 0.12 * inOut(seg(v, at(1.3), at(1.55)));
    let S = { x: mix(flower.x, W / 2, glide), y: mix(flower.y, H / 2, glide) };
    let M = { x: mix(flower.x, bandC.x, glide), y: mix(flower.y, bandC.y, glide) };
    let ms = mix(ms0, 1, glide);
    const tC = seg(v, at(3.0), at(3.6));
    if (tC > 0) {
      const k = Math.min(1, tC * 1.8);
      S = { x: W / 2, y: H / 2 };
      M = { x: mix(bandC.x, g.push.x, k), y: mix(bandC.y, g.push.y, k) };
      ms = Math.pow(Math.max(W, H) / (g.tile * 0.7), tC * tC * tC);
    }
    muralBox.current.style.transform = `translate(${S.x - M.x * ms}px,${S.y - M.y * ms}px) scale(${ms})`;
    const gone = seg(v, at(3.4), at(3.55));
    muralBox.current.style.opacity = String(1 - gone);
    muralBox.current.style.visibility = gone >= 1 ? 'hidden' : 'visible';
  };
  useEffect(() => apply(p.get()), [geo]); // first frame and every re-layout
  useMotionValueEvent(p, 'change', (v) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => apply(v));
  });

  return (
    <section id="top" ref={section} data-surface="dark" aria-labelledby="hero-title" className="relative bg-obsidian text-paper" style={{ height: `calc(${(SCROLL + 1) * 100}svh - var(--bar, 0px))` }}>
      {/* Where "Mission" in the nav lands. */}
      <div id="mission" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: `calc((${SCROLL * 100}svh - var(--bar, 0px)) * ${MISSION_AT})` }} />
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[600px] overflow-hidden">
        {/* The mural, with the mission set in its inscription band. */}
        <div ref={muralBox} className="absolute left-0 top-0 origin-top-left" style={{ width: geo?.W, height: geo?.MH }}>
          <canvas ref={muralCv} aria-hidden className="absolute left-0 top-0 transition-opacity duration-700" />
          {geo && (
            <motion.div className="pointer-events-none absolute inset-x-0 flex flex-col justify-center" style={{ top: geo.band.top + geo.tile * 1.5, height: geo.band.h - geo.tile * 3, opacity: inscription }}>
              <div className="container-x text-obsidian">
                <h2 id="mission-title" className="type-display max-w-[16ch] text-[clamp(2.1rem,5.2vw,4.75rem)]">
                  {MISSION.line}
                </h2>
                <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.5] tracking-[-0.02em] text-[#2b2b2b] sm:mt-8 sm:text-[20px]">{MISSION.support}</p>
              </div>
            </motion.div>
          )}
        </div>
        <canvas ref={facadeCv} aria-hidden className="absolute inset-0 h-full w-full" />
        <div ref={signBox} className="absolute inset-0 origin-top-left">
          <div className="absolute inset-x-0 bottom-0" style={{ top: geo?.f.bandTop ?? '60%' }}>
            <div className="container-x flex h-full flex-col justify-center pb-[calc(4rem+var(--bar,0px))] pt-4 sm:pb-[calc(2.5rem+var(--bar,0px))]">
              <HeroCopy />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mosaic ideas, in the original's clothes                              */
/* ------------------------------------------------------------------ */

/** The TISMUN countdown as a clock face: white ticks on black, a petal-orange seconds hand. */
function ClockDial({ start, end, timezoneLabel }: { start: string; end: string; timezoneLabel: string }) {
  const now = useNow();
  const reduce = useReducedMotion();
  const c = countdownParts(now, start, end);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (c.phase !== 'before') return <p className="text-subheading font-light">{c.phase === 'during' ? 'Happening now' : 'Conference complete'}</p>;
  return (
    <div className="flex items-center gap-8">
      <p className="sr-only">
        {c.days} days, {c.hours} hours and {c.mins} minutes until the conference ({timezoneLabel}).
      </p>
      <div aria-hidden className="relative aspect-square w-[min(56vw,220px)] shrink-0">
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
          <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
          {Array.from({ length: 60 }, (_, i) => (
            <line key={i} x1="100" y1={i % 5 ? 8 : 6} x2="100" y2={i % 5 ? 13 : 18} stroke="#fff" strokeOpacity={i % 5 ? 0.35 : 0.9} strokeWidth={i % 5 ? 0.8 : 1.6} transform={`rotate(${i * 6} 100 100)`} />
          ))}
          <g style={{ transform: `rotate(${(60 - c.secs) * 6}deg)`, transformOrigin: '100px 100px', transition: reduce || c.secs === 59 ? 'none' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
            <line x1="100" y1="114" x2="100" y2="22" stroke="#F29839" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="100" cy="100" r="3" fill="#F29839" />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="type-display text-[clamp(2.75rem,8vw,4rem)] tabular">{c.days}</span>
          <span className="mt-1 text-caption text-fog">days</span>
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-1">
        <span className="text-[clamp(1.6rem,3vw,2.25rem)] font-light leading-none tracking-[-0.04em] tabular">
          {pad(c.hours)}:{pad(c.mins)}:{pad(c.secs)}
        </span>
        <span className="text-caption text-fog">hours · minutes · seconds</span>
      </div>
    </div>
  );
}

/** A sent idea drops into the wall as a glass tile of its category's colour. */
function TileSuccess({ category, reset }: { category: string | null; reset: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [slot, setSlot] = useState<{ col: number; row: number } | null>(null);
  const tile = 22;
  const rows = 4;
  useEffect(() => {
    const w = wrap.current!.clientWidth;
    const cols = Math.floor(w / tile);
    const gap = { col: Math.floor(cols * 0.58), row: 1 };
    paintNightStrip(ref.current!, w, tile, Math.min(devicePixelRatio || 1, 2), rows, gap);
    ref.current!.style.width = `${cols * tile}px`;
    ref.current!.style.height = `${rows * tile}px`;
    setSlot(gap);
  }, []);
  return (
    <div className="flex flex-col items-start justify-center py-10" role="status" aria-live="polite">
      <div ref={wrap} className="relative w-full" style={{ height: rows * tile }} aria-hidden>
        <canvas ref={ref} className="block" />
        {slot && (
          <motion.span
            className="absolute block rounded-[2px]"
            style={{ left: slot.col * tile + 1.5, top: slot.row * tile + 1.5, width: tile - 3, height: tile - 3, background: CATEGORY_GLASS[category ?? 'other'], boxShadow: '0 0 18px 2px rgba(255,255,255,0.25), inset 0 2px 0 rgba(255,255,255,0.35)' }}
            initial={reduce ? { opacity: 0 } : { y: -160, rotate: -24, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 240, damping: 19, delay: 0.2 }}
          />
        )}
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.9, duration: 0.6, ease: EASE_OUT }}>
        <h3 className="type-heading mt-8 text-heading-sm sm:text-[44px]">Idea received.</h3>
        <p className="mt-3 max-w-sm text-body-lg text-fog">Thanks for helping build a smarter TIS. Your idea is a tile in the wall now; the council reads every one.</p>
        <button type="button" onClick={reset} className="pill-ghost mt-8">
          Send another idea
        </button>
      </motion.div>
    </div>
  );
}

export default function BlendPage() {
  const reduce = useReducedMotion();
  const [barOpen, setBarOpen] = useState(true);
  const barHeight = barOpen ? BAR_HEIGHT : 0;
  return (
    <Shell world="blend" switcherClass="rounded-pill border border-line-dark bg-obsidian/90 text-fog [&_a]:rounded-pill [&_[data-here]]:bg-paper [&_[data-here]]:text-obsidian">
      <IntroContext.Provider value={true}>
        {barOpen && <AnnouncementBar onClose={() => setBarOpen(false)} />}
        <Navbar offset={barHeight} />
        <main id="main" className="relative z-10" style={{ ['--bar' as string]: `${barHeight}px` }}>
          {reduce ? (
            <>
              <Hero />
              <Mission />
            </>
          ) : (
            <Opening />
          )}
          <Marquee />
          <About />
          <Projects eventView={(e) => <ClockDial {...e} />} />
          <Founders />
          <SuggestionBox renderSuccess={(o) => <TileSuccess {...o} />} />
          <Faq />
        </main>
        <Footer />
      </IntroContext.Provider>
    </Shell>
  );
}
