import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
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
import { HERO, MISSION, MOTTO } from '@/data/copy';
import { IntroContext } from '@/lib/intro';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { countdownParts } from '@/lib/suggestion';
import { drawFacade, layoutFacade, throughScale, type Facade } from '../mosaic/paint';
import { CATEGORY_GLASS, courses, paintNightMural, paintNightStrip, type Course } from './night';
import { LineField } from './LineField';

/**
 * Option: the original site, with the Mosaic folded in. Two openings to
 * compare (`?hero=`): the wave lines are laid as glass tiles ("lines"), or the
 * camera flies through a concrete lattice at night into the same mural
 * ("night"). After that it is the original site, with the countdown as a
 * clock face and a sent idea dropping into the wall as a tile.
 */
type Variant = 'lines' | 'night';
const VARIANTS: { id: Variant; label: string }[] = [
  { id: 'lines', label: 'Lines → tiles' },
  { id: 'night', label: 'Night lattice' },
];
const NAV_H = 72;
const NIGHT_WALL = { wall: '#0b0b0b', shade: '#050505', joint: '#1c1c1c' };
// Scroll progress at which the lines have settled, and at which the last of them is tiled.
const SETTLED = 0.05;
const TILED = 0.42;

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

function readVariant(): Variant {
  const q = new URLSearchParams(window.location.search).get('hero');
  return q === 'night' ? 'night' : 'lines';
}

/* ------------------------------------------------------------------ */
/* Shared pieces of the opening                                        */
/* ------------------------------------------------------------------ */

function Word({ children, p, range }: { children: string; p: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(p, ...span(range, [0.16, 1]));
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

/** The original pinned mission, lit word by word, set over the mural. */
function MissionOverlay({ p }: { p: MotionValue<number> }) {
  const words = MISSION.line.split(' ');
  const scrim = useTransform(p, ...span([0.48, 0.6], [0, 1]));
  const textOpacity = useTransform(p, ...span([0.5, 0.58], [0, 1]));
  const support = useTransform(p, ...span([0.86, 0.93], [0, 1]));
  const supportY = useTransform(p, ...span([0.86, 0.93], [20, 0]));
  return (
    <>
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.86)_48%,rgba(0,0,0,0)_74%)] sm:bg-[radial-gradient(120%_90%_at_0%_100%,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.7)_45%,rgba(0,0,0,0)_75%)]" style={{ opacity: scrim }} />
      <motion.div className="absolute inset-x-0 bottom-0" style={{ opacity: textOpacity }}>
        <div className="container-x pb-24 sm:pb-28">
          <h2 id="mission-title" className="type-display max-w-[16ch] text-[clamp(2.6rem,6.2vw,5.5rem)] text-paper">
            <span className="sr-only">{MISSION.line}</span>
            <span aria-hidden>
              {words.map((w, i) => (
                <Word key={i} p={p} range={[0.58 + (i / words.length) * 0.26, 0.58 + ((i + 1) / words.length) * 0.26]}>
                  {w}
                </Word>
              ))}
            </span>
          </h2>
          <motion.p className="mt-8 max-w-[46ch] text-body-lg text-fog" style={{ opacity: support, y: supportY }}>
            {MISSION.support}
          </motion.p>
        </div>
      </motion.div>
    </>
  );
}

function HeroCopy({ compact = false }: { compact?: boolean }) {
  const { scrollTo } = useSmoothScroll();
  return (
    <>
      <h1 id="hero-title" className={`type-display max-w-[14ch] ${compact ? 'text-[clamp(2.3rem,4.8vw,4.2rem)]' : 'text-[clamp(3rem,7.4vw,6rem)]'}`}>
        <SplitText text={HERO.title} play delay={0.15} stagger={0.07} />
      </h1>
      <div className={compact ? 'mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between' : ''}>
        <motion.p
          className={`max-w-[40ch] text-body-lg text-fog ${compact ? '' : 'mt-8'}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.7 }}
        >
          {HERO.lede}
        </motion.p>
        <motion.div
          className={`flex flex-wrap items-center ${compact ? 'gap-x-3 gap-y-2' : 'mt-10 gap-4'}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.85 }}
        >
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
            className={`min-h-[48px] items-center px-2 text-body text-fog transition-colors hover:text-paper ${compact ? 'hidden sm:inline-flex' : 'inline-flex'}`}
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
  cs: Course[];
  flower: { x: number; y: number };
  R: number;
  f: Facade;
  smax: number;
  narrow: boolean;
}

