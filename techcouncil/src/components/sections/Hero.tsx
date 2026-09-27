import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { SplitText } from '../ui/SplitText';
import { Magnetic } from '../ui/Magnetic';
import { Arrow } from '../ui/Arrow';
import { useIntroDone } from '@/lib/intro';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT } from '@/lib/motion';

const WaveField = lazy(() => import('./WaveField'));

/** Full-bleed black hero: a WebGL wave field, light display type lower-left. */
export function Hero() {
  const introDone = useIntroDone();
  const reduce = !!useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const ref = useRef<HTMLElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    if (!introDone) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setCanvasReady(true), { timeout: 600 });
    else window.setTimeout(() => setCanvasReady(true), 200);
  }, [introDone]);

  const d = 0.15;

  return (
    <section id="top" ref={ref} data-surface="dark" className="relative isolate flex min-h-[calc(100svh-var(--bar,0px))] items-end overflow-hidden bg-obsidian text-paper" aria-labelledby="hero-title">
      {canvasReady && (
        <Suspense fallback={null}>
          <motion.div className="absolute inset-0 -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}>
            <WaveField reduce={reduce} />
          </motion.div>
        </Suspense>
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" />

      <motion.div className="container-x relative pb-20 pt-40 sm:pb-28" style={{ y, opacity }}>
        <h1 id="hero-title" className="type-display max-w-[14ch] text-[clamp(3rem,7.4vw,6rem)]">
          <SplitText text="Student-built tech for a smarter TIS." play={introDone} delay={d} stagger={0.07} />
        </h1>

        <motion.p
          className="mt-8 max-w-[40ch] text-body-lg text-fog"
          initial={{ opacity: 0, y: 16 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: d + 0.55 }}
        >
          The TIS Tech Council is making Tashkent International School a smarter, more connected campus, with tools and projects built
          by students.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={introDone ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: d + 0.7 }}
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
            className="inline-flex min-h-[48px] items-center px-2 text-body text-fog transition-colors hover:text-paper"
          >
            See what we’ve built
          </a>
        </motion.div>
      </motion.div>

      <motion.p
        className="absolute bottom-8 right-5 hidden text-caption text-fog sm:right-8 md:block"
        initial={{ opacity: 0 }}
        animate={introDone ? { opacity: 1 } : undefined}
        transition={{ duration: 1, delay: d + 1 }}
      >
        Challenge | Explore | Connect
      </motion.p>
    </section>
  );
}
