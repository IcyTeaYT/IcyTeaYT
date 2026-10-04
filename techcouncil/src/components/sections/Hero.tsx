import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { SplitText } from '../ui/SplitText';
import { Magnetic } from '../ui/Magnetic';
import { Arrow } from '../ui/Arrow';
import { useIntroDone } from '@/lib/intro';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT, span } from '@/lib/motion';
import type { WaveRig } from './WaveField';

const WaveField = lazy(() => import('./WaveField'));

/**
 * The hero is a camera move. It stays pinned for a screen of scrolling while
 * the camera does one of three shots, then the page carries on:
 * - dolly:   the camera pushes through the headline and into the lines.
 * - tunnel:  the lines wrap into a tunnel and the camera flies down it.
 * - vertigo: a dolly zoom; the headline holds still while the world stretches.
 * `?hero=` picks one so the three can be compared; dolly is the default.
 */
export type HeroShot = 'dolly' | 'tunnel' | 'vertigo';
export const HERO_SHOTS: { id: HeroShot; label: string }[] = [
  { id: 'dolly', label: 'Dolly' },
  { id: 'tunnel', label: 'Tunnel' },
  { id: 'vertigo', label: 'Vertigo' },
];
const RIG: Record<HeroShot, WaveRig> = { dolly: 'flat', tunnel: 'tunnel', vertigo: 'vertigo' };

function readShot(): { shot: HeroShot; comparing: boolean } {
  const q = new URLSearchParams(window.location.search).get('hero');
  const found = HERO_SHOTS.find((s) => s.id === q);
  return { shot: found?.id ?? 'dolly', comparing: !!found };
}

const cubicIn = (t: number) => t * t * t;
const quadIn = (t: number) => t * t;

/** Scroll-linked values for each shot: headline, supporting copy, canvas. */
function useShot(shot: HeroShot, progress: ReturnType<typeof useScroll>['scrollYProgress'], still: boolean) {
  const p = progress;
  const map = (input: number[], output: number[], ease?: (t: number) => number) =>
    useTransform(p, ...span(input, still ? output.map(() => output[0]!) : output), ease ? { ease } : undefined);

  const dolly = shot === 'dolly';
  const tunnel = shot === 'tunnel';

  // Headline: dolly flies through it; tunnel lets it drift past; vertigo holds it.
  const headScale = map(dolly ? [0, 0.8] : tunnel ? [0.25, 0.8] : [0, 1], dolly ? [1, 7] : tunnel ? [1, 1.7] : [1, 1], dolly ? cubicIn : quadIn);
  const headOpacity = map(dolly ? [0.42, 0.68] : tunnel ? [0.38, 0.66] : [0.72, 0.92], [1, 0]);
  const headBlurPx = map(dolly ? [0.28, 0.66] : tunnel ? [0.36, 0.7] : [0.72, 0.92], [0, dolly ? 16 : 10]);
  const headFilter = useMotionTemplate`blur(${headBlurPx}px)`;

  // Supporting copy and buttons sit nearer the lens, so they leave first.
  const subOpacity = map([0, 0.22], [1, 0]);
  const subY = map([0, 0.3], [0, dolly ? 140 : 60]);
  const subScale = map([0, 0.3], [1, dolly ? 1.2 : 1]);

  // The canvas: dolly also pushes the field toward the camera.
  const fieldOpacity = map([0.78, 1], [1, dolly ? 0.25 : 0.5]);
  // The shade that keeps the copy legible lifts once the copy has gone, so
  // the lower half of the frame joins the shot.
  const shadeOpacity = map([0.05, 0.3], [1, 0.2]);

  return { headScale, headOpacity, headFilter, subOpacity, subY, subScale, fieldOpacity, shadeOpacity };
}

export function Hero() {
  const introDone = useIntroDone();
  const reduce = !!useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const ref = useRef<HTMLElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [{ shot, comparing }] = useState(readShot);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const cam = useShot(shot, scrollYProgress, reduce);

  useEffect(() => {
    if (!introDone) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setCanvasReady(true), { timeout: 600 });
    else window.setTimeout(() => setCanvasReady(true), 200);
  }, [introDone]);

  const d = 0.15;

  return (
    <section
      id="top"
      ref={ref}
      data-surface="dark"
      aria-labelledby="hero-title"
      className="relative bg-obsidian text-paper"
      // A screen of scroll for the camera move; none under reduced motion.
      style={{ height: reduce ? undefined : 'calc(220svh - var(--bar, 0px))' }}
    >
      <div className="sticky top-0 isolate flex h-[calc(100svh-var(--bar,0px))] min-h-[560px] items-end overflow-hidden">
        {canvasReady && (
          <Suspense fallback={null}>
            <motion.div
              className="absolute inset-0 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6 }}
            >
              <motion.div className="absolute inset-0" style={{ opacity: cam.fieldOpacity }}>
                <WaveField reduce={reduce} rig={RIG[shot]} progress={scrollYProgress} />
              </motion.div>
            </motion.div>
          </Suspense>
        )}
        <motion.div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" style={{ opacity: cam.shadeOpacity }} />

        <div className="container-x relative pb-20 pt-40 sm:pb-28">
          <motion.h1
            id="hero-title"
            className="type-display max-w-[14ch] text-[clamp(3rem,7.4vw,6rem)]"
            style={{ scale: cam.headScale, opacity: cam.headOpacity, filter: cam.headFilter, originX: 0.42, originY: 0.6 }}
          >
            <SplitText text="Student-built tech for a smarter TIS." play={introDone} delay={d} stagger={0.07} />
          </motion.h1>

          <motion.div style={{ opacity: cam.subOpacity, y: cam.subY, scale: cam.subScale, originX: 0, originY: 0 }}>
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
        </div>

        <motion.div className="absolute bottom-8 right-5 hidden sm:right-8 md:block" style={{ opacity: cam.subOpacity }}>
          <motion.p
            className="text-caption text-fog"
            initial={{ opacity: 0 }}
            animate={introDone ? { opacity: 1 } : undefined}
            transition={{ duration: 1, delay: d + 1 }}
          >
            Challenge | Explore | Connect
          </motion.p>
        </motion.div>
      </div>

      {comparing && <ShotPicker current={shot} />}
    </section>
  );
}

/** Preview-only switcher for comparing the three hero shots (shown with ?hero=). */
function ShotPicker({ current }: { current: HeroShot }) {
  return (
    <nav
      aria-label="Compare hero options"
      data-chrome
      className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-pill border border-line-dark bg-obsidian/90 p-1 text-body-sm text-paper backdrop-blur"
    >
      {HERO_SHOTS.map((s) => (
        <a
          key={s.id}
          href={`?hero=${s.id}`}
          aria-current={s.id === current ? 'page' : undefined}
          className={`rounded-pill px-4 py-2 transition-colors ${s.id === current ? 'bg-paper text-obsidian' : 'text-fog hover:text-paper'}`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
