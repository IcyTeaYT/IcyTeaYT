import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { LogoMark } from '@/components/brand/LogoMark';
import { Owl } from '@/components/brand/Owl';
import { TismunLogo } from '@/components/brand/TismunLogo';
import { Arrow } from '@/components/ui/Arrow';
import { ABOUT, FAQ, MOTTO, WORK } from '@/data/copy';
import { founders, isPlaceholder } from '@/data/founders';
import { featuredProject } from '@/data/projects';
import { EASE_OUT } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { drawArchLaid, paintNightArch, paintNightStrip, PETAL_RGB, T, tileBorderUrl, type ArchMotif } from './night';
import { DoorGate, FooterGate, Gateway, ROOM_PULL, StarGate } from './JourneyParts';

/**
 * The sections after the opening, in the opening's own grammar. Everything
 * sits on one wall of 12px glass tiles; each section is a panel set into it,
 * bordered in its petal colour (projects teal, founders maroon, ideas
 * orange, questions cyan); and everything arrives the one way the mosaic
 * does: laid, a course of tiles at a time. The page signs off the way it
 * opened, its name spelled in lit tiles.
 */

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export type Petal = 'orange' | 'maroon' | 'teal' | 'cyan';
export const PETAL_CSS: Record<Petal, string> = {
  orange: 'rgb(242,152,57)',
  maroon: 'rgb(176,40,66)',
  teal: 'rgb(12,128,134)',
  cyan: 'rgb(16,170,204)',
};

/** Paints the tile borders once and exposes them as CSS variables (--bl-border-<petal>). */
export function useTileBorders() {
  useEffect(() => {
    (['orange', 'maroon', 'teal', 'cyan'] as Petal[]).forEach((k, i) => document.documentElement.style.setProperty(`--bl-border-${k}`, `url(${tileBorderUrl(PETAL_RGB[k], 90 + i * 13)})`));
  }, []);
}

/**
 * Scroll progress for laying something: 0 as it enters, 1 once it has risen
 * well into view. Under reduced motion it is simply laid.
 */
function useLay(ref: RefObject<HTMLElement | null>, until = 0.55) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', `start ${until}`] });
  return useTransform(scrollYProgress, (v) => (reduce ? 1 : v));
}

/** Clip that lays an element in whole courses of tiles: rows from the bottom up, or columns left to right. */
function useLaidClip(ref: RefObject<HTMLElement | null>, p: MotionValue<number>, dir: 'up' | 'right') {
  return useTransform(p, (v) => {
    const el = ref.current;
    if (v >= 1 || !el) return v >= 1 ? 'none' : 'inset(0 0 100% 0)';
    const size = dir === 'up' ? el.offsetHeight : el.offsetWidth;
    const shown = Math.min(size, Math.ceil((clamp01(v) * size) / T) * T);
    const hidden = Math.max(0, size - shown);
    return dir === 'up' ? `inset(${hidden}px 0 0 0)` : `inset(0 ${hidden}px 0 0)`;
  });
}

