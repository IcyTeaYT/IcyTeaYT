import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { HERO, MISSION } from '@/data/copy';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { Magnetic } from '@/components/ui/Magnetic';
import { Arrow } from '@/components/ui/Arrow';
import { SplitText } from '@/components/ui/SplitText';
import { DomeCanvas } from './JourneyParts';

/**
 * The film landings: a ten-second shot of the Registan, played by scroll,
 * with big type over it. Two cuts:
 *   night  full-bleed from the first frame; the headline sits low over the lit
 *          square and three short lines take over as the camera pushes in
 *   day    the shot opens as a framed card under the headline and grows to
 *          fill the screen, then pushes into the square towards sunset
 * Both fade to black under the star dome, where the mission lights word by word.
 */
export type Cut = 'night' | 'day';

const SCROLL = 3;
const at = (s: number) => s / SCROLL;
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

const BEATS = ['We build it.', 'Tools for teachers and students.', 'A direct line for your ideas.'];
const TIMES: Record<Cut, { film: [number, number]; title: [number, number]; beats: [number, number][]; fade: [number, number]; words: [number, number] }> = {
  night: {
    film: [0, at(1.7)],
    title: [at(0.04), at(0.3)],
    beats: [
      [at(0.32), at(0.72)],
      [at(0.74), at(1.14)],
      [at(1.16), at(1.56)],
    ],
    fade: [at(1.55), at(1.85)],
    words: [at(1.9), at(2.75)],
  },
  day: {
    film: [at(0.15), at(1.8)],
    title: [at(0.02), at(0.4)],
    beats: [
      [at(0.6), at(0.95)],
      [at(0.97), at(1.32)],
      [at(1.34), at(1.66)],
    ],
    fade: [at(1.62), at(1.9)],
    words: [at(1.95), at(2.75)],
  },
};

function Cta() {
  const { scrollTo } = useSmoothScroll();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
        className="hidden min-h-[48px] items-center px-2 text-body text-paper/80 transition-colors hover:text-paper sm:inline-flex"
      >
        See what we’ve built
      </a>
    </div>
  );
}

