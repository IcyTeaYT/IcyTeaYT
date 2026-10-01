import '@fontsource-variable/unbounded';
import '@fontsource-variable/onest';
import './mosaic.css';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { drawFacade, grainUrl, layoutFacade, paintMural, paintStrip, throughScale, TILE, type Facade } from './paint';

const EASE = [0.16, 1, 0.3, 1] as const;
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

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
    scrollTo(`#${id}`, { offset: -64 });
  };
}

/** A one-tile-high run of mosaic between sections, like a frieze. */
function Frieze({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const cols = paintStrip(cv, cv.parentElement!.clientWidth + 14, 14, Math.min(devicePixelRatio || 1, 2), -1);
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

function Sign({ children, className = '', as: Tag = 'h2', id }: { children: ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3'; id?: string }) {
  return (
    <Tag id={id} className={`font-sign font-semibold uppercase leading-[1.04] tracking-[-0.015em] ${className}`}>
      {children}
    </Tag>
  );
}

function InkButton({ href, onClick, children, disabled }: { href?: string; onClick?: (e: React.MouseEvent) => void; children: ReactNode; disabled?: boolean }) {
  const cls =
    'inline-flex min-h-[52px] items-center gap-3 bg-ink px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] text-smalt-white transition-colors duration-200 hover:bg-smalt-teal';
  if (disabled) return <span className={`${cls} cursor-not-allowed opacity-50 hover:bg-ink`}>{children}</span>;
  return (
    <a href={href} onClick={onClick} className={cls}>
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

/** Scroll-linked push-in: the element comes forward out of the wall. */
function PushIn({ children, className = '', from = 0.9, lag = 0 }: { children: ReactNode; className?: string; from?: number; lag?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.55'] });
  const scale = useTransform(p, ...span([lag, 1], reduce ? [1, 1] : [from, 1]), { ease: settle });
  const y = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [48, 0]), { ease: settle });
  const opacity = useTransform(p, ...span([lag, lag + (1 - lag) * 0.55], reduce ? [1, 1] : [0, 1]));
  return (
    <motion.div ref={ref} className={className} style={{ scale, y, opacity }}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function Nav() {
  const go = useScrollTo();
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();
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
        <ul className="hidden items-center gap-7 lg:flex">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} onClick={go(id)} className="font-onest text-[15px] text-ink/75 transition-colors hover:text-ink">
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
            <ul className="px-5 pb-6 pt-2">
              {[...NAV, ['suggestions', 'Suggest an idea'] as const].map(([id, label]) => (
                <li key={id} className="border-b border-[#B4AC9E]">
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      setOpen(false);
                      go(id)(e);
                    }}
                    className="block py-4 font-sign text-[20px] font-semibold uppercase"
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
/* The approach: facade > through the screen > the mural > mission     */
/* ------------------------------------------------------------------ */

interface Geo {
  W: number;
  H: number;
  f: Facade;
  smax: number;
}

function MissionLine({ p, still }: { p: MotionValue<number>; still: boolean }) {
  const words = MISSION.line.split(' ');
  return (
    <Sign id="mission-title" className="max-w-[18ch] text-[clamp(1.85rem,4.6vw,4.4rem)]">
      <span className="sr-only">{MISSION.line}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <Word key={i} p={p} still={still} range={[0.66 + (i / words.length) * 0.2, 0.66 + ((i + 1) / words.length) * 0.2]}>
            {w}
          </Word>
        ))}
      </span>
    </Sign>
  );
}

function Word({ children, p, range, still }: { children: string; p: MotionValue<number>; range: [number, number]; still: boolean }) {
  // Unlit words are pressed into the concrete; lit ones are inlaid ink.
  const color = useTransform(p, ...span(range, still ? ['#1C1A17', '#1C1A17'] : ['#A79F91', '#1C1A17']));
  return <motion.span style={{ color }}>{children} </motion.span>;
}

function Approach() {
  const reduce = !!useReducedMotion();
  const go = useScrollTo();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const facadeCv = useRef<HTMLCanvasElement>(null);
  const muralCv = useRef<HTMLCanvasElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const still = useMotionValue(0);
  const p = reduce ? still : scrollYProgress;

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
      const f = layoutFacade(W, H);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      paintMural(muralCv.current!, W * 1.3, H * 1.3, W < 700 ? 10 : 13, dpr * 1.25, { x: W < 700 ? 0.5 : 0.6, y: 0.42 });
      const cv = facadeCv.current!;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      setGeo({ W, H, f, smax: throughScale(W, H, f) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Camera: an exponential zoom reads as a dolly at constant speed.
  const geoRef = useRef<Geo | null>(null);
  geoRef.current = geo;
  const camera = (v: number) => {
    const g = geoRef.current;
    if (!g) return 1;
    return Math.pow(g.smax, inOut(clamp01((v - 0.06) / 0.48)));
  };
  const scale = useMotionValue(1);
  const facadeOn = useMotionValue(1);
  const muralScale = useMotionValue(1);
  const signOpacity = useTransform(p, ...span([0.08, 0.24], [1, 0]));
  const friezeY = useTransform(p, ...span([0.56, 0.68], ['105%', '0%']), { ease: settle });
  const supportOpacity = useTransform(p, ...span([0.88, 0.95], [0, 1]));

  const raf = useRef(0);
  const apply = (v: number) => {
    const g = geoRef.current;
    const cv = facadeCv.current;
    if (!g || !cv) return;
    const s = camera(v);
    scale.set(s);
    muralScale.set(1 + 0.16 * inOut(clamp01((v - 0.06) / 0.48)) + 0.07 * clamp01((v - 0.54) / 0.46));
    const through = s >= g.smax * 0.995;
    facadeOn.set(through ? 0 : 1);
    if (!through) drawFacade(cv.getContext('2d')!, g.W, g.H, cv.width / g.W, g.f, s);
  };
  useEffect(() => apply(p.get()), [geo]); 
  useMotionValueEvent(p, 'change', (v) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => apply(v));
  });

  const origin = geo ? `${geo.f.target.x}px ${geo.f.target.y}px` : '50% 50%';
  const bandTop = geo ? geo.f.bandTop : 0;

  return (
    <section
      id="top"
      ref={section}
      aria-labelledby="hero-title"
      className="relative bg-concrete"
      style={{ height: reduce ? undefined : '380svh' }}
    >
      {/* Where "Mission" in the nav lands: the frieze has risen. */}
      {!reduce && <div id="mission" aria-hidden className="pointer-events-none absolute left-0" style={{ top: 'calc(280svh * 0.66)' }} />}
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden">
        <motion.canvas
          ref={muralCv}
          aria-hidden
          className="absolute"
          style={{ left: '-15%', top: '-15%', width: '130%', height: '130%', scale: muralScale, transformOrigin: origin }}
        />
        <motion.canvas ref={facadeCv} aria-hidden className="absolute inset-0 h-full w-full" style={{ opacity: facadeOn }} />
        <div aria-hidden className="mz-grain pointer-events-none absolute inset-0 opacity-60" />

        {/* The sign band rides the same camera as the facade. */}
        <motion.div className="absolute inset-x-0 bottom-0" style={{ top: bandTop, scale, transformOrigin: geo ? `${geo.f.target.x}px ${geo.f.target.y - bandTop}px` : '50% 0', opacity: signOpacity }}>
          <div className="mx-auto flex h-full max-w-[1320px] flex-col justify-center px-5 pb-16 pt-8 sm:px-8">
            <Sign as="h1" id="hero-title" className="max-w-[17ch] text-[clamp(1.75rem,4.9vw,4.75rem)]">
              {HERO.title}
            </Sign>
            <div className="mt-6 flex flex-col gap-6 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[46ch] font-onest text-[17px] leading-[1.55] text-ink/80 sm:text-[18px]">{HERO.lede}</p>
              <div className="flex flex-wrap items-center gap-5">
                <InkButton href="#suggestions" onClick={go('suggestions')}>
                  Suggest an idea <Arrow />
                </InkButton>
                <a href="#projects" onClick={go('projects')} className="font-onest text-[16px] underline decoration-1 underline-offset-[6px] hover:decoration-2">
                  See what we’ve built
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* The mission frieze rises over the mural. */}
        <motion.div
          className="absolute inset-x-0 bottom-0 border-t-[3px] border-ink bg-concrete"
          style={{ y: reduce ? '105%' : friezeY }}
          aria-hidden={reduce}
        >
          <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-[1320px] px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14">
            {!reduce && <MissionLine p={p} still={false} />}
            <motion.p className="mt-6 max-w-[52ch] font-onest text-[17px] leading-[1.55] text-ink/80 sm:text-[18px]" style={{ opacity: supportOpacity }}>
              {MISSION.support}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Reduced motion: the mission sits as a plain section after the facade. */
function StillMission() {
  const still = useMotionValue(1);
  return (
    <section id="mission" aria-labelledby="mission-title" className="border-t-[3px] border-ink bg-concrete py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <MissionLine p={still} still />
        <p className="mt-6 max-w-[52ch] font-onest text-[18px] leading-[1.55] text-ink/80">{MISSION.support}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* What we do                                                          */
/* ------------------------------------------------------------------ */

function swatch(color: readonly number[], seed: number) {
  const c = document.createElement('canvas');
  const t = 9;
  c.width = c.height = t * 8;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#C4BDB0';
  ctx.fillRect(0, 0, c.width, c.height);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const k = 0.88 + r() * 0.18;
      ctx.fillStyle = `rgb(${(color[0]! * k) | 0},${(color[1]! * k) | 0},${(color[2]! * k) | 0})`;
      ctx.fillRect(x * t + 0.6, y * t + 0.6, t - 1.2, t - 1.2);
    }
  return c.toDataURL('image/png');
}

const WORK_TILES = [TILE.orange, TILE.teal, TILE.cyan] as const;

function About() {
  const tiles = useMemo(() => WORK_TILES.map((c, i) => swatch(c, 11 + i * 7)), []);
  return (
    <section id="about" aria-labelledby="about-title" className="relative bg-concrete py-20 sm:py-28">
      <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto grid max-w-[1320px] gap-12 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div>
          <Sign id="about-title" className="text-[clamp(1.75rem,3.2vw,2.9rem)]">
            {ABOUT.title}
          </Sign>
          {ABOUT.body.map((t) => (
            <p key={t} className="mt-6 max-w-[48ch] font-onest text-[17px] leading-[1.6] text-ink/80 sm:text-[18px]">
              {t}
            </p>
          ))}
        </div>
        <ul className="border-t-[3px] border-ink">
          {WORK.map((w, i) => (
            <li key={w.title} className="border-b border-ink/25">
              <PushIn className="flex gap-6 py-8 sm:gap-8" from={0.94} lag={i * 0.08}>
                <span
                  aria-hidden
                  className="h-[96px] w-[64px] shrink-0 rounded-t-full bg-[length:36px_36px] sm:h-[120px] sm:w-[80px]"
                  style={{ backgroundImage: `url(${tiles[i]})`, boxShadow: 'inset -7px 0 0 #A39B8C' }}
                />
                <div>
                  <h3 className="font-sign text-[clamp(1.1rem,1.8vw,1.45rem)] font-semibold uppercase leading-tight">{w.title}</h3>
                  <p className="mt-3 max-w-[50ch] font-onest text-[17px] leading-[1.6] text-ink/80">{w.body}</p>
                </div>
              </PushIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TISMUN: the building clock                                          */
/* ------------------------------------------------------------------ */

function Clock({ start, end, timezoneLabel }: { start: string; end: string; timezoneLabel: string }) {
  const now = useNow();
  const c = countdownParts(now, start, end);
  if (c.phase !== 'before') {
    return <p className="font-sign text-[clamp(1.5rem,3vw,2.4rem)] font-semibold uppercase">{c.phase === 'during' ? 'Happening now' : 'Conference complete'}</p>;
  }
  const units = [
    [c.days, 'Days'],
    [c.hours, 'Hours'],
    [c.mins, 'Minutes'],
    [c.secs, 'Seconds'],
  ] as const;
  return (
    <div>
      <p className="sr-only">
        {c.days} days, {c.hours} hours and {c.mins} minutes until the conference ({timezoneLabel}).
      </p>
      <div aria-hidden className="grid grid-cols-4 border-y border-smalt-white/25">
        {units.map(([v, label], i) => (
          <div key={label} className={`py-5 ${i ? 'border-l border-smalt-white/25 pl-4 sm:pl-6' : ''}`}>
            <span className="block font-sign text-[clamp(2rem,5.4vw,4.75rem)] font-light leading-none tabular-nums">{String(v).padStart(2, '0')}</span>
            <span className="mt-3 block font-onest text-[13px] uppercase tracking-[0.08em] text-smalt-white/70">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Projects() {
  const p = featuredProject;
  if (!p) return null;
  return (
    <section id="projects" aria-labelledby="projects-title" className="relative bg-ink py-20 text-smalt-white sm:py-28">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <Sign id="projects-title" className="text-[clamp(1.75rem,3.2vw,2.9rem)]">
          Things we’ve shipped.
        </Sign>
        <p className="mt-5 max-w-[46ch] font-onest text-[18px] text-smalt-white/75">Real platforms, used by real people at TIS.</p>

        <PushIn className="mt-14 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16" from={0.9}>
          <div className="flex aspect-[4/3] items-center justify-center bg-smalt-white p-10 text-ink" style={{ boxShadow: 'inset 0 -10px 0 #B4AC9E' }}>
            <TismunLogo className="w-full max-w-[420px]" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-sign text-[clamp(2rem,4vw,3.4rem)] font-semibold uppercase leading-none">{p.name}</h3>
            <p className="mt-4 flex items-center gap-2 font-onest text-[14px] uppercase tracking-[0.08em] text-smalt-white/75">
              <span className="h-2.5 w-2.5 bg-smalt-cyan" aria-hidden />
              Live · {p.date}
            </p>
            <p className="mt-4 font-onest text-[19px]">{p.tagline}</p>
            <p className="mt-3 max-w-[56ch] font-onest text-[17px] leading-[1.6] text-smalt-white/75">{p.description}</p>
            <div className="mt-auto flex flex-wrap gap-4 pt-8">
              {p.link ? (
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[52px] items-center gap-3 bg-smalt-white px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] text-ink hover:bg-smalt-orange">
                  Visit {p.name} <Arrow />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="inline-flex min-h-[52px] cursor-not-allowed items-center border border-smalt-white/40 px-6 font-sign text-[13px] font-medium uppercase tracking-[0.06em] text-smalt-white/70">
                  Link coming soon
                </span>
              )}
            </div>
          </div>
        </PushIn>

        {p.event && (
          <PushIn className="mt-16" from={0.96}>
            <p className="mb-4 font-onest text-[14px] text-smalt-white/70">Conference starts in ({p.event.timezoneLabel})</p>
            <Clock {...p.event} />
          </PushIn>
        )}

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <ul className="border-t border-smalt-white/25">
            {p.features.map((f) => (
              <li key={f} className="border-b border-smalt-white/25 py-4 font-onest text-[17px]">
                {f}
              </li>
            ))}
          </ul>
          <div>
            <p className="font-onest text-[14px] uppercase tracking-[0.08em] text-smalt-white/70">Built with</p>
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
  const pending = isPlaceholder(f.bio);
  return (
    <PushIn className="flex flex-col" from={0.86} lag={i * 0.12}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-full bg-concrete-deep" style={{ boxShadow: 'inset -10px 0 0 #A39B8C' }}>
        {ok && <img src={f.photo} alt={`Portrait of ${f.name}`} loading="lazy" decoding="async" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" />}
      </div>
      <h3 className="mt-6 font-sign text-[clamp(1.1rem,1.6vw,1.35rem)] font-semibold uppercase leading-tight">{f.name}</h3>
      <p className="mt-1 font-onest text-[15px] text-ink/75">{f.role}</p>
      {f.tagline && <p className="mt-3 font-onest text-[17px]">{f.tagline}</p>}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 self-start font-onest text-[15px] underline decoration-1 underline-offset-[6px] hover:decoration-2"
      >
        {open ? 'Hide bio' : 'Read bio'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="whitespace-pre-line pt-3 font-onest text-[16px] leading-[1.65] text-ink/85">{pending ? 'Bio coming soon.' : f.bio}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </PushIn>
  );
}

function Founders() {
  return (
    <section id="founders" aria-labelledby="founders-title" className="relative bg-concrete py-20 sm:py-28">
      <div className="mz-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <Sign id="founders-title" className="text-[clamp(1.75rem,3.2vw,2.9rem)]">
            Three students. One campus to upgrade.
          </Sign>
          <p className="max-w-[48ch] font-onest text-[18px] leading-[1.6] text-ink/80 lg:pt-2">
            The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.
          </p>
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
  const [slot, setSlot] = useState<number | null>(null);
  const tile = 22;
  useEffect(() => {
    const w = wrap.current!.clientWidth;
    const cols = Math.floor(w / tile);
    const gap = Math.floor(cols * 0.62);
    paintStrip(ref.current!, w, tile, Math.min(devicePixelRatio || 1, 2), gap);
    ref.current!.style.width = `${cols * tile}px`;
    setSlot(gap);
  }, []);
  return (
    <div ref={wrap} className="relative mt-10 h-[22px] w-full" aria-hidden>
      <canvas ref={ref} className="block h-[22px]" />
      {slot !== null && (
        <motion.span
          className="absolute top-0 block"
          style={{ left: slot * tile + 1.2, width: tile - 2.4, height: tile - 2.4, marginTop: 1.2, background: rgb(color) }}
          initial={reduce ? { opacity: 0 } : { y: -140, rotate: -24, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
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
    'block w-full border border-ink/35 bg-concrete-light px-4 font-onest text-[17px] text-ink placeholder:text-ink/55 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-smalt-maroon';

  return (
    <section id="suggestions" aria-labelledby="suggest-title" className="relative border-t-[3px] border-ink bg-concrete-light py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
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
                  <p id={`${uid}-error`} role="alert" className="mt-6 border-l-[3px] border-smalt-maroon bg-concrete px-4 py-3 font-onest text-[15px]">
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
            <p className="max-w-[64ch] pb-6 font-onest text-[17px] leading-[1.65] text-ink/80">{a}</p>
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
      <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <Sign id="faq-title" className="text-[clamp(1.75rem,3.2vw,2.9rem)]">
          Questions
        </Sign>
        <ul className="border-t-[3px] border-ink">
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
              <p className="font-onest text-[15px] text-smalt-white/70">Tashkent International School</p>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-1 sm:grid-cols-3">
            {[...NAV, ['suggestions', 'Suggest an idea'] as const].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} onClick={go(id)} className="inline-flex min-h-[40px] items-center font-onest text-[16px] text-smalt-white/75 hover:text-smalt-white">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p aria-hidden className="mt-16 font-sign text-[clamp(2.2rem,8.6vw,8rem)] font-semibold uppercase leading-[0.95] tracking-[-0.02em]">
          TIS Tech Council
        </p>
        <div className="mt-8 flex flex-col gap-3 border-t border-smalt-white/25 pt-6 font-onest text-[14px] text-smalt-white/70 sm:flex-row sm:items-center sm:justify-between">
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
    <Shell world="mosaic" switcherClass="bg-ink text-smalt-white/75 [&_[data-here]]:bg-smalt-white [&_[data-here]]:text-ink">
      <div className="font-onest text-ink">
        <Nav />
        <main id="main">
          <Approach />
          {reduce && <StillMission />}
          <Frieze />
          <About />
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
