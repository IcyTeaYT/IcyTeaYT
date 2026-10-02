import './blend.css';
import '@fontsource-variable/jetbrains-mono';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Shell } from '../shared/Shell';
import { AnnouncementBar, BAR_HEIGHT } from '@/components/AnnouncementBar';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/sections/Hero';
import { Mission } from '@/components/sections/Mission';
import { SuggestionBox } from '@/components/sections/SuggestionBox';
import { Faq } from '@/components/sections/Faq';
import { Footer } from '@/components/sections/Footer';
import { SplitText } from '@/components/ui/SplitText';
import { Magnetic } from '@/components/ui/Magnetic';
import { Arrow } from '@/components/ui/Arrow';
import { HERO, MISSION } from '@/data/copy';
import { IntroContext } from '@/lib/intro';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { drawFacade, layoutFacade, throughScale, type Facade } from '../mosaic/paint';
import { CATEGORY_GLASS, courses, paintNightMural, paintNightStrip } from './night';
import { drawLit, layoutTileText, paintWall, type TileText } from './tileText';
import { Frieze, MosaicAbout, MosaicFounders, MosaicProjects } from './sections';

/**
 * Option: the original site's black and white, with the Mosaic laid in dark
 * glass. The opening flies through a black lattice facade to the council's
 * flower in mosaic and dives into it; inside, a wall of dark tiles lights up
 * to spell the mission. The sections after it are the Mosaic option's, made
 * dark: arched cells, the TISMUN plaque and clock, the founders in niches,
 * and a sent idea dropping into the wall as a tile.
 */
const NAV_H = 72;
const NIGHT_WALL = { wall: '#0b0b0b', shade: '#050505', joint: '#1c1c1c' };
/** The opening's scroll, in screens; `at` turns a point in it into progress. */
const SCROLL = 3.6;
const at = (screens: number) => screens / SCROLL;
/** Where "Mission" in the nav lands: inside the tile wall, the letters about to light. */
const MISSION_AT = at(2.3);

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

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
  dpr: number;
  flower: { x: number; y: number };
  f: Facade;
  smax: number;
  tt: TileText | null;
}

/**
 * The opening, pinned for 3.6 screens of scroll:
 *   0.1–1.3   fly through the lattice (its doors part) to the mural
 *   1.3–1.65  a beat on the flower
 *   1.65–2.2  dive into the flower until the glass goes dark
 *   1.95–3.1  inside: a wall of dark tiles, and the mission lights up in it
 */