/** A line that drifts in out of a blur, holds, then drifts on. */
function Beat({ p, range, index, cut, children }: { p: MotionValue<number>; range: [number, number]; index: number; cut: Cut; children: ReactNode }) {
  const [a, b] = range;
  const d = (b - a) * 0.28;
  const opacity = useTransform(p, ...span([a, a + d, b - d, b], [0, 1, 1, 0]));
  const y = useTransform(p, ...span([a, a + d, b - d, b], [36, 0, 0, -36]));
  const filter = useTransform(p, ...span([a, a + d, b - d, b], ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(10px)']));
  return (
    <motion.div aria-hidden className={`pointer-events-none absolute inset-0 flex ${cut === 'night' ? 'items-end' : 'items-center'}`} style={{ opacity }}>
      <motion.div className={`container-x w-full ${cut === 'night' ? 'pb-[calc(6rem+var(--bar,0px))]' : 'text-center'}`} style={{ y, filter }}>
        <p className={`font-mono text-[12px] uppercase tracking-[0.2em] text-paper/70 ${cut === 'day' ? 'mx-auto' : ''}`}>
          0{index + 1} <span className="text-paper/35">/ 0{BEATS.length}</span>
        </p>
        <p className={`type-display mt-4 text-[clamp(2.5rem,7.4vw,7.5rem)] leading-[0.95] [text-shadow:0_2px_40px_rgba(0,0,0,0.35)] ${cut === 'day' ? 'mx-auto max-w-[16ch]' : 'max-w-[13ch]'}`}>{children}</p>
      </motion.div>
    </motion.div>
  );
}

function MissionWord({ children, p, range }: { children: string; p: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(p, ...span(range, [0.18, 1]));
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

export function FilmOpening({ cut }: { cut: Cut }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const T = TIMES[cut];

  // The shot is downloaded whole, so any moment in it can be shown at once; until
  // then its first frame stands in. Scroll sets where the camera should be and
  // the playhead eases towards it.
  useEffect(() => {
    const v = video.current!;
    let alive = true;
    let url = '';
    fetch(`/landing/${cut}.mp4`)
      .then((r) => r.blob())
      .then((b) => {
        if (!alive) return;
        url = URL.createObjectURL(b);
        v.src = url;
      })
      .catch(() => {
        if (alive) v.src = `/landing/${cut}.mp4`;
      });
    let cur = 0;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const v2 = p.get();
      if (!v.duration || v.readyState < 1 || v2 > T.fade[1] + 0.02) return;
      const target = seg(v2, ...T.film) * (v.duration - 0.05);
      cur += (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.004) cur = target;
      if (!v.seeking && Math.abs(v.currentTime - cur) > 0.008) v.currentTime = cur;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (url) URL.revokeObjectURL(url);
    };
  }, [cut]);

  // Copy and grade.
  const titleO = useTransform(p, ...span(T.title, [1, 0]));
  const titleY = useTransform(p, ...span(T.title, [0, -60]));
  const titleBlur = useTransform(p, ...span(T.title, ['blur(0px)', 'blur(12px)']));
  const filmO = useTransform(p, ...span(T.fade, [1, 0]));
  const filmScale = useTransform(p, ...span([0, T.fade[1]], [cut === 'day' ? 1.05 : 1, 1.03]));
  const domeP = useTransform(p, (v) => seg(v, T.fade[0], T.words[0] + 0.05) * 1.25);
  const turn = useTransform(p, (v) => v * 0.9);
  const missionO = useTransform(p, ...span([T.fade[1] - 0.02, T.words[0]], [0, 1]));
  const support = useTransform(p, ...span([T.words[1] - 0.02, T.words[1] + 0.05], [0, 1]));
  const supportY = useTransform(p, ...span([T.words[1] - 0.02, T.words[1] + 0.05], [20, 0]));
  const scrollHint = useTransform(p, ...span([0, at(0.12)], [1, 0]));

  // Day: the shot opens as a card under the headline and grows to fill the screen.
  const grow = useTransform(p, ...span([at(0.02), at(0.55)], [0, 1]));
  const clip = useTransform(grow, (g) => {
    const e = 1 - Math.pow(1 - g, 3);
    const k = 1 - e;
    return `inset(${(k * 46).toFixed(2)}svh ${(k * 4).toFixed(2)}vw ${(k * 3).toFixed(2)}svh ${(k * 4).toFixed(2)}vw round ${(k * 28).toFixed(1)}px)`;
  });

  const words = MISSION.line.split(' ');
  return (
    <section id="top" ref={section} data-surface="dark" aria-labelledby="hero-title" className="relative bg-obsidian text-paper" style={{ height: `calc(${(SCROLL + 1) * 100}svh - var(--bar, 0px))` }}>
      <div id="mission" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: `calc((${SCROLL * 100}svh - var(--bar, 0px)) * ${T.words[0]})` }} />
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden">
        {/* Under the film: the dome and the mission. */}
        <div className="absolute inset-0">
          <DomeCanvas progress={domeP} seed={41} turn={turn} />
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ opacity: missionO }}>
            <h2 id="mission-title" className="type-display max-w-[15ch] text-[clamp(2.4rem,5.4vw,4.8rem)]">
              <span className="sr-only">{MISSION.line}</span>
              <span aria-hidden>
                {words.map((w, i) => (
                  <MissionWord key={i} p={p} range={[T.words[0] + (i / words.length) * (T.words[1] - T.words[0]), T.words[0] + ((i + 1) / words.length) * (T.words[1] - T.words[0])]}>
                    {w}
                  </MissionWord>
                ))}
              </span>
            </h2>
            <motion.p className="mt-7 max-w-[46ch] text-body-lg text-fog" style={{ opacity: support, y: supportY }}>
              {MISSION.support}
            </motion.p>
          </motion.div>
        </div>

        {/* The film. */}
        <motion.div className="absolute inset-0" style={{ opacity: filmO, clipPath: cut === 'day' ? clip : undefined }}>
          <motion.video ref={video} aria-hidden muted playsInline preload="auto" poster={`/landing/${cut}.jpg`} className="absolute inset-0 h-full w-full object-cover" style={{ scale: filmScale }} />
          {cut === 'night' ? (
            <>
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.65)_100%)]" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
            </>
          ) : (
            <>
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_40%,rgba(0,0,0,0)_50%,rgba(0,0,0,0.45)_100%)]" />
              <motion.div aria-hidden className="absolute inset-0 bg-black/30" style={{ opacity: grow }} />
            </>
          )}
        </motion.div>

        {/* Beats over the film. */}
        {BEATS.map((b, i) => (
          <Beat key={b} p={p} range={T.beats[i]!} index={i} cut={cut}>
            {b}
          </Beat>
        ))}

        {/* The headline. */}
        {cut === 'night' ? (
          <motion.div className="absolute inset-0 flex flex-col justify-between" style={{ opacity: titleO, y: titleY, filter: titleBlur }}>
            <div className="container-x flex items-start justify-between pt-[calc(96px+var(--bar,0px))] font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70 md:text-[12px]">
              <span>Registan · Samarkand</span>
              <span className="hidden md:block">39.6547° N &nbsp;66.9758° E</span>
              <span className="hidden sm:block">Tashkent International School</span>
            </div>
            <div className="container-x grid gap-8 pb-[calc(7.5rem+var(--bar,0px))] md:grid-cols-[1.5fr_1fr] md:items-end">
              <h1 id="hero-title" className="type-display max-w-[12ch] text-[clamp(2.9rem,7vw,7rem)] leading-[0.92] [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
                <SplitText text={HERO.title} play delay={0.3} stagger={0.08} />
              </h1>
              <motion.div className="flex flex-col items-start gap-6 md:pb-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.9 }}>
                <p className="max-w-[40ch] text-body-lg text-paper/80">{HERO.lede}</p>
                <Cta />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-[46svh]" style={{ opacity: titleO, y: titleY, filter: titleBlur }}>
            <div className="container-x pointer-events-auto flex h-full flex-col justify-end gap-5 pb-6 md:flex-row md:items-end md:justify-between md:gap-10 md:pb-8">
              <div>
                <motion.p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog md:text-[12px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
                  Registan · Samarkand — the council, Tashkent
                </motion.p>
                <h1 id="hero-title" className="type-display mt-3 max-w-[13ch] text-[clamp(2.4rem,5.6vw,5.6rem)] leading-[0.95]">
                  <SplitText text={HERO.title} play delay={0.25} stagger={0.07} />
                </h1>
              </div>
              <motion.div className="flex flex-col items-start gap-5 md:max-w-[36ch]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.8 }}>
                <p className="hidden text-body text-fog md:block">{HERO.lede}</p>
                <Cta />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Scroll cue and credit. */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(1.25rem+var(--bar,0px))]" style={{ opacity: scrollHint }}>
          <div className="container-x flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-paper/55 md:text-[11px]">
            <span className={cut === 'day' ? 'invisible' : ''}>Scroll</span>
            {cut === 'night' && <span className="normal-case tracking-normal">Film from a photo by Kraftabbas, CC BY-SA 4.0</span>}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