/** A section heading, laid left to right in courses as it comes into view. */
function LaidHeading({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const p = useLay(ref, 0.62);
  const clipPath = useLaidClip(ref, p, 'right');
  return (
    <motion.h2 ref={ref} id={id} style={{ clipPath }} className={`type-display text-[clamp(2.4rem,5vw,4.5rem)] ${className}`}>
      {children}
    </motion.h2>
  );
}

/** A panel set into the wall: a border of glass tiles in the section's petal, laid from the bottom up. */
export function Panel({ petal, children, className = '', style }: { petal: Petal; children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const p = useLay(ref, 0.45);
  const clipPath = useLaidClip(ref, p, 'up');
  return (
    <motion.div
      ref={ref}
      className={`bg-[#070707] ${className}`}
      data-petal={petal}
      style={{ ...style, clipPath, border: '1px solid rgba(184,148,88,0.38)' }}
    >
      {children}
    </motion.div>
  );
}

/** A small eight-point star in gold, the building's mark, as a bullet or marker. */
function Tile({ petal: _petal, className = '' }: { petal: Petal; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`h-[12px] w-[12px] shrink-0 ${className}`}>
      <path d="M10 0 12.4 4.2 17.1 2.9 15.8 7.6 20 10 15.8 12.4 17.1 17.1 12.4 15.8 10 20 7.6 15.8 2.9 17.1 4.2 12.4 0 10 4.2 7.6 2.9 2.9 7.6 4.2Z" fill="#b89458" />
    </svg>
  );
}

/** One course of dark glass between sections, laid left to right as it scrolls past. */
export function Frieze() {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const p = useLay(box, 0.6);
  const clipPath = useLaidClip(box, p, 'right');
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const cols = paintNightStrip(cv, cv.parentElement!.clientWidth + 14, 14, dpr(), 1, { col: -1, row: -1 });
      cv.style.width = `${cols * 14}px`;
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv.parentElement!);
    return () => ro.disconnect();
  }, []);
  return (
    <motion.div ref={box} aria-hidden className="h-[14px] overflow-hidden bg-obsidian" style={{ clipPath }}>
      <canvas ref={ref} className="block h-[14px]" />
    </motion.div>
  );
}

/* ---------- What we do: three arched cells ---------- */

const MOTIFS: ArchMotif[] = ['code', 'launch', 'talk'];

/** The arch lays itself as it scrolls into view: rings from the outside in, its motif last. */
function Arch({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ full: HTMLCanvasElement; w: number; h: number; res: number; a: { r: number; tile: number; rings: number } } | null>(null);
  const draw = (t: number) => {
    const s = state.current;
    if (s) drawArchLaid(ref.current!.getContext('2d')!, s.full, s.w, s.h, s.res, s.a, t);
  };
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const w = cv.parentElement!.clientWidth;
      const h = Math.round(w * 0.8);
      const res = dpr();
      const full = document.createElement('canvas');
      const a = paintNightArch(full, w, h, w < 300 ? 10 : 12, res, PETAL_RGB[(['orange', 'teal', 'cyan'] as const)[i]!], 31 + i * 17, MOTIFS[i]!);
      cv.width = full.width;
      cv.height = full.height;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      state.current = { full, w, h, res, a };
      draw(progress.get());
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv.parentElement!);
    return () => ro.disconnect();
  }, [i]);
  const raf = useRef(0);
  useMotionValueEvent(progress, 'change', (t) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => draw(t));
  });
  return <canvas ref={ref} aria-hidden className="block" />;
}

