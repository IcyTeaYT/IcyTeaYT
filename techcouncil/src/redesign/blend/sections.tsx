import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { TismunLogo } from '@/components/brand/TismunLogo';
import { useNow } from '@/components/sections/Countdown';
import { Arrow } from '@/components/ui/Arrow';
import { ABOUT, WORK } from '@/data/copy';
import { founders, isPlaceholder } from '@/data/founders';
import { featuredProject } from '@/data/projects';
import { EASE_OUT, span } from '@/lib/motion';
import { countdownParts } from '@/lib/suggestion';
import { paintNightArch, paintNightStrip, PETAL_RGB } from './night';

/**
 * The Mosaic option's sections, laid in dark glass: the "what we do" cells as
 * arches, TISMUN as a mounted plaque beside a clock, the founders in niches.
 * Thin Inter as on the original site, with small mono labels.
 */

const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

/** A small mono label: section number and name. */
export function Label({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.16em] text-fog">
      <span className="text-paper">{n}</span>
      <span aria-hidden className="h-px w-8 bg-line-dark" />
      {children}
    </p>
  );
}

/** One course of dark glass between sections. */
export function Frieze() {
  const ref = useRef<HTMLCanvasElement>(null);
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
    <div aria-hidden className="h-[14px] overflow-hidden bg-obsidian">
      <canvas ref={ref} className="block h-[14px]" />
    </div>
  );
}

/* ---------- What we do: three arched cells ---------- */

function Arch({ i }: { i: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const paint = () => {
      const w = cv.parentElement!.clientWidth;
      const h = Math.round(w * 0.8);
      paintNightArch(cv, w, h, w < 300 ? 10 : 12, dpr(), PETAL_RGB[(['orange', 'teal', 'cyan'] as const)[i]!], 31 + i * 17);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv.parentElement!);
    return () => ro.disconnect();
  }, [i]);
  return <canvas ref={ref} aria-hidden className="block" />;
}

function Cell({ w, i }: { w: (typeof WORK)[number]; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.45'] });
  const lag = i * 0.1;
  const y = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [90, 0]), { ease: settle });
  const scale = useTransform(p, ...span([lag, 1], reduce ? [1, 1] : [0.92, 1]), { ease: settle });
  return (
    <motion.li ref={ref} style={{ y, scale }} className={`flex flex-col overflow-hidden rounded-t-full border border-line-dark bg-[#0a0a0a] ${i === 1 ? 'md:mt-16' : i === 2 ? 'md:mt-32' : ''}`}>
      <Arch i={i} />
      <div className="border-t border-line-dark px-6 pb-8 pt-6">
        <p className="font-mono text-[12px] tracking-[0.16em] text-fog">0{i + 1}</p>
        <h3 className="mt-3 text-[clamp(1.3rem,1.9vw,1.6rem)] font-light leading-tight tracking-[-0.04em]">{w.title}</h3>
        <p className="mt-3 text-body-lg text-fog">{w.body}</p>
      </div>
    </motion.li>
  );
}

