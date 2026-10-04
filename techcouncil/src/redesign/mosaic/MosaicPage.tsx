import '@fontsource-variable/unbounded';
import '@fontsource-variable/onest';
import './mosaic.css';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Shell } from '../shared/Shell';
import { LogoMark } from '@/components/brand/LogoMark';
import { Owl } from '@/components/brand/Owl';
import { TismunLogo } from '@/components/brand/TismunLogo';
import { useNow } from '@/components/sections/Countdown';
import { ABOUT, FAQ, HERO, MISSION, MOTTO, SUGGEST, WORK } from '@/data/copy';
import { founders, isPlaceholder } from '@/data/founders';
import { featuredProject } from '@/data/projects';
import { CATEGORIES, GRADE_MAX, NAME_MAX, SUGGESTION_MAX, SUGGESTION_MIN, type CategoryId } from '@/data/categories';
import { countdownParts, useSuggestionForm } from '@/lib/suggestion';
import { span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { drawFacade, grainUrl, layoutFacade, paintArchPanel, paintMural, paintStrip, throughScale, TILE, type Facade, type Mural } from './paint';

const EASE = [0.16, 1, 0.3, 1] as const;
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const NAV_H = 64;

/** Each suggestion category has its tile colour. */
const CATEGORY_TILE: Record<CategoryId, readonly [number, number, number]> = {
  network: TILE.cyan,
  classroom: TILE.teal,
  apps: TILE.orange,
  campus: TILE.maroon,
  other: TILE.ink,
};
const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

const NAV = [
  ['mission', 'Mission'],
  ['about', 'What we do'],
  ['projects', 'TISMUN'],
  ['founders', 'Founders'],
  ['faq', 'Questions'],
] as const;

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function useScrollTo() {
  const { scrollTo } = useSmoothScroll();
  return (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo(`#${id}`, { offset: -NAV_H });
  };
}

/** A course of mosaic between sections, like a frieze. */
function Frieze({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const cols = paintStrip(cv, cv.parentElement!.clientWidth + 14, 14, Math.min(devicePixelRatio || 1, 2), 1, null);
      cv.style.width = `${cols * 14}px`;
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv.parentElement!);
    return () => ro.disconnect();
  }, []);
  return (
    <div aria-hidden className={`h-[14px] overflow-hidden ${className}`}>
      <canvas ref={ref} className="block h-[14px]" />
    </div>
  );
}