/* ------------------------------------------------------------------ */
/* The opening                                                          */
/* ------------------------------------------------------------------ */

function Opening({ variant }: { variant: Variant }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const linesBox = useRef<HTMLDivElement>(null);
  const muralBox = useRef<HTMLDivElement>(null);
  const muralCv = useRef<HTMLCanvasElement>(null);
  const facadeCv = useRef<HTMLCanvasElement>(null);
  const signBox = useRef<HTMLDivElement>(null);
  const copyBox = useRef<HTMLDivElement>(null);
  const sweepLine = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const geoRef = useRef<Geo | null>(null);
  geoRef.current = geo;
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const night = variant === 'night';

  // Lay out and paint for this viewport: lines at once, the mural when the browser is idle.
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
      const cs = courses(W, H);
      const flower = { x: W * (narrow ? 0.6 : 0.7), y: H * (narrow ? 0.3 : 0.42) };
      const R = Math.min(W, H) * (narrow ? 0.25 : 0.24);
      const f = layoutFacade(W, H, NAV_H);
      const fc = facadeCv.current;
      if (fc) {
        fc.width = Math.round(W * dpr);
        fc.height = Math.round(H * dpr);
      }
      setGeo({ W, H, cs, flower, R, f, smax: throughScale(W, H, f), narrow });
      const mcv = muralCv.current!;
      mcv.style.opacity = '0';
      const paint = () => {
        paintNightMural(mcv, W, H, dpr, cs, flower, R);
        mcv.style.width = `${W}px`;
        mcv.style.height = `${H}px`;
        mcv.style.opacity = '1';
      };
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(paint, { timeout: 400 });
      else window.setTimeout(paint, 60);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [night]);

  const raf = useRef(0);
  const apply = (v: number) => {
    const g = geoRef.current;
    if (!g || !muralBox.current) return;
    const { W, H, flower, narrow } = g;
    if (!night) {
      // The lines settle, are laid as tiles from left to right, then the camera moves in on the flower.
      const sweep = seg(v, SETTLED + 0.01, TILED - 0.02);
      const x = -60 + sweep * (W + 120);
      muralBox.current.style.clipPath = `inset(0 ${Math.max(0, W - x)}px 0 0)`;
      if (linesBox.current) linesBox.current.style.clipPath = `inset(0 0 0 ${Math.max(0, x)}px)`;
      if (sweepLine.current) {
        sweepLine.current.style.transform = `translate3d(${x}px,0,0)`;
        sweepLine.current.style.opacity = sweep > 0 && sweep < 1 ? '1' : '0';
      }
      const ms = 1 + (narrow ? 0.16 : 0.24) * inOut(seg(v, 0.4, 0.62));
      muralBox.current.style.transformOrigin = `${flower.x}px ${flower.y}px`;
      muralBox.current.style.transform = `scale(${ms})`;
      if (copyBox.current) {
        const out = seg(v, 0.02, 0.09);
        copyBox.current.style.opacity = String(1 - out);
        copyBox.current.style.transform = `translate3d(0,${-40 * out}px,0)`;
      }
      return;
    }
    // Night: fly through the lattice; the mural waits behind it.
    const f = g.f;
    const T = f.target;
    const s = Math.pow(g.smax, inOut(seg(v, 0.04, 0.42)));
    const pan = smooth(seg(v, 0.04, 0.28));
    const doors = settle(seg(v, 0.06, 0.18));
    const cv = facadeCv.current;
    if (cv) {
      const through = s >= g.smax * 0.995;
      cv.style.opacity = through ? '0' : '1';
      if (!through) drawFacade(cv.getContext('2d')!, W, H, cv.width / W, f, s, pan, doors, NIGHT_WALL);
    }
    const px = T.x + (W / 2 - T.x) * pan;
    const py = T.y + (H / 2 - T.y) * pan;
    if (signBox.current) {
      signBox.current.style.transform = `translate(${px}px,${py}px) scale(${s}) translate(${-T.x}px,${-T.y}px)`;
      const out = seg(v, 0.05, 0.16);
      signBox.current.style.opacity = String(1 - out);
      signBox.current.style.visibility = out >= 1 ? 'hidden' : 'visible';
    }
    const ms = 1 + (narrow ? 0.06 : 0.08) * inOut(seg(v, 0.04, 0.42)) + (narrow ? 0.1 : 0.14) * inOut(seg(v, 0.45, 0.62));
    muralBox.current.style.transformOrigin = `${flower.x}px ${flower.y}px`;
    muralBox.current.style.transform = `scale(${ms})`;
  };
  useEffect(() => apply(p.get()), [geo]); // first frame and every re-layout
  useMotionValueEvent(p, 'change', (v) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => apply(v));
  });

  return (
    <section id="top" ref={section} data-surface="dark" aria-labelledby="hero-title" className="relative bg-obsidian text-paper" style={{ height: 'calc(430svh - var(--bar, 0px))' }}>
      {/* Where "Mission" in the nav lands: the mission is on the mural. */}
      <div id="mission" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: 'calc(330svh * 0.62)' }} />
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[600px] overflow-hidden">
        <div ref={muralBox} className="absolute inset-0" style={night ? undefined : { clipPath: 'inset(0 100% 0 0)' }}>
          <canvas ref={muralCv} aria-hidden className="absolute left-0 top-0 transition-opacity duration-700" />
        </div>

        {!night && (
          <>
            <div ref={linesBox} className="absolute inset-0">
              <LineField progress={p} settleBy={SETTLED} goneAt={TILED} />
            </div>
            {/* The laying edge: a seam of light where lines become glass. */}
            <div ref={sweepLine} aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-paper opacity-0 shadow-[0_0_24px_6px_rgba(255,255,255,0.35)]" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" style={{ opacity: 0.9 }} />
            <div ref={copyBox} className="absolute inset-x-0 bottom-0">
              <div className="container-x pb-[calc(5rem+var(--bar,0px))] pt-40 sm:pb-[calc(7rem+var(--bar,0px))]">
                <HeroCopy />
              </div>
              <p className="absolute bottom-[calc(2rem+var(--bar,0px))] right-5 hidden text-caption text-fog sm:right-8 md:block">{MOTTO}</p>
            </div>
          </>
        )}

        {night && (
          <>
            <canvas ref={facadeCv} aria-hidden className="absolute inset-0 h-full w-full" />
            <div ref={signBox} className="absolute inset-0 origin-top-left">
              <div className="absolute inset-x-0 bottom-0" style={{ top: geo?.f.bandTop ?? '60%' }}>
                <div className="container-x flex h-full flex-col justify-center pb-[calc(4rem+var(--bar,0px))] pt-4 sm:pb-[calc(2.5rem+var(--bar,0px))]">
                  <HeroCopy compact />
                </div>
              </div>
            </div>
          </>
        )}

        <MissionOverlay p={p} />
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