export function MosaicAbout() {
  return (
    <section id="about" data-surface="dark" aria-labelledby="about-title" className="relative bg-obsidian pb-24 pt-24 text-paper sm:pb-32 sm:pt-32">
      <div className="container-x">
        <Label n="01">About</Label>
        <h2 id="about-title" className="type-display mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.5rem)]">
          {ABOUT.title}
        </h2>
        <div className="mt-8 grid max-w-[980px] gap-4 md:grid-cols-2 md:gap-10">
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

/* ---------- TISMUN: the plaque and the clock ---------- */

function Clock({ start, end, timezoneLabel }: { start: string; end: string; timezoneLabel: string }) {
  const now = useNow();
  const reduce = useReducedMotion();
  const c = countdownParts(now, start, end);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <figure className="flex flex-col items-center">
      <div className="relative aspect-square w-[min(80vw,400px)] rounded-full border border-line-dark bg-[#0a0a0a]">
        <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full">
          {Array.from({ length: 60 }, (_, i) => (
            <line key={i} x1="100" y1={i % 5 ? 9 : 7} x2="100" y2={i % 5 ? 14 : 20} stroke="#fff" strokeOpacity={i % 5 ? 0.35 : 0.9} strokeWidth={i % 5 ? 0.7 : 1.6} transform={`rotate(${i * 6} 100 100)`} />
          ))}
          <g style={{ transform: `rotate(${(60 - c.secs) * 6}deg)`, transformOrigin: '100px 100px', transition: reduce || c.secs === 59 ? 'none' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
            <line x1="100" y1="114" x2="100" y2="24" stroke="#F29839" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="100" cy="100" r="3" fill="#F29839" />
          </g>
        </svg>
        <div className="relative flex h-full flex-col items-center justify-center text-center">
          {c.phase === 'before' ? (
            <>
              <span className="type-display text-[clamp(3.2rem,9vw,5.5rem)] tabular">{c.days}</span>
              <span className="mt-1 font-mono text-[12px] uppercase tracking-[0.16em] text-fog">days</span>
              <span className="mt-3 font-mono text-[clamp(1rem,2vw,1.25rem)] tabular">
                {pad(c.hours)}:{pad(c.mins)}:{pad(c.secs)}
              </span>
            </>
          ) : (
            <span className="max-w-[10ch] text-subheading font-light">{c.phase === 'during' ? 'Happening now' : 'Conference complete'}</span>
          )}
        </div>
      </div>
      <figcaption className="mt-5 text-center font-mono text-[12px] uppercase tracking-[0.14em] text-fog">
        {c.phase === 'before' && <span className="sr-only">{c.days} days, {c.hours} hours and {c.mins} minutes until the conference. </span>}
        Until TISMUN · {timezoneLabel}
      </figcaption>
    </figure>
  );
}

export function MosaicProjects() {
  const p = featuredProject;
  if (!p) return null;
  return (
    <section id="projects" data-surface="dark" aria-labelledby="projects-title" className="relative bg-obsidian py-24 text-paper sm:py-32">
      <div className="container-x">
        <Label n="02">Projects</Label>
        <h2 id="projects-title" className="type-display mt-6 text-[clamp(2.4rem,5vw,4.5rem)]">
          Things we’ve shipped.
        </h2>
        <p className="mt-5 max-w-[46ch] text-body-lg text-fog">Real platforms, used by real people at TIS.</p>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[7fr_5fr] lg:gap-16">
          {/* The plaque: the project's mark set into a dark glass panel. */}
          <div className="border border-line-dark bg-[#0a0a0a] p-5 sm:p-8">
            <div className="flex items-center justify-center rounded-[4px] bg-paper px-8 py-10 sm:px-14 sm:py-14">
              <TismunLogo className="w-full max-w-[380px]" />
            </div>
            <h3 className="mt-8 text-[clamp(2rem,4vw,3rem)] font-light leading-none tracking-[-0.05em]">{p.name}</h3>
            <p className="mt-3 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em] text-fog">
              <span className="h-2 w-2 bg-[#10AACC]" aria-hidden />
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
          {p.event && <Clock {...p.event} />}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <ul className="border-t border-line-dark">
            {p.features.map((f, i) => (
              <li key={f} className="flex gap-5 border-b border-line-dark py-4 text-body-lg">
                <span className="pt-1 font-mono text-[12px] text-fog">{String(i + 1).padStart(2, '0')}</span>
                {f}
              </li>
            ))}
          </ul>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-fog">Built with</p>
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
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.5'] });
  const y = useTransform(p, ...span([i * 0.1, 1], reduce ? [0, 0] : [70, 0]), { ease: settle });
  return (
    <motion.div ref={ref} style={{ y }} className="flex flex-col">
      {/* A square niche: the photo sits back in the dark wall. */}
      <div className="border border-line-dark bg-[#0d0d0d] p-2.5">
        <div className="group relative aspect-[4/5] overflow-hidden bg-[#111]">
          {ok && <img src={f.photo} alt={`Portrait of ${f.name}`} loading="lazy" decoding="async" onError={() => setOk(false)} className="bl-photo absolute inset-0 h-full w-full object-cover object-[50%_18%]" />}
          <span aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_10px_12px_26px_rgba(0,0,0,0.6)]" />
        </div>
      </div>
      <p className="mt-5 font-mono text-[12px] uppercase tracking-[0.14em] text-fog">{f.role}</p>
      <h3 className="mt-2 text-[clamp(1.4rem,2vw,1.7rem)] font-light leading-tight tracking-[-0.04em]">{f.name}</h3>
      {f.tagline && <p className="mt-3 text-body-lg text-fog">{f.tagline}</p>}
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
    </motion.div>
  );
}

export function MosaicFounders() {
  return (
    <section id="founders" data-surface="dark" aria-labelledby="founders-title" className="relative bg-obsidian py-24 text-paper sm:py-32">
      <div className="container-x">
        <Label n="03">Founders</Label>
        <h2 id="founders-title" className="type-display mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.5rem)]">
          Three students. One campus to upgrade.
        </h2>
        <p className="mt-5 max-w-[48ch] text-body-lg text-fog">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
        <div className="mt-14 grid gap-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-12">
          {founders.map((f, i) => (
            <Niche key={f.id} f={f} i={i % 3} />
          ))}
        </div>
      </div>
    </section>
  );
}
