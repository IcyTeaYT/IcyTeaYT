import '@fontsource-variable/geist';
import './keynote.css';
import { AnimatePresence, motion, useMotionTemplate, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Shell } from '../shared/Shell';
import { LogoMark } from '@/components/brand/LogoMark';
import { Owl } from '@/components/brand/Owl';
import { TismunLogo } from '@/components/brand/TismunLogo';
import { LOGO_PATHS, LOGO_VIEWBOX } from '@/components/brand/logoPaths';
import { useNow } from '@/components/sections/Countdown';
import { ABOUT, FAQ, HERO, MISSION, MOTTO, SUGGEST, WORK } from '@/data/copy';
import { founders, isPlaceholder } from '@/data/founders';
import { featuredProject } from '@/data/projects';
import { CATEGORIES, GRADE_MAX, NAME_MAX, SUGGESTION_MAX, SUGGESTION_MIN } from '@/data/categories';
import { countdownParts, useSuggestionForm } from '@/lib/suggestion';
import { span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';

const EASE = [0.16, 1, 0.3, 1] as const;
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const accel = (t: number) => t * t;

const NAV = [
  ['mission', 'Mission'],
  ['about', 'What we do'],
  ['projects', 'TISMUN'],
  ['founders', 'Founders'],
  ['faq', 'Questions'],
] as const;

function useGo() {
  const { scrollTo } = useSmoothScroll();
  return (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo(`#${id}`, { offset: -56 });
  };
}

const whitePill =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-stage-text px-6 text-[17px] font-medium text-stage transition-colors duration-200 hover:bg-white';

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The object: the council's mark, extruded and lit                    */
/* ------------------------------------------------------------------ */

const PETALS: [keyof typeof LOGO_PATHS, [number, number, number]][] = [
  ['navy', [52, 74, 120]],
  ['orange', [242, 152, 57]],
  ['red', [170, 38, 62]],
  ['teal', [12, 128, 134]],
  ['cyan', [16, 170, 204]],
];
const LAYERS = 14;

function shade(c: [number, number, number], k: number) {
  return `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
}

/**
 * Fourteen copies of the mark stacked in depth, darkening toward the back,
 * so it reads as a solid object when the camera swings round it. Each layer
 * is rasterised once; turning the object only moves composited layers.
 */
function MarkObject({ rotateY, rotateX, scale, opacity }: { rotateY: MotionValue<number>; rotateX: MotionValue<number>; scale: MotionValue<number>; opacity: MotionValue<number> }) {
  return (
    <div className="relative aspect-square w-[min(54vw,420px,40svh)]" style={{ perspective: 1100 }}>
      <motion.div className="kn-sway absolute inset-0" style={{ transformStyle: 'preserve-3d', opacity }}>
        <motion.div className="absolute inset-0" style={{ rotateY, rotateX, scale, transformStyle: 'preserve-3d' }}>
          {Array.from({ length: LAYERS }, (_, i) => {
            const k = i === 0 ? 1 : 0.62 - (i / LAYERS) * 0.42;
            return (
              <svg key={i} viewBox={LOGO_VIEWBOX} aria-hidden className="absolute inset-0 h-full w-full" style={{ transform: `translateZ(${-i * 2.6}px)`, backfaceVisibility: 'visible' }}>
                {PETALS.map(([key, c]) => (
                  <path key={key} d={LOGO_PATHS[key]} fill={shade(c, k)} />
                ))}
              </svg>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function Nav() {
  const go = useGo();
  const { scrollTo } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-stage-line bg-stage/95 text-stage-text">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-5">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
          }}
          className="flex items-center gap-2.5"
          aria-label="TIS Tech Council, back to top"
        >
          <LogoMark className="h-7 w-7 text-stage-text" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">TIS Tech Council</span>
        </a>
        <ul className="hidden items-center gap-7 md:flex">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} onClick={go(id)} className="text-[13px] text-stage-text/80 transition-colors hover:text-stage-text">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <a href="#suggestions" onClick={go('suggestions')} className="hidden min-h-[32px] items-center rounded-full bg-stage-text px-3.5 text-[13px] font-medium text-stage hover:bg-white sm:inline-flex">
            Suggest an idea
          </a>
          <button type="button" className="flex h-11 w-11 items-center justify-center md:hidden" aria-expanded={open} aria-controls="kn-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            <span className="relative block h-2.5 w-5">
              <span className={`absolute left-0 h-[1.5px] w-5 bg-stage-text transition-transform duration-300 ${open ? 'top-[4px] rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-[1.5px] w-5 bg-stage-text transition-transform duration-300 ${open ? 'top-[4px] -rotate-45' : 'top-[8px]'}`} />
            </span>
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.ul id="kn-menu" className="px-5 pb-8 md:hidden" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {[...NAV, ['suggestions', 'Suggest an idea'] as const].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    setOpen(false);
                    go(id)(e);
                  }}
                  className="block py-3 text-[28px] font-semibold tracking-[-0.03em]"
                >
                  {label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Act one: the reveal, the orbit, the push-in, the mission             */
/* ------------------------------------------------------------------ */

function Reveal() {
  const reduce = !!useReducedMotion();
  const go = useGo();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const still = (out: number[]) => (reduce ? out.map(() => out[0]!) : out);

  const rotateY = useTransform(p, ...span([0, 0.78], still([-24, 34])));
  const rotateX = useTransform(p, ...span([0, 0.78], still([12, 2])));
  const scale = useTransform(p, ...span([0, 0.5, 0.8], still([1, 1.25, 3.4])), { ease: accel });
  const objOpacity = useTransform(p, ...span([0.66, 0.8], still([1, 0])));
  const copyOpacity = useTransform(p, ...span([0.08, 0.26], still([1, 0])));
  const copyY = useTransform(p, ...span([0.08, 0.3], still([0, -48])));
  const missionOpacity = useTransform(p, ...span([0.74, 0.86], reduce ? [0, 0] : [0, 1]));
  const missionScale = useTransform(p, ...span([0.74, 0.9], reduce ? [1, 1] : [0.88, 1]), { ease: settle });
  const supportOpacity = useTransform(p, ...span([0.86, 0.94], reduce ? [0, 0] : [0, 1]));
  const glow = useTransform(p, ...span([0, 0.8], still([0.5, 0.9])));
  const warm = useTransform(glow, (g) => (g * 0.16).toFixed(3));
  const cool = useTransform(glow, (g) => (g * 0.12).toFixed(3));
  const glowBg = useMotionTemplate`radial-gradient(60% 46% at 50% 38%, rgba(242,152,57,${warm}) 0%, rgba(8,151,182,${cool}) 38%, rgba(5,5,5,0) 70%)`;

  return (
    <section id="top" ref={ref} aria-labelledby="hero-title" className="relative bg-stage" style={{ height: reduce ? undefined : '340svh' }}>
      {!reduce && <div id="mission" aria-hidden className="pointer-events-none absolute left-0" style={{ top: 'calc(240svh * 0.84)' }} />}
      <div className="sticky top-0 flex h-[100svh] min-h-[600px] flex-col items-center justify-center overflow-hidden px-5 pt-14">
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glowBg }} />
        {/* The floor reflection under the object. */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[58%] h-[90px] w-[min(70vw,520px)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(245,245,247,0.07),transparent)]" />

        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, ease: EASE }}>
          <MarkObject rotateY={rotateY} rotateX={rotateX} scale={scale} opacity={objOpacity} />
        </motion.div>

        <motion.div className="relative mt-4 flex max-w-[860px] flex-col items-center text-center sm:mt-8" style={{ opacity: copyOpacity, y: copyY }}>
          <motion.h1
            id="hero-title"
            className="text-[clamp(2.25rem,5.6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-stage-text"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.25 }}
          >
            {HERO.title}
          </motion.h1>
          <motion.p className="mt-5 max-w-[46ch] text-[17px] leading-[1.5] text-stage-muted sm:text-[19px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.55 }}>
            {HERO.lede}
          </motion.p>
          <motion.div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.7 }}>
            <a href="#suggestions" onClick={go('suggestions')} className={whitePill}>
              Suggest an idea
            </a>
            <a href="#projects" onClick={go('projects')} className="inline-flex min-h-[48px] items-center gap-1.5 text-[17px] text-[#2997FF] hover:underline">
              See what we’ve built <Chevron />
            </a>
          </motion.div>
        </motion.div>

        {/* The mission arrives where the object was. */}
        {!reduce && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ opacity: missionOpacity }}>
            <motion.p className="max-w-[17ch] text-[clamp(2.5rem,6.6vw,5.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-stage-text" style={{ scale: missionScale }}>
              {MISSION.line}
            </motion.p>
            <motion.p className="mt-7 max-w-[48ch] text-[17px] leading-[1.5] text-stage-muted sm:text-[19px]" style={{ opacity: supportOpacity }}>
              {MISSION.support}
            </motion.p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function StillMission() {
  return (
    <section id="mission" aria-label="Mission" className="bg-stage px-5 py-28 text-center">
      <p className="mx-auto max-w-[17ch] text-[clamp(2.5rem,6.6vw,5.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">{MISSION.line}</p>
      <p className="mx-auto mt-7 max-w-[48ch] text-[19px] text-stage-muted">{MISSION.support}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Act two: what we do, one statement per screen                        */
/* ------------------------------------------------------------------ */

/** One petal of the mark, cropped to itself. */
function Petal({ which, color }: { which: keyof typeof LOGO_PATHS; color: string }) {
  const ref = useRef<SVGPathElement>(null);
  const [box, setBox] = useState(LOGO_VIEWBOX);
  useLayoutEffect(() => {
    const b = ref.current?.getBBox();
    if (b) setBox(`${b.x - 8} ${b.y - 8} ${b.width + 16} ${b.height + 16}`);
  }, []);
  return (
    <svg viewBox={box} aria-hidden className="h-16 w-16">
      <path ref={ref} d={LOGO_PATHS[which]} fill={color} />
    </svg>
  );
}

const FRAMES: { title: string; body: string; petal?: [keyof typeof LOGO_PATHS, string] }[] = [
  { title: ABOUT.title, body: ABOUT.body.join(' ') },
  { ...WORK[0]!, petal: ['orange', '#F29839'] },
  { ...WORK[1]!, petal: ['teal', '#0C8086'] },
  { ...WORK[2]!, petal: ['cyan', '#10AACC'] },
];

function Frame({ i, p, children }: { i: number; p: MotionValue<number>; children: ReactNode }) {
  const n = FRAMES.length;
  const c = (i + 0.5) / n;
  const w = 0.5 / n;
  const first = i === 0;
  const last = i === n - 1;
  const inR = first ? [0, 0.001] : [c - w, c - w * 0.25];
  const outR = last ? [0.998, 0.999] : [c + w * 0.25, c + w];
  // The camera moves forward: a statement comes out of the dark, holds, then passes us.
  const scale = useTransform(p, ...span([inR[0]!, inR[1]!, outR[0]!, outR[1]!], [first ? 1 : 0.84, 1, 1, last ? 1 : 1.18]));
  const opacity = useTransform(p, ...span([inR[0]!, inR[1]!, outR[0]!, outR[1]!], [first ? 1 : 0, 1, 1, last ? 1 : 0]));
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ scale, opacity }}>
      {children}
    </motion.div>
  );
}