/**
 * Preview-only: compare the two openings. Above the switcher on wide
 * screens; on phones it sits under the nav at the top of the page and gets
 * out of the way once the opening starts.
 */
function VariantPicker({ current, offset }: { current: Variant; offset: number }) {
  const { scrollY } = useScroll();
  const [narrow] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const top = useTransform(scrollY, (y) => Math.max(0, offset - y) + NAV_H + 8);
  const opacity = useTransform(scrollY, (y) => (narrow ? Math.max(0, 1 - y / 160) : 1));
  const [shown, setShown] = useState(true);
  useMotionValueEvent(opacity, 'change', (o) => setShown(o > 0.05));
  return (
    <motion.nav
      aria-label="Compare openings"
      style={{ top, opacity }}
      className={`fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill border border-line-dark bg-obsidian/90 p-1 text-[12px] text-fog md:!top-auto md:bottom-[68px] md:text-[13px] ${shown ? '' : 'pointer-events-none invisible'}`}
    >
      {VARIANTS.map((v) => (
        <a key={v.id} href={`?hero=${v.id}`} aria-current={v.id === current ? 'page' : undefined} className={`rounded-pill px-3 py-1 transition-colors md:py-1.5 ${v.id === current ? 'bg-paper text-obsidian' : 'hover:text-paper'}`}>
          {v.label}
        </a>
      ))}
    </motion.nav>
  );
}

export default function BlendPage() {
  const reduce = useReducedMotion();
  const [variant] = useState(readVariant);
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
            <Opening variant={variant} />
          )}
          <Marquee />
          <About />
          <Projects eventView={(e) => <ClockDial {...e} />} />
          <Founders />
          <SuggestionBox renderSuccess={(o) => <TileSuccess {...o} />} />
          <Faq />
        </main>
        <Footer />
        {!reduce && <VariantPicker current={variant} offset={barHeight} />}
      </IntroContext.Provider>
    </Shell>
  );
}
