import './blend.css';
import '@fontsource-variable/jetbrains-mono';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Shell } from '../shared/Shell';
import { AnnouncementBar, BAR_HEIGHT } from '@/components/AnnouncementBar';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/sections/Hero';
import { Mission } from '@/components/sections/Mission';
import { SuggestionBox } from '@/components/sections/SuggestionBox';
import { SplitText } from '@/components/ui/SplitText';
import { Magnetic } from '@/components/ui/Magnetic';
import { Arrow } from '@/components/ui/Arrow';
import { HERO, MISSION } from '@/data/copy';
import { IntroContext } from '@/lib/intro';
import { EASE_OUT, span } from '@/lib/motion';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { CATEGORY_GLASS, paintNightStrip, wallUrl } from './night';
import { cutOpening, drawCascade, drawGateway, drawMedallion, layoutGateway, layoutMedallion, warmGateway, warmMedallion, type Gateway, type Medallion } from './journey';
import { DomeCanvas } from './JourneyParts';
import { FilmOpening } from './film';
import { MosaicAbout, MosaicFaq, MosaicFooter, MosaicFounders, MosaicProjects, useTileBorders } from './sections';

function HeroCopy({ align = 'left' }: { align?: 'left' | 'center' }) {
  const { scrollTo } = useSmoothScroll();
  return (
    <>
      <h1 id="hero-title" className={`type-display max-w-[14ch] text-[clamp(2.6rem,6vw,5.5rem)] ${align === 'center' ? 'mx-auto' : ''}`}>
        <SplitText text={HERO.title} play delay={0.15} stagger={0.07} />
      </h1>
      <div className={`mt-6 flex flex-col gap-7 ${align === 'center' ? 'items-center' : 'items-start'}`}>
        <motion.p className={`max-w-[44ch] text-body-lg text-fog ${align === 'center' ? 'mx-auto' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.7 }}>
          {HERO.lede}
        </motion.p>
        <motion.div className="flex flex-wrap items-center gap-x-3 gap-y-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.85 }}>
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
            className="hidden min-h-[48px] items-center px-2 text-body text-fog transition-colors hover:text-paper sm:inline-flex"
          >
            See what we’ve built
          </a>
        </motion.div>
      </div>
    </>
  );
}

/**
 * Option: the original site, taken on a journey through a Samarkand-style
 * building. Landings to compare (`?hero=`): the two films (film.tsx, the
 * default is `night`), and four drawn ones, each a single camera move
 * that ends under a star dome with the mission:
 *   square  a night square of three tiled gateways; the camera glides across
 *           it and through the middle arch
 *   star    a great girih star drawn across the dark by a golden line; it
 *           opens like an iris
 *   dome    the page opens looking up into a slowly turning dome; the
 *           headline gives way to the mission in its heart
 * Every room after is entered a different way; the page ends pulling back
 * out of a tiled gateway.
 */
type Hero = 'night' | 'day' | 'cascade' | 'square' | 'star' | 'dome';
const HEROES: { id: Hero; label: string }[] = [
  { id: 'night', label: 'Night film' },
  { id: 'day', label: 'Day film' },
  { id: 'cascade', label: 'Falling tiles' },
  { id: 'star', label: 'Golden star' },
  { id: 'square', label: 'Night square' },
  { id: 'dome', label: 'Under the dome' },
];
function readHero(): Hero {
  const q = new URLSearchParams(window.location.search).get('hero');
  return q === 'square' || q === 'dome' || q === 'star' || q === 'cascade' || q === 'day' ? q : 'night';
}
/** The opening's scroll, in screens; `at` turns a point in it into progress. */
const SCROLL = 2.8;
const at = (screens: number) => screens / SCROLL;

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const res = () => Math.min(window.devicePixelRatio || 1, 1.75);

/** Per landing: when the camera move runs, and when the mission's words light. */
const TIMING: Record<Exclude<Hero, 'night' | 'day'>, { move: [number, number]; words: [number, number] }> = {
  square: { move: [at(0.08), at(1.45)], words: [at(1.5), at(2.45)] },
  star: { move: [at(0.25), at(1.25)], words: [at(1.3), at(2.3)] },
  cascade: { move: [at(0.25), at(1.25)], words: [at(1.3), at(2.3)] },
  dome: { move: [at(0.06), at(0.4)], words: [at(0.55), at(1.8)] },
};

function MissionWord({ children, p, range }: { children: string; p: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(p, ...span(range, [0.18, 1]));
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

function Opening({ hero }: { hero: Exclude<Hero, 'night' | 'day'> }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const backCv = useRef<HTMLCanvasElement>(null);
  const frontCv = useRef<HTMLCanvasElement>(null);
  const copyBox = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const T = TIMING[hero];
  const move = (v: number) => inOut(seg(v, ...T.move));

  // The line draws the opening artwork once on arrival (a few seconds), then scroll takes over.
  const intro = useMotionValue(0);
  useEffect(() => {
    const c = animate(intro, 1.25, { duration: hero === 'dome' ? 3.4 : hero === 'cascade' ? 3.2 : 2.6, ease: [0.33, 0, 0.2, 1], delay: 0.25 });
    return () => c.stop();
  }, [hero, intro]);

  // The dome: drawn on arrival for the dome landing; behind the others, drawn as the camera nears it.
  const domeFront = useTransform([p, intro], ([v, i]: number[]) => (hero === 'dome' ? i! : Math.max(0, seg(v!, T.move[0] + (T.move[1] - T.move[0]) * 0.35, T.words[0] + 0.05) * 1.25)));
  const turn = useTransform(p, (v) => v * 0.9);
  const words = MISSION.line.split(' ');
  const support = useTransform(p, ...span([T.words[1] - 0.02, T.words[1] + 0.06], [0, 1]));
  const supportY = useTransform(p, ...span([T.words[1] - 0.02, T.words[1] + 0.06], [20, 0]));
  const missionOpacity = useTransform(p, (v) => (hero === 'dome' ? seg(v, T.move[1] - 0.04, T.move[1] + 0.06) : seg(v, T.move[0] + (T.move[1] - T.move[0]) * 0.7, T.move[1])));

  const geo = useRef<{ W: number; H: number; gate?: Gateway; side?: HTMLCanvasElement; sky?: HTMLCanvasElement; medal?: Medallion } | null>(null);
  const draw = (v: number) => {
    const g = geo.current;
    const back = backCv.current;
    const front = frontCv.current;
    if (!g || !back || !front) return;
    const r = res();
    const k = move(v);
    const fr = hero === 'square' ? 1.2 : Math.min(intro.get(), 1.2);
    if (hero === 'square' && g.gate && g.side && g.sky) {
      // A night square: sky and the side gateways behind, the middle gateway in front; the camera glides in.
      const s = 0.6 * Math.pow(g.gate.through / 0.6, k);
      const bc = back.getContext('2d')!;
      bc.setTransform(r, 0, 0, r, 0, 0);
      bc.clearRect(0, 0, g.W, g.H);
      bc.drawImage(g.sky, 0, -k * g.H * 0.25, g.W, g.H * 1.25);
      for (const dir of [-1, 1]) {
        const sc = s * 0.74;
        const x = g.W / 2 + dir * g.W * 0.6 * s;
        bc.save();
        bc.translate(x, g.gate.cy);
        bc.transform(dir * -1 * -1, dir * 0.05, 0, 1, 0, 0);
        bc.scale(sc, sc);
        bc.globalAlpha = 0.85;
        bc.drawImage(g.side, -g.W / 2, -g.gate.cy, g.W, g.H);
        bc.restore();
      }
      cutOpening(bc, g.gate, r, s);
      front.style.visibility = k >= 0.995 ? 'hidden' : 'visible';
      back.style.visibility = k >= 0.995 ? 'hidden' : 'visible';
      if (k < 0.995) drawGateway(front.getContext('2d')!, g.gate, r, fr, s);
    }
    if (hero === 'star' && g.medal) {
      front.style.visibility = k >= 0.995 ? 'hidden' : 'visible';
      if (k < 0.995) drawMedallion(front.getContext('2d')!, g.medal, r, fr, k);
    }
    if (hero === 'cascade' && g.medal) {
      front.style.visibility = k >= 0.995 ? 'hidden' : 'visible';
      const built = Math.min(1, intro.get() / 1.25);
      if (k > 0 || built >= 1) drawMedallion(front.getContext('2d')!, g.medal, r, 1.2, k);
      else drawCascade(front.getContext('2d')!, g.medal, r, built);
    }
  };

  useEffect(() => {
    const el = stage.current!;
    let last = '';
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (!W || !H || `${W}x${H}` === last) return;
      last = `${W}x${H}`;
      const r = res();
      for (const c of [backCv.current!, frontCv.current!]) {
        c.width = Math.round(W * r);
        c.height = Math.round(H * r);
      }
      const g: NonNullable<typeof geo.current> = { W, H };
      if (hero === 'square') {
        g.gate = layoutGateway(W, H, 11);
        warmGateway(g.gate, r);
        const side = document.createElement('canvas');
        side.width = Math.round(W * r);
        side.height = Math.round(H * r);
        drawGateway(side.getContext('2d')!, layoutGateway(W, H, 31), r, 1.2, 1);
        g.side = side;
        // The night sky: deep blue to black, and a scatter of stars.
        const sky = document.createElement('canvas');
        sky.width = W;
        sky.height = Math.round(H * 1.25);
        const sc = sky.getContext('2d')!;
        const gr = sc.createLinearGradient(0, 0, 0, sky.height);
        gr.addColorStop(0, '#02040a');
        gr.addColorStop(0.55, '#0b1222');
        gr.addColorStop(1, '#000');
        sc.fillStyle = gr;
        sc.fillRect(0, 0, W, sky.height);
        let seed = 9;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 280; i++) {
          sc.globalAlpha = 0.2 + rnd() * 0.6;
          sc.fillStyle = '#fff';
          const z = rnd() < 0.1 ? 1.6 : 0.9;
          sc.fillRect(rnd() * W, rnd() * sky.height * 0.55, z, z);
        }
        g.sky = sky;
      }
      if (hero === 'star' || hero === 'cascade') {
        g.medal = layoutMedallion(W, H, 5);
        warmMedallion(g.medal, r);
      }
      geo.current = g;
      draw(p.get());
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hero]);

  const raf = useRef(0);
  const frame = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const v = p.get();
      draw(v);
      if (copyBox.current) {
        const o = seg(v, at(0.03), hero === 'dome' ? at(0.32) : at(0.28));
        copyBox.current.style.opacity = String(1 - o);
        copyBox.current.style.transform = `translate3d(0,${-40 * o}px,0)`;
        copyBox.current.style.visibility = o >= 1 ? 'hidden' : 'visible';
      }
    });
  };
  useMotionValueEvent(p, 'change', frame);
  useMotionValueEvent(intro, 'change', frame);

  const missionAt = T.words[0];
  return (
    <section id="top" ref={section} data-surface="dark" aria-labelledby="hero-title" className="relative bg-obsidian text-paper" style={{ height: `calc(${(SCROLL + 1) * 100}svh - var(--bar, 0px))` }}>
      {/* Where "Mission" in the nav lands. */}
      <div id="mission" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: `calc((${SCROLL * 100}svh - var(--bar, 0px)) * ${missionAt})` }} />
      <div ref={stage} className="sticky top-0 h-[100svh] min-h-[600px] overflow-hidden">
        {/* The dome and the mission: behind everything, seen through the opening, or the landing itself. */}
        <div className="absolute inset-0">
          <DomeCanvas progress={domeFront} seed={41} turn={turn} />
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ opacity: missionOpacity }}>
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
        <canvas ref={backCv} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
        <canvas ref={frontCv} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
        {(hero === 'star' || hero === 'cascade') && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.55)_42%,rgba(0,0,0,0)_68%)] max-md:bg-[linear-gradient(0deg,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.8)_45%,rgba(0,0,0,0)_75%)]" />}
        {hero === 'square' && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[68%] bg-gradient-to-b from-black/90 via-black/70 to-transparent" />}
        <div ref={copyBox} className={`absolute inset-0 flex ${hero === 'star' || hero === 'cascade' ? 'items-end' : hero === 'dome' ? 'items-center' : 'items-start'}`}>
          <div className={`container-x ${hero === 'star' || hero === 'cascade' ? 'pb-[calc(5rem+var(--bar,0px))]' : hero === 'dome' ? 'text-center' : 'pt-[calc(110px+var(--bar,0px))] text-center'}`}>
            <HeroCopy align={hero === 'star' || hero === 'cascade' ? 'left' : 'center'} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Preview-only: compare the landings. */
function HeroPicker({ current }: { current: Hero }) {
  return (
    <nav aria-label="Compare landings" className="fixed bottom-[68px] left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center overflow-x-auto gap-1 whitespace-nowrap rounded-pill border border-line-dark bg-obsidian/90 p-1 text-[12px] text-fog md:text-[13px]">
      {HEROES.map((h) => (
        <a key={h.id} href={`?hero=${h.id}`} aria-current={h.id === current ? 'page' : undefined} className={`rounded-pill px-3 py-1.5 transition-colors ${h.id === current ? 'bg-paper text-obsidian' : 'hover:text-paper'}`}>
          {h.label}
        </a>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* A sent idea, laid into the wall                                      */
/* ------------------------------------------------------------------ */

/** A sent idea drops into the wall as a glass tile of its category's colour. */
function TileSuccess({ category, reset }: { category: string | null; reset: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [slot, setSlot] = useState<{ col: number; row: number } | null>(null);
  const tile = 22;
  const rows = 4;
  useEffect(() => {
    const w = wrap.current!.clientWidth;
    const cols = Math.floor(w / tile);
    const gap = { col: Math.floor(cols * 0.58), row: 1 };
    paintNightStrip(ref.current!, w, tile, Math.min(devicePixelRatio || 1, 2), rows, gap);
    ref.current!.style.width = `${cols * tile}px`;
    ref.current!.style.height = `${rows * tile}px`;
    setSlot(gap);
  }, []);
  return (
    <div className="flex flex-col items-start justify-center py-10" role="status" aria-live="polite">
      <div ref={wrap} className="relative w-full" style={{ height: rows * tile }} aria-hidden>
        <canvas ref={ref} className="block" />
        {slot && (
          <motion.span
            className="absolute block rounded-[2px]"
            style={{ left: slot.col * tile + 1.5, top: slot.row * tile + 1.5, width: tile - 3, height: tile - 3, background: CATEGORY_GLASS[category ?? 'other'], boxShadow: '0 0 18px 2px rgba(255,255,255,0.25), inset 0 2px 0 rgba(255,255,255,0.35)' }}
            initial={reduce ? { opacity: 0 } : { y: -160, rotate: -24, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 240, damping: 19, delay: 0.2 }}
          />
        )}
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.9, duration: 0.6, ease: EASE_OUT }}>
        <h3 className="type-heading mt-8 text-heading-sm sm:text-[44px]">Idea received.</h3>
        <p className="mt-3 max-w-sm text-body-lg text-fog">Thanks for helping build a smarter TIS. Your idea is a tile in the wall now; the council reads every one.</p>
        <button type="button" onClick={reset} className="pill-ghost mt-8">
          Send another idea
        </button>
      </motion.div>
    </div>
  );
}

export default function BlendPage() {
  const reduce = useReducedMotion();
  const [hero] = useState(readHero);
  const [barOpen, setBarOpen] = useState(true);
  const barHeight = barOpen ? BAR_HEIGHT : 0;
  useEffect(() => {
    document.documentElement.style.setProperty('--bl-wall', `url(${wallUrl()})`);
  }, []);
  useTileBorders();
  return (
    <Shell world="blend" switcherClass="rounded-pill border border-line-dark bg-obsidian/90 text-fog [&_a]:rounded-pill [&_[data-here]]:bg-paper [&_[data-here]]:text-obsidian">
      <IntroContext.Provider value={true}>
        {barOpen && <AnnouncementBar onClose={() => setBarOpen(false)} />}
        <Navbar offset={barHeight} />
        <main id="main" className="relative z-10 bg-obsidian" style={{ ['--bar' as string]: `${barHeight}px` }}>
          {reduce ? (
            <>
              <Hero />
              <Mission />
            </>
          ) : hero === 'night' || hero === 'day' ? (
            <FilmOpening cut={hero} />
          ) : (
            <Opening hero={hero} />
          )}
          <MosaicAbout />
          <MosaicProjects />
          <MosaicFounders />
          <SuggestionBox renderSuccess={(o) => <TileSuccess {...o} />} />
          <MosaicFaq />
        </main>
        <MosaicFooter />
        {!reduce && <HeroPicker current={hero} />}
      </IntroContext.Provider>
    </Shell>
  );
}