function Cell({ w, i }: { w: (typeof WORK)[number]; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const p = useLay(ref, 0.45);
  // Each arch starts a beat after the one before it, left to right.
  const laid = useTransform(p, (v) => clamp01((v - i * 0.08) / 0.84));
  return (
    <li ref={ref} className={`flex flex-col overflow-hidden rounded-t-full bg-[#070707] ${i === 1 ? 'md:mt-16' : i === 2 ? 'md:mt-32' : ''}`}>
      <Arch i={i} progress={laid} />
      <div className="px-6 pb-8 pt-6">
        <h3 className="text-[clamp(1.3rem,1.9vw,1.6rem)] font-light leading-tight tracking-[-0.04em]">{w.title}</h3>
        <p className="mt-3 text-body-lg text-fog">{w.body}</p>
      </div>
    </li>
  );
}

export function MosaicAbout() {
  return (
    <section id="about" data-surface="dark" aria-labelledby="about-title" className="relative bg-obsidian pb-24 text-paper sm:pb-32">
      <Gateway seed={11}>
          <h2 id="about-title" className="type-display mx-auto max-w-[14ch] text-[clamp(2.6rem,6vw,5.5rem)]">{ABOUT.title}</h2>
        </Gateway>
      <div className={`container-x relative ${ROOM_PULL}`}>
        <div className="mx-auto grid max-w-[880px] gap-4 text-center md:grid-cols-2 md:gap-10 md:text-left">
          {ABOUT.body.map((t) => (
            <p key={t} className="text-body-lg text-fog">
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

/* ---------- TISMUN: the plaque ---------- */

function Feature({ f, i, n, progress }: { f: string; i: number; n: number; progress: MotionValue<number> }) {
  // Each line's tile is laid in turn, and the line comes up with it.
  const on = useTransform(progress, (v) => clamp01(v * n - i));
  const opacity = useTransform(on, [0, 1], [0.3, 1]);
  const scale = useTransform(on, [0, 1], [0, 1]);
  return (
    <motion.li style={{ opacity }} className="flex items-baseline gap-5 border-b border-line-dark py-4 text-body-lg">
      <motion.span style={{ scale }} className="inline-flex translate-y-[1px]">
        <Tile petal="teal" />
      </motion.span>
      {f}
    </motion.li>
  );
}

export function MosaicProjects() {
  const p = featuredProject;
  const list = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: lp } = useScroll({ target: list, offset: ['start 0.85', 'end 0.55'] });
  const featureP = useTransform(lp, (v) => (reduce ? 1 : v));
  if (!p) return null;
  return (
    <section id="projects" data-surface="dark" aria-labelledby="projects-title" className="relative bg-obsidian pb-24 text-paper sm:pb-32">
      <StarGate seed={23}>
          <h2 id="projects-title" className="type-display text-[clamp(2.6rem,6vw,5.5rem)]">Things we’ve shipped.</h2>
        </StarGate>
      <div className={`container-x relative ${ROOM_PULL}`}>
        <p className="mx-auto max-w-[46ch] text-center text-body-lg text-fog">Real platforms, used by real people at TIS.</p>

        {/* The plaque: TISMUN's mark set into a panel of teal glass. */}
        <Panel petal="teal" className="mt-14 grid gap-8 p-5 sm:p-8 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-14">
          <div className="flex items-center justify-center self-stretch bg-paper px-8 py-10 sm:px-14 sm:py-14">
            <TismunLogo className="w-full max-w-[380px]" />
          </div>
          <div>
            <h3 className="text-[clamp(2rem,4vw,3rem)] font-light leading-none tracking-[-0.05em]">{p.name}</h3>
            <p className="mt-4 flex items-center gap-3 text-body text-fog">
              <Tile petal="teal" />
              Live · {p.date}
            </p>
            <p className="mt-4 text-body-lg">{p.tagline}</p>
            <p className="mt-3 max-w-[60ch] text-body-lg text-fog">{p.description}</p>
            <div className="mt-7">
              {p.link ? (
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="pill-ghost">
                  Visit {p.name} <Arrow />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="inline-flex min-h-[48px] cursor-not-allowed items-center rounded-pill border border-line-dark px-6 text-body text-fog">Link coming soon</span>
              )}
            </div>
          </div>
        </Panel>

        <div className="mt-16 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <ul ref={list} className="border-t border-line-dark">
            {p.features.map((f, i) => (
              <Feature key={f} f={f} i={i} n={p.features.length} progress={featureP} />
            ))}
          </ul>
          <div>
            <p className="text-body text-fog">Built with</p>
            <p className="mt-3 font-mono text-[15px] leading-[1.8]">{p.stack.join(' · ')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Founders: niches in the wall ---------- */

function Niche({ f, i }: { f: (typeof founders)[number]; i: number }) {
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(true);
  const id = useId();
  return (
    <div className="flex flex-col">
      {/* A niche bordered in maroon glass; the photo sits back in it. */}
      <Panel petal="maroon" style={{ transitionDelay: `${i * 80}ms` }}>
        <div className="group relative aspect-[4/5] overflow-hidden bg-[#111]">
          {ok && <img src={f.photo} alt={`Portrait of ${f.name}`} loading="lazy" decoding="async" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" />}
          <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_8px_10px_22px_rgba(0,0,0,0.55)]" />
        </div>
      </Panel>
      <h3 className="mt-6 text-[clamp(1.4rem,2vw,1.7rem)] font-light leading-tight tracking-[-0.04em]">{f.name}</h3>
      <p className="mt-1 text-body text-fog">{f.role}</p>
      {f.tagline && <p className="mt-3 text-body-lg">{f.tagline}</p>}
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="pill-ghost mt-5 self-start">
        {open ? 'Hide bio' : 'Read bio'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
            <p className="whitespace-pre-line pt-4 text-body text-fog">{isPlaceholder(f.bio) ? 'Bio coming soon.' : f.bio}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MosaicFounders() {
  return (
    <section id="founders" data-surface="dark" aria-labelledby="founders-title" className="relative bg-obsidian pb-24 text-paper sm:pb-32">
      <DoorGate>
          <h2 id="founders-title" className="type-display mx-auto max-w-[14ch] text-[clamp(2.6rem,6vw,5.5rem)]">Three students. One campus to upgrade.</h2>
        </DoorGate>
      <div className={`container-x relative ${ROOM_PULL}`}>
        <p className="mx-auto max-w-[48ch] text-center text-body-lg text-fog">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
        <div className="mt-14 grid gap-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-12">
          {founders.map((f, i) => (
            <Niche key={f.id} f={f} i={i % 3} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Questions ---------- */

function Question({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-t border-line-dark first:border-t-0">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-5 py-6 text-left text-subheading font-light">
          <Tile petal="cyan" className={`transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
          <span className="flex-1">{q}</span>
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-dark" aria-hidden>
            <span className="absolute h-px w-3.5 bg-current" />
            <motion.span className="absolute h-3.5 w-px bg-current" animate={{ scaleY: open ? 0 : 1 }} transition={{ duration: 0.3 }} />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
            <p className="max-w-[60ch] pb-8 pl-[30px] text-body-lg text-fog">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function MosaicFaq() {
  return (
    <section id="faq" data-surface="dark" aria-labelledby="faq-title" className="relative bg-obsidian py-24 text-paper sm:py-32">
      <div className="container-x grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <LaidHeading id="faq-title">Questions</LaidHeading>
        <Panel petal="cyan" className="px-5 sm:px-8">
          <ul>
            {FAQ.map((x) => (
              <Question key={x.q} {...x} />
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

/* ---------- Footer: the page signs off in lit tiles ---------- */

const FOOT = [
  ['Mission', '#mission'],
  ['About', '#about'],
  ['Projects', '#projects'],
  ['Founders', '#founders'],
  ['Suggest an idea', '#suggestions'],
  ['Questions', '#faq'],
] as const;

export function MosaicFooter() {
  const { scrollTo } = useSmoothScroll();
  return (
    <footer data-surface="dark" className="relative bg-obsidian text-paper">
      <FooterGate>
        <LogoMark className="h-14 w-14" />
        <p className="type-display mt-8 text-[clamp(2.8rem,7vw,6rem)]">TIS Tech Council</p>
        <p className="mt-5 text-body-lg text-fog">{MOTTO}</p>
      </FooterGate>
      <div className="container-x pb-28 pt-10">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-body font-medium">TIS Tech Council</p>
              <p className="text-body-sm text-fog">Tashkent International School</p>
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-12 gap-y-1 sm:grid-cols-3">
              {FOOT.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(href);
                    }}
                    className="inline-flex min-h-[44px] items-center text-body text-fog transition-colors hover:text-paper"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-line-dark pt-6 text-body-sm text-fog sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council · Tashkent International School</p>
          <p className="flex items-center gap-3">
            <Owl className="h-6 w-6 text-paper" />
            {MOTTO}
          </p>
        </div>
      </div>
    </footer>
  );
}
