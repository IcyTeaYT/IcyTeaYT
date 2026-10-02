import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/LogoMark';
import { Owl } from '@/components/brand/Owl';
import { TismunLogo } from '@/components/brand/TismunLogo';
import { Arrow } from '@/components/ui/Arrow';
import { SplitText } from '@/components/ui/SplitText';
import { ABOUT, FAQ, MOTTO, WORK } from '@/data/copy';
import { founders, isPlaceholder } from '@/data/founders';
import { featuredProject } from '@/data/projects';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { drawArchLaid, paintNightArch, paintNightStrip, PETAL_RGB, type ArchMotif } from './night';

/**
 * The Mosaic option's sections, laid in dark glass: the "what we do" cells as
 * arches, TISMUN as a mounted plaque, the founders in niches, the questions
 * and the footer, all on the same faint wall of tiles.
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

/** One course of dark glass between sections, laid left to right as it scrolls past. */
export function Frieze() {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'start 0.55'] });
  const clip = useTransform(scrollYProgress, (v) => `inset(0 ${reduce ? 0 : Math.round((1 - v) * 100)}% 0 0)`);
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
    <div ref={box} aria-hidden className="h-[14px] overflow-hidden bg-obsidian">
      <motion.canvas ref={ref} className="block h-[14px]" style={{ clipPath: clip }} />
    </div>
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
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.45'] });
  const lag = i * 0.1;
  const y = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [90, 0]), { ease: settle });
  const scale = useTransform(p, ...span([lag, 1], reduce ? [1, 1] : [0.92, 1]), { ease: settle });
  // The mosaic is laid as the cell rises into place, and finishes a little after it settles.
  const { scrollYProgress: layP } = useScroll({ target: ref, offset: ['start 0.95', 'start 0.45'] });
  const laid = useTransform(layP, (v) => (reduce ? 1 : Math.min(1, Math.max(0, (v - lag * 0.5) / 0.9))));
  return (
    <motion.li ref={ref} style={{ y, scale }} className={`flex flex-col overflow-hidden rounded-t-full border border-line-dark bg-[#0a0a0a] ${i === 1 ? 'md:mt-16' : i === 2 ? 'md:mt-32' : ''}`}>
      <Arch i={i} progress={laid} />
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
    <section id="about" data-surface="dark" aria-labelledby="about-title" className="bl-wall relative pb-24 pt-24 text-paper sm:pb-32 sm:pt-32">
      <div className="container-x">
        <Label n="01">About</Label>
        <h2 id="about-title" className="type-display mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.5rem)]">
          <SplitText text={ABOUT.title} play="inView" stagger={0.05} />
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

/* ---------- TISMUN: the plaque ---------- */

function Feature({ f, i, n, progress }: { f: string; i: number; n: number; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, ...span([i / n, (i + 1) / n], [0.25, 1]));
  return (
    <motion.li style={{ opacity }} className="flex gap-5 border-b border-line-dark py-4 text-body-lg">
      <span className="pt-1 font-mono text-[12px] text-fog">{String(i + 1).padStart(2, '0')}</span>
      {f}
    </motion.li>
  );
}

export function MosaicProjects() {
  const p = featuredProject;
  const plaque = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: pp } = useScroll({ target: plaque, offset: ['start end', 'start 0.4'] });
  const plaqueClip = useTransform(pp, (v) => (reduce ? 'none' : `inset(${Math.round((1 - settle(v)) * 100)}% 0 0 0 round 0px)`));
  const logoScale = useTransform(pp, ...span([0, 1], reduce ? [1, 1] : [1.18, 1]), { ease: settle });
  const { scrollYProgress: lp } = useScroll({ target: list, offset: ['start 0.85', 'end 0.55'] });
  const featureP = useTransform(lp, (v) => (reduce ? 1 : v));
  if (!p) return null;
  return (
    <section id="projects" data-surface="dark" aria-labelledby="projects-title" className="bl-wall relative py-24 text-paper sm:py-32">
      <div className="container-x">
        <Label n="02">Projects</Label>
        <h2 id="projects-title" className="type-display mt-6 text-[clamp(2.4rem,5vw,4.5rem)]">
          <SplitText text={'Things we’ve shipped.'} play="inView" stagger={0.05} />
        </h2>
        <p className="mt-5 max-w-[46ch] text-body-lg text-fog">Real platforms, used by real people at TIS.</p>

        {/* The plaque: the project's mark set into a dark glass panel. */}
        <motion.div ref={plaque} style={{ clipPath: plaqueClip }} className="mt-14 grid gap-8 border border-line-dark bg-[#0a0a0a] p-5 sm:p-8 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-14">
          <div className="flex items-center justify-center self-stretch overflow-hidden rounded-[4px] bg-paper px-8 py-10 sm:px-14 sm:py-14">
            <motion.div style={{ scale: logoScale }} className="w-full max-w-[380px]">
              <TismunLogo className="w-full" />
            </motion.div>
          </div>
          <div>
            <h3 className=" text-[clamp(2rem,4vw,3rem)] font-light leading-none tracking-[-0.05em]">{p.name}</h3>
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
        </motion.div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <ul ref={list} className="border-t border-line-dark">
            {p.features.map((f, i) => (
              <Feature key={f} f={f} i={i} n={p.features.length} progress={featureP} />
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
  const photoScale = useTransform(p, ...span([i * 0.1, 1], reduce ? [1, 1] : [1.22, 1]), { ease: settle });
  return (
    <motion.div ref={ref} style={{ y }} className="flex flex-col">
      {/* A square niche: the photo sits back in the dark wall. */}
      <div className="border border-line-dark bg-[#0d0d0d] p-2.5">
        <div className="group relative aspect-[4/5] overflow-hidden bg-[#111]">
          {ok && <motion.img style={{ scale: photoScale }} src={f.photo} alt={`Portrait of ${f.name}`} loading="lazy" decoding="async" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" />}
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
    <section id="founders" data-surface="dark" aria-labelledby="founders-title" className="bl-wall relative py-24 text-paper sm:py-32">
      <div className="container-x">
        <Label n="03">Founders</Label>
        <h2 id="founders-title" className="type-display mt-6 max-w-[18ch] text-[clamp(2.4rem,5vw,4.5rem)]">
          <SplitText text={'Three students. One campus to upgrade.'} play="inView" stagger={0.05} />
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

/* ---------- Questions ---------- */

function Question({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <motion.li
      className="border-t border-line-dark last:border-b"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay: i * 0.07 }}
    >
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-5 py-6 text-left text-subheading font-light">
          <span className="w-8 shrink-0 font-mono text-[12px] text-fog">{String(i + 1).padStart(2, '0')}</span>
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
            <p className="max-w-[60ch] pb-8 pl-[52px] text-body-lg text-fog">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function MosaicFaq() {
  return (
    <section id="faq" data-surface="dark" aria-labelledby="faq-title" className="bl-wall relative py-24 text-paper sm:py-32">
      <div className="container-x grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div>
          <Label n="04">Questions</Label>
          <h2 id="faq-title" className="type-display mt-6 text-[clamp(2.4rem,5vw,4.5rem)]">
          <SplitText text={'Questions'} play="inView" stagger={0.05} />
        </h2>
        </div>
        <ul>
          {FAQ.map((x, i) => (
            <Question key={x.q} {...x} i={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

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
    <footer data-surface="dark" className="bl-wall relative text-paper">
      <Frieze />
      <div className="container-x pb-28 pt-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-body font-medium">TIS Tech Council</p>
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-fog">Tashkent International School</p>
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
                    className="inline-flex min-h-[40px] items-center text-body text-fog transition-colors hover:text-paper"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="type-display mt-20 text-[clamp(3.25rem,12vw,11rem)] leading-[0.9]">
          <SplitText text="TIS Tech Council" play="inView" stagger={0.09} />
        </p>
        <div className="mt-8 flex flex-col gap-2 border-t border-line-dark pt-6 font-mono text-[12px] uppercase tracking-[0.12em] text-fog sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council</p>
          <p className="flex items-center gap-3">
            <Owl className="h-6 w-6 text-paper" />
            {MOTTO}
          </p>
        </div>
      </div>
    </footer>
  );
}
