import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { SplitText } from '../ui/SplitText';
import { Magnetic } from '../ui/Magnetic';
import { useIntroDone } from '@/lib/intro';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT } from '@/lib/motion';

const HeroCanvas = lazy(() => import('./HeroCanvas'));

export function Hero() {
  const introDone = useIntroDone();
  const reduce = !!useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const ref = useRef<HTMLElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Parallax: content drifts up and fades as the hero scrolls away.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.94]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);

  // Mount the canvas once the browser is idle so it never competes with first paint.
  useEffect(() => {
    if (!introDone) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setCanvasReady(true), { timeout: 600 });
    else window.setTimeout(() => setCanvasReady(true), 200);
  }, [introDone]);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--hx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--hy', `${e.clientY - r.top}px`);
  };

  const d = 0.15; // delay after the intro curtain lifts

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={onPointerMove}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-24 pt-32 [--hx:50%] [--hy:40%] sm:pt-36"
      aria-labelledby="hero-title"
    >
      {/* Background stack */}
      <motion.div className="absolute inset-0 -z-10" style={{ y: bgY }} aria-hidden="true">
        {/* Dim dot grid everywhere, bright grid revealed around the cursor */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(rgba(140,170,255,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 30%, transparent 75%)',
          }}
        />
        <div
          className="absolute inset-0 hidden [@media(hover:hover)]:block"
          style={{
            backgroundImage: 'radial-gradient(rgba(77,232,250,0.9) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(240px circle at var(--hx) var(--hy), #000, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(240px circle at var(--hx) var(--hy), #000, transparent 70%)',
          }}
        />
        {/* Blooms */}
        <div className="absolute left-1/2 top-[-18%] h-[80vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(47,111,245,0.42),transparent)] blur-2xl" />
        <div className="absolute right-[-10%] top-[30%] h-[50vh] w-[50vw] rounded-full bg-[radial-gradient(closest-side,rgba(24,212,238,0.16),transparent)] blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[50vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgba(31,86,214,0.22),transparent)] blur-2xl" />
        {canvasReady && (
          <Suspense fallback={null}>
            <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}>
              <HeroCanvas reduce={reduce} />
            </motion.div>
          </Suspense>
        )}
        {/* Horizon line + bottom fade into the page */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-ink-950" />
      </motion.div>

      <motion.div className="container-x relative" style={{ y, opacity, scale }}>
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={introDone ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: d }}
        >
          <span className="glass inline-flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] text-mist-200">
            <span className="rounded-full bg-volt-400/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-label text-volt-300">
              Est. 2026
            </span>
            Student-led · Tashkent International School
          </span>
        </motion.div>

        <h1
          id="hero-title"
          className="mt-7 max-w-[15ch] font-display text-[clamp(2.75rem,10.5vw,8.25rem)] font-semibold leading-[0.92] tracking-tightest text-white"
        >
          <SplitText
            text="Student-built tech for a smarter TIS."
            play={introDone}
            delay={d + 0.08}
            stagger={0.075}
            wordClass={(w) => (w === 'smarter' || w === 'TIS.' ? 'text-gradient animate-shine' : undefined)}
          />
        </h1>

        <motion.p
          className="mt-7 max-w-xl text-[17px] leading-relaxed text-mist-300 sm:text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: d + 0.55 }}
        >
          The TIS Tech Council is making our school a smarter, more connected campus, with tools and projects designed,
          built and run by students.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: d + 0.7 }}
        >
          <Magnetic>
            <a
              href="#suggestions"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#suggestions');
              }}
              className="btn-primary group"
            >
              <span className="relative z-10">Suggest an idea</span>
              <svg viewBox="0 0 16 16" className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
            </a>
          </Magnetic>
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('#projects');
            }}
            className="btn-ghost"
          >
            See what we’ve built
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom rail: motto + scroll cue */}
      <motion.div
        className="container-x absolute inset-x-0 bottom-6 flex items-end justify-between"
        initial={{ opacity: 0 }}
        animate={introDone ? { opacity: 1 } : undefined}
        transition={{ duration: 1, delay: d + 1 }}
      >
        <p className="font-mono text-[11px] uppercase tracking-label text-mist-400">
          Challenge <span className="text-volt-400">|</span> Explore <span className="text-volt-400">|</span> Connect
        </p>
        <div className="hidden items-center gap-3 font-mono text-[11px] uppercase tracking-label text-mist-400 sm:flex" aria-hidden>
          Scroll
          <span className="relative block h-9 w-[1px] overflow-hidden bg-white/10">
            <motion.span
              className="absolute left-0 top-0 h-3 w-full bg-volt-400"
              animate={reduce ? undefined : { y: [-12, 36] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </div>
      </motion.div>
    </section>
  );
}