/** Building-sign lettering: wide caps, cast in relief off the concrete. */
function Sign({ children, className = '', as: Tag = 'h2', id, relief = true }: { children: ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3'; id?: string; relief?: boolean }) {
  return (
    <Tag id={id} className={`font-sign font-semibold uppercase leading-[1.06] tracking-[0.01em] ${relief ? 'mz-cast' : ''} ${className}`}>
      {children}
    </Tag>
  );
}

function InkButton({ href, onClick, children }: { href?: string; onClick?: (e: React.MouseEvent) => void; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="inline-flex min-h-[52px] items-center gap-3 bg-smalt-white px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] text-ink transition-colors duration-200 hover:bg-smalt-orange"
    >
      {children}
    </a>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Nav: the lattice drives it                                          */
/* ------------------------------------------------------------------ */

function useActive(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        let best: string | null = null;
        let r = 0;
        seen.forEach((v, k) => {
          if (v > r) [best, r] = [k, v];
        });
        setActive(best);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.01, 0.5, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const NAV_IDS = NAV.map(([id]) => id);

function Nav() {
  const go = useScrollTo();
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();
  const active = useActive(NAV_IDS);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#B4AC9E] bg-concrete">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
          }}
          className="flex items-center gap-3"
          aria-label="TIS Tech Council, back to top"
        >
          <LogoMark className="h-8 w-8 text-ink" />
          <span className="font-sign text-[13px] font-semibold uppercase tracking-[0.04em]">TIS Tech Council</span>
        </a>
        {/* Each link is a cell of the lattice; the section you are in is the lit one. */}
        <ul className="hidden h-16 items-end gap-1.5 lg:flex">
          {NAV.map(([id, label]) => (
            <li key={id} className="h-[46px]">
              <a
                href={`#${id}`}
                onClick={go(id)}
                aria-current={active === id ? 'location' : undefined}
                className={`flex h-full items-center rounded-t-full border-x border-t px-4 pt-2 font-onest text-[14px] transition-colors duration-300 ${
                  active === id ? 'border-ink bg-ink text-smalt-white' : 'border-[#B4AC9E] text-ink/80 hover:border-ink hover:text-ink'
                }`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a href="#suggestions" onClick={go('suggestions')} className="hidden min-h-[44px] items-center bg-ink px-4 font-sign text-[12px] font-medium uppercase tracking-[0.06em] text-smalt-white transition-colors hover:bg-smalt-teal sm:inline-flex">
            Suggest an idea
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls="mz-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-6">
              <span className={`absolute left-0 h-[2px] w-6 bg-ink transition-transform duration-300 ${open ? 'top-[5px] rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-[2px] w-6 bg-ink transition-transform duration-300 ${open ? 'top-[5px] -rotate-45' : 'top-[10px]'}`} />
            </span>
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mz-menu"
            className="border-t border-[#B4AC9E] bg-concrete lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <ul className="grid grid-cols-2 gap-2 px-5 pb-6 pt-4">
              {[...NAV, ['suggestions', 'Suggest an idea'] as const].map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      setOpen(false);
                      go(id)(e);
                    }}
                    className={`flex min-h-[64px] items-end rounded-t-[40px] border-x border-t px-4 pb-3 font-sign text-[15px] font-semibold uppercase ${
                      active === id ? 'border-ink bg-ink text-smalt-white' : 'border-[#B4AC9E]'
                    }`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* The approach: facade > through the lattice > the mural > one tile    */
/* ------------------------------------------------------------------ */

interface Geo {
  W: number;
  H: number;
  f: Facade;
  smax: number;
  mural: Mural;
  MW: number;
  MH: number;
  tile: number;
  narrow: boolean;
}

/** Scroll progress through the pinned approach, and what happens when. */
const PHASE = {
  facade: [0.04, 0.44] as const, // dolly through the lattice
  pan: [0.04, 0.3] as const, // the chosen opening slides to the centre
  doors: [0.07, 0.2] as const, // its lattice parts
  sign: [0.05, 0.18] as const, // the sign band leaves frame
  glide: [0.48, 0.76] as const, // down the mural to the inscription
  push: [0.86, 1] as const, // into one tile
};

function Approach() {
  const reduce = !!useReducedMotion();
  const go = useScrollTo();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const facadeCv = useRef<HTMLCanvasElement>(null);
  const muralCv = useRef<HTMLCanvasElement>(null);
  const muralBox = useRef<HTMLDivElement>(null);
  const signBox = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const geoRef = useRef<Geo | null>(null);
  geoRef.current = geo;
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const still = useMotionValue(0);
  const p = reduce ? still : scrollYProgress;
  const inscription = useTransform(p, ...span([0.86, 0.9], [1, 0]));

  // Lay out and paint for this viewport; repaint only on resize.
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
      const f = layoutFacade(W, H, NAV_H);
      const T = f.target;
      const R = Math.min(W, H) * (narrow ? 0.3 : 0.27);
      // Sized so the mural covers the frame at every point of the camera path:
      // behind the opening at rest, centred after the pan, and along the glide.
      const flower = { x: Math.max(T.x, W / 2) + W * 0.05, y: Math.max(T.y + H * 0.04, R * 1.3) };
      const MW = flower.x + W - Math.min(T.x, W / 2) + W * 0.05;
      const bandTop = flower.y + R * 1.12;
      const bandH = H * (narrow ? 0.74 : 0.58);
      const MH = bandTop + bandH + H * 0.4;
      const tile = narrow ? 11 : 13;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cv = facadeCv.current!;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const band = { x: 0, y: bandTop, w: MW, h: bandH };
      setGeo({ W, H, f, smax: throughScale(W, H, f), mural: { flower, band, push: { x: MW / 2, y: bandTop + bandH } }, MW, MH, tile, narrow });
      // The mural is the one heavy paint: do it when the browser is idle, then let it fade in.
      const mcv = muralCv.current!;
      mcv.style.opacity = '0';
      const paint = () => {
        const mural = paintMural(mcv, MW, MH, tile, dpr * 1.1, { flower, R, bandTop, bandH });
        mcv.style.width = `${MW}px`;
        mcv.style.height = `${MH}px`;
        mcv.style.opacity = '1';
        setGeo((g) => (g && g.W === W && g.H === H ? { ...g, mural } : g));
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
    const cv = facadeCv.current;
    if (!g || !cv || !muralBox.current || !signBox.current) return;
    const { W, H, f, mural } = g;
    const T = f.target;
    const C = { x: W / 2, y: H / 2 };

    // The facade camera: zoom on an exponential (a constant-speed dolly), pan the opening to centre.
    const s = Math.pow(g.smax, inOut(seg(v, ...PHASE.facade)));
    const pan = smooth(seg(v, ...PHASE.pan));
    const open = settle(seg(v, ...PHASE.doors));
    const through = s >= g.smax * 0.995;
    cv.style.opacity = through ? '0' : '1';
    if (!through) drawFacade(cv.getContext('2d')!, W, H, cv.width / W, f, s, pan, open);
    const px = T.x + (C.x - T.x) * pan;
    const py = T.y + (C.y - T.y) * pan;
    signBox.current.style.transform = `translate(${px}px,${py}px) scale(${s}) translate(${-T.x}px,${-T.y}px)`;
    signBox.current.style.opacity = String(1 - seg(v, ...PHASE.sign));
    signBox.current.style.visibility = v > PHASE.sign[1] ? 'hidden' : 'visible';

    // The mural camera: behind the opening, then down to the inscription, then into one tile.
    const band = { x: mural.band.x + mural.band.w / 2, y: mural.band.y + mural.band.h / 2 };
    const eA = inOut(seg(v, ...PHASE.facade));
    const eB = inOut(seg(v, ...PHASE.glide));
    const tC = seg(v, ...PHASE.push);
    const eC = tC * tC * tC;
    let M = { x: mural.flower.x + (band.x - mural.flower.x) * eB, y: mural.flower.y + (band.y - mural.flower.y) * eB };
    let ms = 1 + 0.1 * eA - 0.1 * eB;
    if (tC > 0) {
      const k = Math.min(1, tC * 1.8);
      M = { x: band.x + (mural.push.x - band.x) * k, y: band.y + (mural.push.y - band.y) * k };
      ms = Math.pow(Math.max(W, H) / (g.tile * 0.7), eC);
    }
    const S = { x: T.x + (C.x - T.x) * pan, y: T.y + (C.y - T.y) * pan };
    muralBox.current.style.transform = `translate(${S.x - M.x * ms}px,${S.y - M.y * ms}px) scale(${ms})`;
    // At the very end the tile is the whole frame: hand over to a flat field of its colour.
    if (fill.current) fill.current.style.opacity = String(seg(v, 0.95, 0.99));
  };
  useEffect(() => apply(p.get()), [geo]);
  useMotionValueEvent(p, 'change', (v) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => apply(v));
  });

  const band = geo?.mural.band;

  return (
    <section id="top" ref={section} aria-labelledby="hero-title" className="relative bg-concrete" style={{ height: reduce ? undefined : '420svh' }}>
      {/* Where "Mission" in the nav lands: the inscription is in frame. */}
      {!reduce && <div id="mission" aria-hidden className="pointer-events-none absolute left-0" style={{ top: 'calc(320svh * 0.8)' }} />}
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden bg-concrete">
        {/* The mural, with the mission inlaid in its inscription band. */}
        <div ref={muralBox} className="absolute left-0 top-0 origin-top-left" style={{ width: geo?.MW, height: geo?.MH }}>
          <canvas ref={muralCv} aria-hidden className="absolute left-0 top-0 transition-opacity duration-700" />
          {band && !reduce && (
            <motion.div className="absolute flex flex-col justify-center" style={{ left: (geo.MW - geo.W) / 2 + 20, width: geo.W - 40, top: band.y + geo.tile * 2, height: band.h - geo.tile * 4, opacity: inscription }}>
              <div className="mx-auto w-full max-w-[1280px] px-1 sm:px-6">
                <Sign id="mission-title" relief={false} className="text-[clamp(1.7rem,4.6vw,4.4rem)] leading-[1.04]">
                  {MISSION.line}
                </Sign>
                <p className="mt-6 max-w-[54ch] font-onest text-[16px] leading-[1.55] text-ink sm:text-[19px]">{MISSION.support}</p>
              </div>
            </motion.div>
          )}
        </div>
        <canvas ref={facadeCv} aria-hidden className="absolute inset-0 h-full w-full" />
        <div ref={fill} aria-hidden className="absolute inset-0 bg-smalt-orange opacity-0" />

        {/* The sign band rides the same camera as the facade. */}
        <div ref={signBox} className="absolute inset-0 origin-top-left">
          <div className="mz-grain pointer-events-none absolute inset-x-0 bottom-0 opacity-60" style={{ top: geo?.f.bandTop ?? '60%' }} aria-hidden />
          <div className="absolute inset-x-0 bottom-0" style={{ top: geo?.f.bandTop ?? '60%' }}>
            <div className="mx-auto grid h-full max-w-[1320px] content-center gap-4 px-5 pb-6 pt-4 sm:px-8 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-12">
              <Sign as="h1" id="hero-title" className="max-w-[17ch] text-[clamp(1.6rem,4.3vw,4.2rem)]">
                {HERO.title}
              </Sign>
              {/* The ink plaque mounted on the band. */}
              <div className="bg-ink px-5 py-5 text-smalt-white shadow-[0_6px_14px_rgba(28,26,23,0.28)] sm:px-7 sm:py-6">
                <p className="font-onest text-[15px] leading-[1.5] text-smalt-white/85 sm:text-[17px]">{HERO.lede}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 sm:mt-5">
                  <InkButton href="#suggestions" onClick={go('suggestions')}>
                    Suggest an idea <Arrow />
                  </InkButton>
                  <a href="#projects" onClick={go('projects')} className="font-onest text-[15px] underline decoration-1 underline-offset-[6px] hover:decoration-2 sm:text-[16px]">
                    See what we’ve built
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Reduced motion: the mission sits as a plain inscription after the facade. */
function StillMission() {
  return (
    <section id="mission" aria-labelledby="mission-title" className="border-y-[14px] border-ink bg-smalt-white py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Sign id="mission-title" relief={false} className="text-[clamp(1.7rem,4.6vw,4.4rem)]">
          {MISSION.line}
        </Sign>
        <p className="mt-6 max-w-[54ch] font-onest text-[18px] leading-[1.55]">{MISSION.support}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* What we do: three cells of the lattice                              */
/* ------------------------------------------------------------------ */

function ArchPanel({ color, seed }: { color: readonly [number, number, number]; seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const w = cv.parentElement!.clientWidth;
      const h = Math.round(w * 0.82);
      paintArchPanel(cv, w, h, w < 300 ? 11 : 12, Math.min(devicePixelRatio || 1, 2), color, seed);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv.parentElement!);
    return () => ro.disconnect();
  }, [color, seed]);
  return <canvas ref={ref} aria-hidden className="block" />;
}

const WORK_TILES = [TILE.orange, TILE.teal, TILE.cyan] as const;

function Cell({ w, i }: { w: (typeof WORK)[number]; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.45'] });
  // The cells come forward out of the wall one after another, like a dolly along the facade.
  const lag = i * 0.1;
  const y = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [90, 0]), { ease: settle });
  const scale = useTransform(p, ...span([lag, 1], reduce ? [1, 1] : [0.92, 1]), { ease: settle });
  return (
    <motion.li ref={ref} style={{ y, scale }} className={`flex flex-col overflow-hidden rounded-t-full border-[3px] border-ink bg-concrete ${i === 1 ? 'md:mt-16' : i === 2 ? 'md:mt-32' : ''}`}>
      <ArchPanel color={WORK_TILES[i]!} seed={31 + i * 17} />
      <div className="border-t-[3px] border-ink px-6 pb-8 pt-6">
        <h3 className="font-sign text-[clamp(1.05rem,1.6vw,1.35rem)] font-semibold uppercase leading-tight tracking-[0.01em]">{w.title}</h3>
        <p className="mt-3 font-onest text-[17px] leading-[1.6] text-ink/85">{w.body}</p>
      </div>
    </motion.li>
  );
}

function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative bg-concrete pb-24 pt-20 sm:pb-32 sm:pt-28">
      <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
        <Sign id="about-title" className="max-w-[22ch] text-[clamp(1.75rem,3.6vw,3.3rem)]">
          {ABOUT.title}
        </Sign>
        <div className="mt-6 grid max-w-[980px] gap-4 md:grid-cols-2 md:gap-10">
          {ABOUT.body.map((t) => (
            <p key={t} className="font-onest text-[17px] leading-[1.6] text-ink/85 sm:text-[18px]">
              {t}
            </p>
          ))}
        </div>
        <ul className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
          {WORK.map((w, i) => (
            <Cell key={w.title} w={w} i={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TISMUN: the plaque and the building clock                           */
/* ------------------------------------------------------------------ */

function BuildingClock({ start, end, timezoneLabel }: { start: string; end: string; timezoneLabel: string }) {
  const now = useNow();
  const reduce = useReducedMotion();
  const c = countdownParts(now, start, end);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <figure className="flex flex-col items-center">
      <div className="relative aspect-square w-[min(84vw,420px)] rounded-full bg-concrete p-[5%] text-ink shadow-[inset_0_-6px_14px_rgba(28,26,23,0.25)]">
        <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full">
          {ticks.map((i) => (
            <line key={i} x1="100" y1={i % 5 ? 9 : 7} x2="100" y2={i % 5 ? 14 : 20} stroke="#1C1A17" strokeWidth={i % 5 ? 0.8 : 2.2} transform={`rotate(${i * 6} 100 100)`} />
          ))}
          {/* The seconds hand counts down with the conference. */}
          <g style={{ transform: `rotate(${(60 - c.secs) * 6}deg)`, transformOrigin: '100px 100px', transition: reduce || c.secs === 59 ? 'none' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
            <line x1="100" y1="112" x2="100" y2="24" stroke="#951E34" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="100" cy="100" r="3.2" fill="#951E34" />
          </g>
        </svg>
        <div className="relative flex h-full flex-col items-center justify-center text-center">
          {c.phase === 'before' ? (
            <>
              <span className="font-sign text-[clamp(3rem,9vw,5.5rem)] font-light leading-none tabular-nums">{c.days}</span>
              <span className="mt-1 font-onest text-[14px] uppercase tracking-[0.1em] text-ink/80">days</span>
              <span className="mt-3 font-sign text-[clamp(1rem,2.2vw,1.35rem)] font-medium tabular-nums">
                {pad(c.hours)}:{pad(c.mins)}:{pad(c.secs)}
              </span>
            </>
          ) : (
            <span className="max-w-[10ch] font-sign text-[22px] font-semibold uppercase">{c.phase === 'during' ? 'Happening now' : 'Conference complete'}</span>
          )}
        </div>
      </div>
      <figcaption className="mt-5 text-center font-onest text-[15px] text-smalt-white/80">
        {c.phase === 'before' && <span className="sr-only">{c.days} days, {c.hours} hours and {c.mins} minutes until the conference. </span>}
        Until TISMUN begins ({timezoneLabel})
      </figcaption>
    </figure>
  );
}

function Projects() {
  const p = featuredProject;
  if (!p) return null;
  return (
    <section id="projects" aria-labelledby="projects-title" className="relative bg-ink py-20 text-smalt-white sm:py-28">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Sign id="projects-title" relief={false} className="text-[clamp(1.75rem,3.6vw,3.3rem)]">
          Things we’ve shipped.
        </Sign>
        <p className="mt-5 max-w-[46ch] font-onest text-[18px] text-smalt-white/80">Real platforms, used by real people at TIS.</p>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[7fr_5fr] lg:gap-16">
          {/* The plaque: cast concrete, the project's mark set into it. */}
          <div className="bg-concrete p-6 text-ink sm:p-10">
            <div className="flex items-center justify-center bg-smalt-white px-8 py-10 shadow-[inset_0_3px_10px_rgba(28,26,23,0.25)] sm:px-14 sm:py-14">
              <TismunLogo className="w-full max-w-[380px]" />
            </div>
            <Sign as="h3" className="mt-8 text-[clamp(2rem,4vw,3.2rem)] leading-none">
              {p.name}
            </Sign>
            <p className="mt-3 flex items-center gap-2 font-onest text-[14px] uppercase tracking-[0.08em] text-ink/80">
              <span className="h-2.5 w-2.5 bg-smalt-teal" aria-hidden />
              Live · {p.date}
            </p>
            <p className="mt-4 font-onest text-[19px]">{p.tagline}</p>
            <p className="mt-3 max-w-[60ch] font-onest text-[17px] leading-[1.6] text-ink/85">{p.description}</p>
            <div className="mt-7">
              {p.link ? (
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[52px] items-center gap-3 bg-ink px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] text-smalt-white hover:bg-smalt-teal">
                  Visit {p.name} <Arrow />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="inline-flex min-h-[52px] cursor-not-allowed items-center border border-ink/50 px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] text-ink/75">Link coming soon</span>
              )}
            </div>
          </div>
          {p.event && <BuildingClock {...p.event} />}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <ul className="border-t border-smalt-white/25">
            {p.features.map((f) => (
              <li key={f} className="border-b border-smalt-white/25 py-4 font-onest text-[17px]">
                {f}
              </li>
            ))}
          </ul>
          <div>
            <p className="font-onest text-[14px] uppercase tracking-[0.08em] text-smalt-white/75">Built with</p>
            <p className="mt-3 font-onest text-[17px] leading-[1.7]">{p.stack.join(' · ')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Founders: three niches in the wall                                  */
/* ------------------------------------------------------------------ */

function Niche({ f, i }: { f: (typeof founders)[number]; i: number }) {
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(true);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.5'] });
  const lag = i * 0.1;
  const y = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [70, 0]), { ease: settle });
  return (
    <motion.div ref={ref} style={{ y }} className="flex flex-col">
      {/* A square niche: the photo sits back in the wall, in the wall's own light. */}
      <div className="bg-concrete-deep p-3">
        <div className="group relative aspect-[4/5] overflow-hidden bg-ink">
          {ok && (
            <img
              src={f.photo}
              alt={`Portrait of ${f.name}`}
              loading="lazy"
              decoding="async"
              onError={() => setOk(false)}
              className="mz-photo absolute inset-0 h-full w-full object-cover object-[50%_18%]"
            />
          )}
          <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_10px_12px_22px_rgba(28,26,23,0.45)]" />
        </div>
      </div>
      <h3 className="mt-6 font-sign text-[clamp(1.05rem,1.5vw,1.3rem)] font-semibold uppercase leading-tight tracking-[0.01em]">{f.name}</h3>
      <p className="mt-1 font-onest text-[15px] text-ink/80">{f.role}</p>
      {f.tagline && <p className="mt-3 font-onest text-[17px]">{f.tagline}</p>}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex min-h-[44px] items-center self-start font-onest text-[15px] underline decoration-1 underline-offset-[6px] hover:decoration-2"
      >
        {open ? 'Hide bio' : 'Read bio'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="whitespace-pre-line pt-2 font-onest text-[16px] leading-[1.65] text-ink/85">{isPlaceholder(f.bio) ? 'Bio coming soon.' : f.bio}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Founders() {
  return (
    <section id="founders" aria-labelledby="founders-title" className="relative bg-concrete py-20 sm:py-28">
      <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="max-w-[760px]">
          <Sign id="founders-title" className="text-[clamp(1.75rem,3.6vw,3.3rem)]">
            Three students. One campus to upgrade.
          </Sign>
          <p className="mt-5 max-w-[48ch] font-onest text-[18px] leading-[1.6] text-ink/85">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
        </div>
        <div className="mt-14 grid gap-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-12">
          {founders.map((f, i) => (
            <Niche key={f.id} f={f} i={i % 3} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Send an idea: it becomes a tile                                     */
/* ------------------------------------------------------------------ */

function TileLanded({ color }: { color: readonly number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [slot, setSlot] = useState<{ col: number; row: number } | null>(null);
  const tile = 24;
  const rows = 4;
  useEffect(() => {
    const w = wrap.current!.clientWidth;
    const cols = Math.floor(w / tile);
    const gap = { col: Math.floor(cols * 0.58), row: 1 };
    paintStrip(ref.current!, w, tile, Math.min(devicePixelRatio || 1, 2), rows, gap);
    ref.current!.style.width = `${cols * tile}px`;
    ref.current!.style.height = `${rows * tile}px`;
    setSlot(gap);
  }, []);
  return (
    <div ref={wrap} className="relative mt-10 w-full" style={{ height: rows * tile }} aria-hidden>
      <canvas ref={ref} className="block" />
      {slot && (
        <motion.span
          className="absolute block"
          style={{ left: slot.col * tile + 1.5, top: slot.row * tile + 1.5, width: tile - 3, height: tile - 3, background: rgb(color), boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)', outline: '2px solid #1C1A17', outlineOffset: 3 }}
          initial={reduce ? { opacity: 0 } : { y: -180, rotate: -28, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 240, damping: 19, delay: 0.2 }}
        />
      )}
    </div>
  );
}

function Ideas() {
  const uid = useId();
  const form = useSuggestionForm({
    onInvalid: (which) => document.getElementById(which === 'text' ? `${uid}-text` : `${uid}-cat-${CATEGORIES[0].id}`)?.focus(),
  });
  const [sentColor, setSentColor] = useState<readonly number[]>(TILE.ink);
  const field =
    'block w-full border border-ink/35 bg-smalt-white px-4 font-onest text-[17px] text-ink placeholder:text-ink/55 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-smalt-maroon';

  return (
    <section id="suggestions" aria-labelledby="suggest-title" className="relative border-t-[3px] border-ink bg-concrete py-20 sm:py-28">
      <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto grid max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Sign id="suggest-title" className="text-[clamp(1.75rem,3.2vw,2.9rem)]">
            {SUGGEST.title}
          </Sign>
          <p className="mt-6 max-w-[44ch] font-onest text-[18px] leading-[1.6] text-ink/80">{SUGGEST.lede}</p>
          <ul className="mt-10 border-t border-ink/25">
            {SUGGEST.promises.map(([t, b]) => (
              <li key={t} className="border-b border-ink/25 py-5">
                <span className="block font-onest text-[17px] font-medium">{t}</span>
                <span className="mt-1 block font-onest text-[15px] text-ink/75">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-h-[560px]">
          <AnimatePresence mode="wait" initial={false}>
            {form.status === 'sent' ? (
              <motion.div key="sent" role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Sign as="h3" className="text-[clamp(1.6rem,3vw,2.5rem)]">
                  {SUGGEST.thanksTitle}
                </Sign>
                <p className="mt-4 max-w-[44ch] font-onest text-[18px] text-ink/80">{SUGGEST.thanksBody}</p>
                <TileLanded color={sentColor} />
                <p className="mt-4 font-onest text-[15px] text-ink/75">Your idea is a tile in the wall now.</p>
                <button type="button" onClick={form.reset} className="mt-10 inline-flex min-h-[52px] items-center border border-ink px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] hover:bg-ink hover:text-smalt-white">
                  Send another idea
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                noValidate
                onSubmit={(e) => {
                  if (form.category) setSentColor(CATEGORY_TILE[form.category]);
                  void form.submit(e);
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                aria-describedby={form.error ? `${uid}-error` : undefined}
              >
                <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} />
                </div>

                <div className="flex items-end justify-between">
                  <label htmlFor={`${uid}-text`} className="font-onest text-[17px] font-medium">
                    Your idea
                  </label>
                  <span className={`font-onest text-[14px] tabular-nums ${form.text.length > SUGGESTION_MAX ? 'text-smalt-maroon' : 'text-ink/70'}`}>
                    {form.text.length}/{SUGGESTION_MAX}
                  </span>
                </div>
                <textarea
                  id={`${uid}-text`}
                  rows={6}
                  maxLength={SUGGESTION_MAX + 200}
                  value={form.text}
                  onChange={(e) => form.setText(e.target.value)}
                  aria-invalid={form.touched && !!form.textError}
                  aria-describedby={`${uid}-text-hint`}
                  placeholder={SUGGEST.placeholder}
                  className={`${field} mt-3 resize-none py-3.5`}
                />
                <p id={`${uid}-text-hint`} className={`mt-2 font-onest text-[14px] ${form.touched && form.textError ? 'text-smalt-maroon' : 'text-ink/70'}`}>
                  {form.touched && form.textError ? form.textError : `Between ${SUGGESTION_MIN} and ${SUGGESTION_MAX} characters.`}
                </p>

                <fieldset className="mt-8">
                  <legend className="font-onest text-[17px] font-medium">Category</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const on = form.category === c.id;
                      return (
                        <label key={c.id} className="cursor-pointer">
                          <input id={`${uid}-cat-${c.id}`} type="radio" name="category" value={c.id} checked={on} onChange={() => form.setCategory(c.id)} className="peer sr-only" />
                          <span
                            className={`inline-flex min-h-[44px] items-center gap-2.5 border px-4 font-onest text-[15px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                              on ? 'border-ink bg-ink text-smalt-white' : 'border-ink/35 hover:border-ink'
                            }`}
                          >
                            <span aria-hidden className="h-3 w-3" style={{ background: rgb(CATEGORY_TILE[c.id]), outline: on ? '1px solid #EFEBE3' : undefined }} />
                            {c.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {form.touched && form.categoryError && <p className="mt-2 font-onest text-[14px] text-smalt-maroon">{form.categoryError}</p>}
                </fieldset>

                <div className="mt-8 border-y border-ink/25 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <span id={`${uid}-anon`}>
                      <span className="block font-onest text-[17px] font-medium">Send anonymously</span>
                      <span className="block font-onest text-[15px] text-ink/75">{form.anonymous ? 'No name attached.' : 'Add your name and grade below.'}</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.anonymous}
                      aria-labelledby={`${uid}-anon`}
                      onClick={() => form.setAnonymous((a) => !a)}
                      className="flex h-11 w-16 shrink-0 items-center"
                    >
                      <span className={`relative block h-7 w-14 border border-ink transition-colors ${form.anonymous ? 'bg-ink' : 'bg-transparent'}`}>
                        <motion.span className={`absolute top-[3px] block h-[20px] w-[20px] ${form.anonymous ? 'bg-smalt-white' : 'bg-ink'}`} animate={{ left: form.anonymous ? 30 : 3 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                      </span>
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {!form.anonymous && (
                      <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                        <div className="grid gap-3 pt-5 sm:grid-cols-[1fr_120px]">
                          <div>
                            <label htmlFor={`${uid}-name`} className="font-onest text-[15px] text-ink/75">
                              Name (optional)
                            </label>
                            <input id={`${uid}-name`} autoComplete="name" maxLength={NAME_MAX} value={form.name} onChange={(e) => form.setName(e.target.value)} className={`${field} mt-1.5 h-12`} />
                          </div>
                          <div>
                            <label htmlFor={`${uid}-grade`} className="font-onest text-[15px] text-ink/75">
                              Grade (optional)
                            </label>
                            <input id={`${uid}-grade`} inputMode="numeric" maxLength={GRADE_MAX} placeholder="e.g. 11" value={form.grade} onChange={(e) => form.setGrade(e.target.value)} className={`${field} mt-1.5 h-12`} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {form.status === 'error' && form.error && (
                  <p id={`${uid}-error`} role="alert" className="mt-6 border-l-[3px] border-smalt-maroon bg-smalt-white px-4 py-3 font-onest text-[15px]">
                    {form.error}
                  </p>
                )}

                <button type="submit" disabled={form.sending} className="mt-8 inline-flex min-h-[56px] w-full items-center justify-center gap-3 bg-ink px-8 font-sign text-[14px] font-medium uppercase tracking-[0.06em] text-smalt-white transition-colors hover:bg-smalt-teal disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                  {form.sending ? 'Sending…' : 'Send idea'}
                  {!form.sending && <Arrow />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Questions + foundation stone                                        */
/* ------------------------------------------------------------------ */

function Question({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-ink/25">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-[64px] w-full items-center justify-between gap-6 py-5 text-left font-onest text-[18px] font-medium sm:text-[20px]">
          {q}
          <span aria-hidden className="relative h-4 w-4 shrink-0">
            <span className="absolute left-0 top-[7px] h-[2px] w-4 bg-ink" />
            <span className={`absolute left-[7px] top-0 h-4 w-[2px] bg-ink transition-transform duration-300 ${open ? 'scale-y-0' : ''}`} />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="max-w-[64ch] pb-6 font-onest text-[17px] leading-[1.65] text-ink/85">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative bg-concrete py-20 sm:py-28">
      <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[880px] px-5 sm:px-8">
        <Sign id="faq-title" className="text-center text-[clamp(1.75rem,3.6vw,3.3rem)]">
          Questions
        </Sign>
        <ul className="mt-12 border-t-[3px] border-ink">
          {FAQ.map((x) => (
            <Question key={x.q} {...x} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  const go = useScrollTo();
  return (
    <footer className="bg-ink pb-28 pt-16 text-smalt-white">
      <Frieze />
      <div className="mx-auto mt-14 max-w-[1320px] px-5 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <LogoMark className="h-12 w-12 text-smalt-white" />
            <div>
              <p className="font-sign text-[14px] font-semibold uppercase tracking-[0.04em]">TIS Tech Council</p>
              <p className="font-onest text-[15px] text-smalt-white/75">Tashkent International School</p>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-1 sm:grid-cols-3">
            {[...NAV, ['suggestions', 'Suggest an idea'] as const].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} onClick={go(id)} className="inline-flex min-h-[40px] items-center font-onest text-[16px] text-smalt-white/80 hover:text-smalt-white">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p aria-hidden className="mt-16 font-sign text-[clamp(2.1rem,7.4vw,6rem)] font-semibold uppercase leading-[0.98] tracking-[0.005em]">
          TIS Tech Council
        </p>
        <div className="mt-8 flex flex-col gap-3 border-t border-smalt-white/25 pt-6 font-onest text-[14px] text-smalt-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council · Tashkent International School</p>
          <p className="flex items-center gap-3">
            <Owl className="h-6 w-6 text-smalt-white" />
            {MOTTO}
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */

export default function MosaicPage() {
  const reduce = useReducedMotion();
  useEffect(() => {
    document.documentElement.style.setProperty('--mz-grain', `url(${grainUrl()})`);
  }, []);
  return (
    <Shell world="mosaic" switcherClass="bg-ink text-smalt-white/80 [&_[data-here]]:bg-smalt-white [&_[data-here]]:text-ink">
      <div className="font-onest text-ink">
        <Nav />
        <main id="main">
          <Approach />
          {reduce && <StillMission />}
          <About />
          <Frieze />
          <Projects />
          <Founders />
          <Ideas />
          <Faq />
        </main>
        <Footer />
      </div>
    </Shell>
  );
}
