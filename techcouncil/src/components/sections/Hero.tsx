import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { SplitText } from '../ui/SplitText';
import { Magnetic } from '../ui/Magnetic';
import { HeroMark } from '../brand/HeroMark';
import { useIntroDone } from '@/lib/intro';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT } from '@/lib/motion';
import { featuredProject } from '@/data/projects';
import { getPhase, useNow } from './Countdown';

const CircuitField = lazy(() => import('./CircuitField'));

const MOTTO = [
  { word: 'Challenge', color: 'bg-orange' },
  { word: 'Explore', color: 'bg-teal-ink' },
  { word: 'Connect', color: 'bg-cyan' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** A terminal line that reports the next launch, live. It is a link to the project. */
function LaunchStatus() {
  const now = useNow(1000);
  const p = featuredProject;
  const { scrollTo } = useSmoothScroll();
  if (!p?.event) return null;
  const phase = getPhase(now, p.event.start, p.event.end);
  if (phase === 'after') return null;
  const s = Math.max(0, Math.floor((Date.parse(p.event.start) - now) / 1000));
  const left = `${Math.floor(s / 86400)}d ${pad(Math.floor((s % 86400) / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m ${pad(s % 60)}s`;
  return (
    <a
      href="#projects"
      onClick={(e) => {
        e.preventDefault();
        scrollTo('#projects');
      }}
      className="group inline-flex flex-col gap-1 rounded-md font-mono text-[13px] leading-relaxed text-fog-300 sm:text-[14px]"
      aria-label={phase === 'during' ? `${p.name} 2026 is live now. See the project.` : `${p.name} 2026 goes live in ${Math.floor(s / 86400)} days. See the project.`}
    >
      <span aria-hidden>
        <span className="text-cyan-ink">~/tech-council</span> <span className="text-fog-400">$</span> <span className="text-paper">status</span>
      </span>
      <span className="flex flex-wrap items-center gap-x-2" aria-hidden>
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success" />
          <span className="relative h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-paper underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-orange">{p.name} 2026</span>
        {phase === 'during' ? <span>is live right now</span> : <span>goes live in <span className="tabular text-orange-ink">{left}</span></span>}
      </span>
    </a>
  );
}

export function Hero() {
  const introDone = useIntroDone();
  const reduce = !!useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const ref = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [fieldReady, setFieldReady] = useState(false);

  // The mark turns a little as the hero scrolls away; the copy stays put.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 35]);
  const markY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);

  useEffect(() => {
    if (!introDone) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setFieldReady(true), { timeout: 800 });
    else window.setTimeout(() => setFieldReady(true), 300);
  }, [introDone]);

  const d = 0.1;

  // Feeds the cursor-lit grid (mouse only).
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--hx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--hy', `${e.clientY - r.top}px`);
  };

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={onPointerMove}
      className="relative isolate overflow-hidden [--hx:70%] [--hy:45%]"
      aria-labelledby="hero-title"
    >
      {/* One soft light behind the mark */}
      <div aria-hidden className="absolute -right-[20%] top-[-10%] -z-20 h-[120%] w-[85%] bg-[radial-gradient(closest-side,rgba(31,86,214,0.32),rgba(8,151,182,0.08)_55%,transparent)]" />
      {/* Dot grid, and a brighter copy of it revealed around the cursor */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(238,241,245,0.13) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 90% 80% at 60% 45%, #000 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 60% 45%, #000 35%, transparent 80%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 hidden [@media(hover:hover)]:block"
        style={{
          backgroundImage: 'radial-gradient(rgba(76,198,226,0.95) 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(220px circle at var(--hx) var(--hy), #000, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(220px circle at var(--hx) var(--hy), #000, transparent 70%)',
        }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-night" />
      {fieldReady && (
        <Suspense fallback={null}>
          <motion.div className="absolute inset-0 -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}>
            <CircuitField markRef={markRef} reduce={reduce} />
          </motion.div>
        </Suspense>
      )}

      <div className="container-x relative flex min-h-[100svh] flex-col pb-8 pt-[calc(64px+78vw)] sm:pt-40 lg:justify-center lg:pb-24 lg:pt-32">
        <div className="pointer-events-none absolute -right-[22vw] top-16 h-[78vw] w-[78vw] sm:-right-[12vw] sm:top-24 sm:h-[62vw] sm:w-[62vw] lg:-right-[5vw] lg:top-1/2 lg:h-[min(86vh,50vw)] lg:w-[min(86vh,50vw)] lg:-translate-y-1/2">
          <motion.div className="h-full w-full" style={{ rotate: markRotate, y: markY }}>
            <HeroMark ref={markRef} play={introDone} className="h-full w-full" />
          </motion.div>
        </div>

        <div className="relative">
          <h1
            id="hero-title"
            className="font-display text-[clamp(2.9rem,8.4vw,6.4rem)] font-semibold leading-[0.95] tracking-display text-paper lg:max-w-[9.5ch]"
          >
            <SplitText
              text="Student-built tech for a smarter TIS."
              play={introDone}
              delay={d + 0.25}
              stagger={0.07}
              suffix={
                <motion.span
                  aria-hidden
                  className="ml-[0.05em] inline-block h-[0.74em] w-[0.085em] translate-y-[0.02em]"
                  initial={{ opacity: 0 }}
                  animate={introDone ? { opacity: 1 } : undefined}
                  transition={{ delay: d + 1.1, duration: 0.2 }}
                >
                  <span className="block h-full w-full animate-blink bg-cyan-ink" />
                </motion.span>
              }
            />
          </h1>
        </div>

        <motion.p
          className="relative mt-6 max-w-[34ch] text-[18px] leading-relaxed text-fog-200 sm:mt-8 sm:text-[20px]"
          initial={{ opacity: 0, y: 16 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: d + 0.75 }}
        >
          We’re making Tashkent International School a smarter, more connected campus, one tool at a time.
        </motion.p>

        <motion.div
          className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: d + 0.9 }}
        >
          <Magnetic strength={0.25}>
            <a
              href="#suggestions"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#suggestions');
              }}
              className="btn-primary"
            >
              Suggest an idea
            </a>
          </Magnetic>
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('#projects');
            }}
            className="text-link inline-flex min-h-[48px] items-center"
          >
            See what we’ve built
          </a>
        </motion.div>

        <motion.div
          className="relative mt-10"
          initial={{ opacity: 0 }}
          animate={introDone ? { opacity: 1 } : undefined}
          transition={{ duration: 0.8, delay: d + 1.25 }}
        >
          <LaunchStatus />
        </motion.div>

        <motion.ul
          className="relative mt-auto flex gap-6 pt-14 text-[15px] font-medium text-fog-200 lg:absolute lg:bottom-10 lg:mt-0 lg:pt-0"
          aria-label="The TIS motto"
          initial={{ opacity: 0 }}
          animate={introDone ? { opacity: 1 } : undefined}
          transition={{ duration: 1, delay: d + 1.1 }}
        >
          {MOTTO.map((m) => (
            <li key={m.word} className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rotate-45 rounded-[2px] ${m.color}`} aria-hidden />
              {m.word}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