function WhatWeDo() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const content = (f: (typeof FRAMES)[number], i: number) => (
    <>
      {f.petal && <Petal which={f.petal[0]} color={f.petal[1]} />}
      {i === 0 ? (
        <h2 id="about-title" className="max-w-[18ch] text-[clamp(2.3rem,5.4vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
          {f.title}
        </h2>
      ) : (
        <h3 className="mt-6 max-w-[18ch] text-[clamp(2.3rem,5.4vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]">{f.title}</h3>
      )}
      <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.55] text-stage-muted sm:text-[19px]">{f.body}</p>
    </>
  );

  if (reduce) {
    return (
      <section id="about" aria-labelledby="about-title" className="bg-stage py-20">
        {FRAMES.map((f, i) => (
          <div key={f.title} className="flex flex-col items-center px-5 py-16 text-center">
            {content(f, i)}
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id="about" ref={ref} aria-labelledby="about-title" className="relative bg-stage" style={{ height: `${FRAMES.length * 90 + 10}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {FRAMES.map((f, i) => (
          <Frame key={f.title} i={i} p={p}>
            {content(f, i)}
          </Frame>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Act three: the product                                               */
/* ------------------------------------------------------------------ */

function PushIn({ children, className = '', lag = 0 }: { children: ReactNode; className?: string; lag?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.5'] });
  const scale = useTransform(p, ...span([lag, 1], reduce ? [1, 1] : [0.9, 1]), { ease: settle });
  const opacity = useTransform(p, ...span([lag, lag + (1 - lag) * 0.6], reduce ? [1, 1] : [0, 1]));
  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity }}>
      {children}
    </motion.div>
  );
}

function BigCountdown({ start, end, timezoneLabel }: { start: string; end: string; timezoneLabel: string }) {
  const now = useNow();
  const c = countdownParts(now, start, end);
  if (c.phase !== 'before') return <p className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">{c.phase === 'during' ? 'Happening now.' : 'Conference complete.'}</p>;
  return (
    <div>
      <p className="sr-only">
        {c.days} days, {c.hours} hours and {c.mins} minutes until the conference ({timezoneLabel}).
      </p>
      <div aria-hidden className="flex flex-wrap items-end justify-center gap-x-8 gap-y-4 tabular-nums">
        {[
          [c.days, 'days'],
          [c.hours, 'hours'],
          [c.mins, 'minutes'],
          [c.secs, 'seconds'],
        ].map(([v, l]) => (
          <div key={l as string} className="text-center">
            <span className="block text-[clamp(3rem,7.5vw,6rem)] font-semibold leading-none tracking-[-0.04em]">{String(v).padStart(2, '0')}</span>
            <span className="mt-2 block text-[15px] text-stage-muted">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Product() {
  const p = featuredProject;
  if (!p) return null;
  return (
    <section id="projects" aria-labelledby="projects-title" className="bg-stage px-5 py-24 sm:py-36">
      <div className="mx-auto max-w-[1100px] text-center">
        <h2 id="projects-title" className="text-[clamp(3.4rem,9vw,6rem)] font-semibold leading-none tracking-[-0.04em]">
          {p.name}
        </h2>
        <p className="mx-auto mt-5 max-w-[30ch] text-[clamp(1.3rem,2.4vw,1.9rem)] font-medium leading-[1.2] tracking-[-0.02em]">{p.tagline}</p>
        <p className="mt-3 text-[17px] text-stage-muted">
          Live · {p.date} · Things we’ve shipped
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          {p.link ? (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className={whitePill}>
              Visit {p.name}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span className="inline-flex min-h-[48px] cursor-not-allowed items-center rounded-full border border-stage-text/30 px-6 text-[17px] text-stage-muted">Link coming soon</span>
          )}
        </div>
      </div>

      <PushIn className="mx-auto mt-16 max-w-[1100px]">
        <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[28px] bg-stage-tile p-10 sm:aspect-[16/8]">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(242,152,57,0.12),transparent_70%)]" />
          <div className="relative w-full max-w-[520px] rounded-[20px] bg-[#F5F5F7] px-10 py-12 text-stage">
            <TismunLogo className="w-full" />
          </div>
        </div>
      </PushIn>

      <div className="mx-auto mt-16 max-w-[820px] text-center">
        <p className="text-[clamp(1.25rem,2.2vw,1.6rem)] leading-[1.45] tracking-[-0.015em] text-stage-muted">
          <span className="text-stage-text">{p.description.split(',')[0]},</span>
          {p.description.slice(p.description.indexOf(',') + 1)}
        </p>
      </div>

      {p.event && (
        <PushIn className="mx-auto mt-24 max-w-[1100px] rounded-[28px] bg-stage-tile px-6 py-14 text-center sm:py-20">
          <p className="text-[19px] text-stage-muted">The conference starts in</p>
          <div className="mt-8">
            <BigCountdown {...p.event} />
          </div>
          <p className="mt-8 text-[15px] text-stage-muted">{p.event.timezoneLabel}</p>
        </PushIn>
      )}

      <div className="mx-auto mt-24 grid max-w-[1100px] gap-x-14 gap-y-0 md:grid-cols-2">
        {p.features.map((f) => (
          <p key={f} className="border-t border-stage-line py-6 text-[19px] leading-[1.45] tracking-[-0.01em]">
            {f}
          </p>
        ))}
        <p className="border-t border-stage-line py-6 text-[17px] text-stage-muted md:col-span-2">Built with {p.stack.join(', ')}.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* People, ideas, questions                                             */
/* ------------------------------------------------------------------ */

function Person({ f, i }: { f: (typeof founders)[number]; i: number }) {
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(true);
  const id = useId();
  return (
    <PushIn lag={i * 0.12} className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-stage-tile">
        {ok && <img src={f.photo} alt={`Portrait of ${f.name}`} loading="lazy" decoding="async" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" />}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-stage/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="text-[24px] font-semibold tracking-[-0.025em]">{f.name}</h3>
          <p className="text-[15px] text-stage-text/75">{f.role}</p>
        </div>
      </div>
      {f.tagline && <p className="mt-5 text-[17px] leading-[1.45]">{f.tagline}</p>}
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 self-start text-[17px] text-[#2997FF] hover:underline">
        {open ? 'Hide bio' : 'Read bio'} <Chevron />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="whitespace-pre-line pt-2 text-[16px] leading-[1.6] text-stage-muted">{isPlaceholder(f.bio) ? 'Bio coming soon.' : f.bio}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </PushIn>
  );
}

function People() {
  return (
    <section id="founders" aria-labelledby="founders-title" className="bg-stage px-5 py-24 sm:py-36">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <h2 id="founders-title" className="mx-auto max-w-[16ch] text-[clamp(2.3rem,5.4vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
            Three students. One campus to upgrade.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[19px] text-stage-muted">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
        </div>
        <div className="mt-16 grid gap-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {founders.map((f, i) => (
            <Person key={f.id} f={f} i={i % 3} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Ideas() {
  const uid = useId();
  const form = useSuggestionForm({
    onInvalid: (which) => document.getElementById(which === 'text' ? `${uid}-text` : `${uid}-cat-${CATEGORIES[0].id}`)?.focus(),
  });
  const field =
    'block w-full rounded-[14px] border border-transparent bg-stage-tile px-4 text-[17px] text-stage-text placeholder:text-stage-muted/70 transition-colors focus:border-[#2997FF] focus:outline-none aria-[invalid=true]:border-[#FF6961]';
  return (
    <section id="suggestions" aria-labelledby="suggest-title" className="bg-stage px-5 py-24 sm:py-36">
      <div className="mx-auto max-w-[720px]">
        <div className="text-center">
          <h2 id="suggest-title" className="text-[clamp(2.3rem,5.4vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
            {SUGGEST.title}
          </h2>
          <p className="mx-auto mt-5 max-w-[44ch] text-[19px] text-stage-muted">{SUGGEST.lede}</p>
          <p className="mt-4 text-[15px] text-stage-muted">{SUGGEST.promises.map(([t]) => t).join(' · ')}</p>
        </div>
        <div className="mt-14 min-h-[520px]">
          <AnimatePresence mode="wait" initial={false}>
            {form.status === 'sent' ? (
              <motion.div key="sent" role="status" aria-live="polite" className="rounded-[28px] bg-stage-tile px-8 py-16 text-center" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                <div className="mx-auto w-16">
                  <LogoMark className="h-16 w-16 text-stage-text" />
                </div>
                <p className="mt-6 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.04em]">{SUGGEST.thanksTitle}</p>
                <p className="mx-auto mt-3 max-w-[40ch] text-[17px] text-stage-muted">{SUGGEST.thanksBody}</p>
                <button type="button" onClick={form.reset} className="mt-8 inline-flex min-h-[44px] items-center gap-1.5 text-[17px] text-[#2997FF] hover:underline">
                  Send another idea <Chevron />
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={form.submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} aria-describedby={form.error ? `${uid}-error` : undefined}>
                <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input id={`${uid}-website`} tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} />
                </div>
                <div className="flex items-end justify-between">
                  <label htmlFor={`${uid}-text`} className="text-[17px] font-medium">
                    Your idea
                  </label>
                  <span className={`text-[14px] tabular-nums ${form.text.length > SUGGESTION_MAX ? 'text-[#FF6961]' : 'text-stage-muted'}`}>
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
                  className={`${field} mt-3 resize-none py-4`}
                />
                <p id={`${uid}-text-hint`} className={`mt-2 text-[14px] ${form.touched && form.textError ? 'text-[#FF6961]' : 'text-stage-muted'}`}>
                  {form.touched && form.textError ? form.textError : `Between ${SUGGESTION_MIN} and ${SUGGESTION_MAX} characters.`}
                </p>
                <fieldset className="mt-8">
                  <legend className="text-[17px] font-medium">Category</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const on = form.category === c.id;
                      return (
                        <label key={c.id} className="cursor-pointer">
                          <input id={`${uid}-cat-${c.id}`} type="radio" name="category" value={c.id} checked={on} onChange={() => form.setCategory(c.id)} className="peer sr-only" />
                          <span className={`inline-flex min-h-[44px] items-center rounded-full px-5 text-[15px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2997FF] ${on ? 'bg-stage-text text-stage' : 'bg-stage-tile hover:bg-stage-line'}`}>{c.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {form.touched && form.categoryError && <p className="mt-2 text-[14px] text-[#FF6961]">{form.categoryError}</p>}
                </fieldset>
                <div className="mt-8 rounded-[14px] bg-stage-tile px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span id={`${uid}-anon`}>
                      <span className="block text-[17px]">Send anonymously</span>
                      <span className="block text-[14px] text-stage-muted">{form.anonymous ? 'No name attached.' : 'Add your name and grade below.'}</span>
                    </span>
                    <button type="button" role="switch" aria-checked={form.anonymous} aria-labelledby={`${uid}-anon`} onClick={() => form.setAnonymous((a) => !a)} className="flex h-11 w-[60px] shrink-0 items-center">
                      <span className={`relative block h-[31px] w-[51px] rounded-full transition-colors ${form.anonymous ? 'bg-[#30D158]' : 'bg-stage-line'}`}>
                        <motion.span className="absolute top-[2px] block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]" animate={{ left: form.anonymous ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                      </span>
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {!form.anonymous && (
                      <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                        <div className="grid gap-3 pt-4 sm:grid-cols-[1fr_120px]">
                          <div>
                            <label htmlFor={`${uid}-name`} className="text-[14px] text-stage-muted">
                              Name (optional)
                            </label>
                            <input id={`${uid}-name`} autoComplete="name" maxLength={NAME_MAX} value={form.name} onChange={(e) => form.setName(e.target.value)} className={`${field} mt-1.5 h-12 bg-stage`} />
                          </div>
                          <div>
                            <label htmlFor={`${uid}-grade`} className="text-[14px] text-stage-muted">
                              Grade (optional)
                            </label>
                            <input id={`${uid}-grade`} inputMode="numeric" maxLength={GRADE_MAX} placeholder="e.g. 11" value={form.grade} onChange={(e) => form.setGrade(e.target.value)} className={`${field} mt-1.5 h-12 bg-stage`} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {form.status === 'error' && form.error && (
                  <p id={`${uid}-error`} role="alert" className="mt-6 rounded-[14px] bg-[#FF6961]/12 px-4 py-3 text-[15px]">
                    {form.error}
                  </p>
                )}
                <div className="mt-8 text-center">
                  <button type="submit" disabled={form.sending} className={`${whitePill} min-w-[200px] disabled:cursor-wait disabled:opacity-70`}>
                    {form.sending ? 'Sending…' : 'Send idea'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Question({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-stage-line">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-[64px] w-full items-center justify-between gap-6 py-5 text-left text-[19px] font-medium tracking-[-0.015em] sm:text-[21px]">
          {q}
          <span aria-hidden className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}>
            <Chevron />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="max-w-[64ch] pb-6 text-[17px] leading-[1.6] text-stage-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-stage px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-[820px]">
        <h2 id="faq-title" className="text-center text-[clamp(2.3rem,5vw,4rem)] font-semibold tracking-[-0.04em]">
          Questions
        </h2>
        <ul className="mt-12 border-t border-stage-line">
          {FAQ.map((x) => (
            <Question key={x.q} {...x} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  const go = useGo();
  return (
    <footer className="border-t border-stage-line bg-stage px-5 pb-28 pt-14 text-[13px] text-stage-muted">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-stage-text">
            <LogoMark className="h-9 w-9 text-stage-text" />
            <span className="text-[15px] font-semibold">TIS Tech Council</span>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {[...NAV, ['suggestions', 'Suggest an idea'] as const].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} onClick={go(id)} className="inline-flex min-h-[40px] items-center hover:text-stage-text">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-stage-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council · Tashkent International School</p>
          <p className="flex items-center gap-2.5">
            <Owl className="h-5 w-5 text-stage-text" />
            {MOTTO}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function KeynotePage() {
  const reduce = useReducedMotion();
  return (
    <Shell world="keynote" switcherClass="rounded-full bg-stage-tile/95 text-stage-muted [&_a]:rounded-full [&_[data-here]]:bg-stage-text [&_[data-here]]:text-stage">
      <div className="font-geist text-stage-text">
        <Nav />
        <main id="main">
          <Reveal />
          {reduce && <StillMission />}
          <WhatWeDo />
          <Product />
          <People />
          <Ideas />
          <Faq />
        </main>
        <Footer />
      </div>
    </Shell>
  );
}