function Opening() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const muralBox = useRef<HTMLDivElement>(null);
  const muralCv = useRef<HTMLCanvasElement>(null);
  const facadeCv = useRef<HTMLCanvasElement>(null);
  const signBox = useRef<HTMLDivElement>(null);
  const wallBox = useRef<HTMLDivElement>(null);
  const wallCv = useRef<HTMLCanvasElement>(null);
  const litCv = useRef<HTMLCanvasElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const geoRef = useRef<Geo | null>(null);
  geoRef.current = geo;
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const support = useTransform(p, ...span([at(3.0), at(3.25)], [0, 1]));
  const supportY = useTransform(p, ...span([at(3.0), at(3.25)], [20, 0]));

  // Lay out for this viewport; paint the mural and the tile wall when the browser is idle.
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
      const f = layoutFacade(W, H, NAV_H);
      const fc = facadeCv.current!;
      fc.width = Math.round(W * dpr);
      fc.height = Math.round(H * dpr);
      setGeo({ W, H, dpr, flower, f, smax: throughScale(W, H, f), tt: null });
      const mcv = muralCv.current!;
      mcv.style.opacity = '0';
      const paint = async () => {
        paintNightMural(mcv, W, H, H, dpr, courses(W, H), flower, R);
        mcv.style.width = `${W}px`;
        mcv.style.height = `${H}px`;
        mcv.style.opacity = '1';
        // The letters are cut from the real type, so wait for it.
        await document.fonts.load('650 100px "Inter Variable"').catch(() => undefined);
        const pad = Math.max(0, (W - 1200) / 2) + (W >= 640 ? 32 : 20);
        const tt = layoutTileText(W, H, MISSION.line, pad);
        paintWall(wallCv.current!, W, H, tt.ts, dpr);
        wallCv.current!.style.width = litCv.current!.style.width = `${W}px`;
        wallCv.current!.style.height = litCv.current!.style.height = `${H}px`;
        setGeo((g) => (g && g.W === W && g.H === H ? { ...g, tt } : g));
      };
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(() => void paint(), { timeout: 400 });
      else window.setTimeout(() => void paint(), 60);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const raf = useRef(0);
  const apply = (v: number) => {
    const g = geoRef.current;
    if (!g || !muralBox.current) return;
    const { W, H, flower, f } = g;
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

    // The mural drifts closer behind the lattice, holds on the flower, then the camera dives into it.
    const dive = seg(v, at(1.65), at(2.2));
    const ms = (1 + 0.08 * fly + 0.12 * inOut(seg(v, at(1.3), at(1.65)))) * Math.pow(6, dive * dive);
    const fade = smooth(seg(v, at(1.85), at(2.2)));
    muralBox.current.style.transformOrigin = `${flower.x}px ${flower.y}px`;
    muralBox.current.style.transform = `scale(${ms})`;
    muralBox.current.style.opacity = String(1 - fade);
    muralBox.current.style.visibility = fade >= 1 ? 'hidden' : 'visible';

    // Inside: the tile wall comes up out of the dark, settling from close in, then the letters light.
    if (wallBox.current) {
      const inn = seg(v, at(1.95), at(2.2));
      const land = settle(seg(v, at(1.95), at(2.4)));
      wallBox.current.style.opacity = String(inn);
      wallBox.current.style.visibility = inn <= 0 ? 'hidden' : 'visible';
      wallBox.current.style.transform = `scale(${1.25 - 0.25 * land})`;
      if (g.tt && litCv.current && inn > 0) drawLit(litCv.current, W, H, g.dpr, g.tt, seg(v, at(2.3), at(3.1)));
    }
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
        <div ref={muralBox} className="absolute inset-0">
          <canvas ref={muralCv} aria-hidden className="absolute left-0 top-0 transition-opacity duration-700" />
        </div>
        <canvas ref={facadeCv} aria-hidden className="absolute inset-0 h-full w-full" />
        <div ref={signBox} className="absolute inset-0 origin-top-left">
          <div className="absolute inset-x-0 bottom-0" style={{ top: geo?.f.bandTop ?? '60%' }}>
            <div className="container-x flex h-full flex-col justify-center pb-[calc(4rem+var(--bar,0px))] pt-4 sm:pb-[calc(2.5rem+var(--bar,0px))]">
              <HeroCopy />
            </div>
          </div>
        </div>
        {/* Inside the flower: the mission, spelled in tiles. */}
        <div ref={wallBox} className="pointer-events-none absolute inset-0 origin-center" style={{ visibility: 'hidden' }}>
          <canvas ref={wallCv} aria-hidden className="absolute left-0 top-0" />
          <canvas ref={litCv} aria-hidden className="absolute left-0 top-0" />
          <h2 id="mission-title" className="sr-only">
            {MISSION.line}
          </h2>
          {geo?.tt && (
            <motion.p className="absolute max-w-[46ch] text-body-lg text-fog" style={{ left: geo.tt.left, top: geo.tt.bottom + 24, right: 20, opacity: support, y: supportY }}>
              {MISSION.support}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* A sent idea, laid into the wall                                      */
/* ------------------------------------------------------------------ */

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
        <main id="main" className="relative z-10 bg-obsidian" style={{ ['--bar' as string]: `${barHeight}px` }}>
          {reduce ? (
            <>
              <Hero />
              <Mission />
            </>
          ) : (
            <Opening />
          )}
          <MosaicAbout />
          <Frieze />
          <MosaicProjects />
          <Frieze />
          <MosaicFounders />
          <Frieze />
          <SuggestionBox renderSuccess={(o) => <TileSuccess {...o} />} />
          <Faq />
        </main>
        <Footer />
      </IntroContext.Provider>
    </Shell>
  );
}
