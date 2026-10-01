import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/onest';
import './metro.css';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Shell } from '../shared/Shell';
import { LogoMark } from '@/components/brand/LogoMark';
import { Owl } from '@/components/brand/Owl';
import { TismunLogo } from '@/components/brand/TismunLogo';
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
const LINE = '#0897B6';

/** The line, station by station. Uzbek names follow Tashkent metro signage. */
const STATIONS = [
  { id: 'mission', en: 'Mission', uz: 'Missiya' },
  { id: 'about', en: 'About', uz: 'Biz haqimizda' },
  { id: 'projects', en: 'Projects', uz: 'Loyihalar' },
  { id: 'founders', en: 'Founders', uz: 'Asoschilar' },
  { id: 'suggestions', en: 'Ideas', uz: 'G‘oyalar' },
  { id: 'faq', en: 'Questions', uz: 'Savollar' },
] as const;
type StationId = (typeof STATIONS)[number]['id'];
const station = (id: StationId) => STATIONS.find((s) => s.id === id)!;
/** The map starts at the platform, so the first ride visibly moves the train. */
const MAP = [{ id: 'top', en: 'Start', uz: 'Boshlanish' } as const, ...STATIONS];
type MapId = (typeof MAP)[number]['id'];

function useGo() {
  const { scrollTo } = useSmoothScroll();
  return (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo(`#${id}`, { offset: -72 });
  };
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const brassBtn =
  'inline-flex min-h-[52px] items-center gap-3 rounded-full bg-brass px-7 font-station text-[19px] font-bold uppercase tracking-[0.04em] text-granite transition-colors duration-200 hover:bg-marble';

/* ------------------------------------------------------------------ */
/* The line map: navigation, and where the train is                    */
/* ------------------------------------------------------------------ */

function LineMap({ compact = false }: { compact?: boolean }) {
  const go = useGo();
  const { scrollTo } = useSmoothScroll();
  const reduce = useReducedMotion();
  const track = useRef<HTMLOListElement>(null);
  const train = useRef<HTMLSpanElement>(null);
  const [here, setHere] = useState<MapId>('top');
  const { scrollY } = useScroll();
  const anchors = useRef<number[]>([]);
  const dots = useRef<number[]>([]);

  useEffect(() => {
    const measure = () => {
      anchors.current = MAP.map((s) => {
        if (s.id === 'top') return 0;
        const el = document.getElementById(s.id);
        return el ? el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4 : 0;
      });
      const t = track.current;
      if (t && t.offsetParent) {
        const base = t.getBoundingClientRect().left;
        dots.current = [...t.querySelectorAll<HTMLElement>('[data-dot]')].map((d) => d.getBoundingClientRect().left + d.offsetWidth / 2 - base);
      }
      place(window.scrollY);
    };
    const place = (y: number) => {
      const a = anchors.current;
      const d = dots.current;
      if (!a.length || !d.length || !train.current) return;
      let i = 0;
      while (i < a.length - 1 && y >= a[i + 1]!) i++;
      const t = i === a.length - 1 ? 0 : Math.min(1, Math.max(0, (y - a[i]!) / Math.max(1, a[i + 1]! - a[i]!)));
      const x = d[i]! + ((d[i + 1] ?? d[i]!) - d[i]!) * t;
      train.current.style.transform = `translate3d(${x}px, -50%, 0)`;
      setHere(MAP[t > 0.5 && i < a.length - 1 ? i + 1 : i]!.id);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const unsub = scrollY.on('change', place);
    return () => {
      ro.disconnect();
      unsub();
    };
  }, [scrollY]);

  const dot = compact ? 14 : 22;
  return (
    <ol ref={track} className={`relative flex w-full items-start justify-between ${compact ? '' : 'max-w-[700px]'}`}>
      <span aria-hidden className="absolute rounded-full" style={{ left: dot / 2, right: dot / 2, top: dot / 2 - 1.5, height: 3, background: LINE }} />
      {/* The train: a carriage with a lit window, riding the line. */}
      <span
        ref={train}
        aria-hidden
        className="absolute left-0 z-10 flex items-center justify-center rounded-[6px] bg-marble shadow-[0_0_0_3px_#16181B]"
        style={{ top: dot / 2, width: compact ? 22 : 30, height: compact ? 9 : 12, marginLeft: compact ? -11 : -15, transition: reduce ? undefined : 'transform 120ms linear' }}
      >
        <span className="block h-[3px] w-[55%] rounded-full" style={{ background: LINE }} />
      </span>
      {MAP.map((s) => (
        <li key={s.id} className="relative flex flex-col items-center">
          <a
            href={`#${s.id}`}
            onClick={s.id === 'top' ? (e) => (e.preventDefault(), scrollTo(0)) : go(s.id)}
            aria-current={here === s.id ? 'location' : undefined}
            aria-label={compact ? s.en : undefined}
            className="group flex min-h-[24px] min-w-[24px] flex-col items-center"
          >
            <span data-dot className={`relative z-0 block rounded-full transition-colors ${here === s.id ? 'bg-marble' : 'bg-granite'}`} style={{ width: dot, height: dot, borderWidth: compact ? 2.5 : 3, borderColor: LINE }} />
            {!compact && <span className={`mt-1.5 font-station text-[14px] font-semibold uppercase tracking-[0.06em] transition-colors ${here === s.id ? 'text-marble' : 'text-marble/60 group-hover:text-marble'}`}>{s.en}</span>}
          </a>
        </li>
      ))}
    </ol>
  );
}

function Nav() {
  const go = useGo();
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brass/50 bg-granite text-marble">
      <nav aria-label="Line map" className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
          }}
          className="flex shrink-0 items-center gap-3"
          aria-label="TIS Tech Council, back to the first station"
        >
          <LogoMark className="h-9 w-9 text-marble" />
          <span className="font-station text-[20px] font-bold uppercase tracking-[0.04em]">TIS Tech Council</span>
        </a>
        <div className="hidden flex-1 justify-center px-6 lg:flex">
          <LineMap />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href="#suggestions" onClick={go('suggestions')} className="hidden min-h-[44px] items-center rounded-full bg-brass px-5 font-station text-[16px] font-bold uppercase tracking-[0.04em] text-granite hover:bg-marble sm:inline-flex">
            Suggest an idea
          </a>
          <button type="button" className="flex h-11 w-11 items-center justify-center lg:hidden" aria-expanded={open} aria-controls="mt-menu" aria-label={open ? 'Close line map' : 'Open line map'} onClick={() => setOpen((o) => !o)}>
            <span className="relative block h-3 w-6">
              <span className={`absolute left-0 h-[2px] w-6 bg-marble transition-transform duration-300 ${open ? 'top-[5px] rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-[2px] w-6 bg-marble transition-transform duration-300 ${open ? 'top-[5px] -rotate-45' : 'top-[10px]'}`} />
            </span>
          </button>
        </div>
      </nav>
      {/* Phones and tablets keep the map too: a strip under the header. */}
      <div className="border-t border-marble/10 px-5 pb-2.5 pt-2 lg:hidden">
        <LineMap compact />
      </div>
      <AnimatePresence>
        {open && (
          <motion.ol
            id="mt-menu"
            className="relative border-t border-brass/40 bg-granite px-5 pb-8 pt-4 lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span aria-hidden className="absolute bottom-10 left-[30px] top-8 w-[3px] rounded-full" style={{ background: LINE }} />
            {STATIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    setOpen(false);
                    go(s.id)(e);
                  }}
                  className="relative flex items-center gap-5 py-3"
                >
                  <span className="relative z-10 block h-[22px] w-[22px] rounded-full border-[3px] bg-granite" style={{ borderColor: LINE }} />
                  <span>
                    <span className="block font-station text-[26px] font-bold uppercase leading-none">{s.en}</span>
                    <span className="block font-onest text-[13px] text-brass">{s.uz}</span>
                  </span>
                </a>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Station furniture                                                    */
/* ------------------------------------------------------------------ */

/** The sign at the head of every station: line dot, English, Uzbek. */
function StationSign({ id, dark }: { id: StationId; dark: boolean }) {
  const s = station(id);
  return (
    <div className={`flex items-center gap-5 border-y-2 py-4 ${dark ? 'border-brass/60' : 'border-brass'}`}>
      <span aria-hidden className="block h-7 w-7 shrink-0 rounded-full border-[5px]" style={{ borderColor: LINE }} />
      <span>
        <span className="block font-station text-[clamp(2.25rem,5vw,4.25rem)] font-extrabold uppercase leading-none tracking-[0.01em]">{s.en}</span>
        <span className={`mt-1.5 block font-onest text-[15px] sm:text-[17px] ${dark ? 'text-brass' : 'text-[#7A6440]'}`} lang="uz">
          {s.uz}
        </span>
      </span>
    </div>
  );
}

function Station({ id, tone, children, label }: { id: StationId; tone: 'marble' | 'granite' | 'vault'; children: ReactNode; label: string }) {
  const dark = tone !== 'marble';
  const bg = tone === 'marble' ? 'bg-marble text-granite mt-marble' : tone === 'granite' ? 'bg-granite text-marble' : 'bg-vault text-marble mt-tiles';
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative py-20 sm:py-28 ${bg}`}>
      <div className="relative mx-auto max-w-[1360px] px-5 sm:px-8">
        <StationSign id={id} dark={dark} />
        <h2 id={`${id}-title`} className="sr-only">
          {label}
        </h2>
        <div className="mt-12 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The ride: a tunnel dolly between stations                            */
/* ------------------------------------------------------------------ */

const RINGS = 16;

function Ride({ to, color }: { to: StationId; color: string }) {
  const reduce = useReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const rings = useRef<(HTMLSpanElement | null)[]>([]);
  const board = useRef<HTMLDivElement>(null);
  const bloom = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const s = station(to);

  const place = (v: number) => {
    const travel = 10;
    const cam = v * travel;
    for (let i = 0; i < RINGS; i++) {
      const el = rings.current[i];
      if (!el) continue;
      const dz = i + 0.6 - cam;
      // Rings we have passed are reused further down the tunnel.
      const z = ((dz % RINGS) + RINGS) % RINGS || RINGS;
      const sc = 1 / z;
      const o = Math.min(1, (RINGS - z) / 5) * Math.min(1, (6 - sc) / 3);
      el.style.transform = `translate3d(-50%,-50%,0) scale(${sc.toFixed(4)})`;
      el.style.opacity = Math.max(0, o).toFixed(3);
    }
    if (board.current) {
      // The board reaches the window a little before the ride ends, then holds.
      const dz = Math.max(1, (0.86 - v) * travel + 1);
      const sc = 1 / dz;
      board.current.style.transform = `translate3d(-50%,-50%,0) scale(${sc.toFixed(4)})`;
      board.current.style.opacity = Math.min(1, Math.max(0, (sc - 0.08) * 4)).toFixed(3);
    }
    // Station light blooms down the tunnel as we pull in.
    if (bloom.current) bloom.current.style.opacity = Math.min(1, Math.max(0, (v - 0.6) / 0.3)).toFixed(3);
  };
  useEffect(() => place(p.get()));
  useMotionValueEvent(p, 'change', place);

  if (reduce) {
    return (
      <div className="bg-granite py-14 text-center text-marble" aria-hidden>
        <p className="font-station text-[44px] font-extrabold uppercase">{s.en}</p>
        <p className="mt-1 font-onest text-[15px] text-brass">Next station · Keyingi bekat</p>
      </div>
    );
  }

  return (
    <div ref={section} data-ride className="relative h-[160svh] bg-granite" aria-hidden>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 54%, #22252A 0%, #16181B 46%, #0E0F11 100%)' }} />
        <div ref={bloom} className="absolute inset-0 opacity-0" style={{ background: `radial-gradient(circle at 50% 54%, ${color}55 0%, ${color}14 22%, transparent 46%)` }} />
        {/* The rails, converging on the tunnel's far end. */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M30 100 L49.4 54 M70 100 L50.6 54" stroke="#B08D57" strokeOpacity="0.4" strokeWidth="0.25" vectorEffect="non-scaling-stroke" fill="none" />
        </svg>
        <div className="absolute left-1/2 top-[54%]" style={{ width: 0, height: 0 }}>
          {Array.from({ length: RINGS }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                rings.current[i] = el;
              }}
              className="absolute left-0 top-0 block rounded-full border-[1.5px] border-marble/40"
              style={{ width: 'min(64vw, 64vh)', height: 'min(64vw, 64vh)', willChange: 'transform, opacity' }}
            >
              {/* The tunnel lining: a band of tile inside each ring. */}
              <span className="absolute inset-[5%] block rounded-full border border-dashed border-brass/30" />
              {/* Lamps on the lining: short radial dashes that stretch into streaks as they pass. */}
              {[18, 72, 108, 162, 225, 315].map((deg) => (
                <span key={deg} className="absolute inset-0 block" style={{ transform: `rotate(${deg}deg)` }}>
                  <span className="absolute right-[1.5%] top-1/2 block h-[2px] w-[6%] -translate-y-1/2 rounded-full" style={{ background: color }} />
                </span>
              ))}
            </span>
          ))}
          <div ref={board} className="absolute left-0 top-0 w-[min(560px,86vw)] rounded-[18px] border-2 border-brass bg-granite px-8 py-7 text-center text-marble">
            <p className="font-station text-[clamp(2.75rem,8vw,4.5rem)] font-extrabold uppercase leading-none">{s.en}</p>
            <p className="mt-2 font-onest text-[15px] text-marble/70" lang="uz">
              {s.uz}
            </p>
            <p className="mt-4 border-t border-brass/40 pt-3 font-onest text-[15px] text-brass">Next station · Keyingi bekat</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* First station: the platform                                          */
/* ------------------------------------------------------------------ */

function TunnelMouth() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden className="relative h-full min-h-[120px] w-full overflow-hidden rounded-t-full border-[6px] border-b-0 border-marble bg-[#0E0F11] lg:aspect-[3/4] lg:h-auto lg:border-[10px] lg:border-b-0">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 58%, rgba(236,232,224,0.32) 0%, rgba(236,232,224,0.06) 22%, transparent 48%)' }} />
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="mt-ring absolute left-1/2 top-[58%] block aspect-square w-[140%] rounded-full border border-marble/30" style={{ animationDelay: `${-i * 1.4}s`, animationPlayState: visible ? 'running' : 'paused' }} />
      ))}
      <span className="absolute inset-x-0 bottom-0 block h-[14%] bg-granite" />
      <span className="absolute inset-x-0 bottom-[14%] block h-[3px]" style={{ background: LINE }} />
    </div>
  );
}

function Platform() {
  const go = useGo();
  return (
    <section id="top" aria-labelledby="hero-title" className="mt-granite relative bg-granite pb-12 pt-[124px] text-marble sm:pb-20 lg:pt-[112px]">
      <div className="mx-auto grid max-w-[1360px] items-stretch gap-6 px-5 sm:px-8 lg:grid-cols-[7fr_5fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-[1fr_88px] gap-4 sm:grid-cols-[1fr_120px] lg:block">
            <motion.div
              className="rounded-[18px] border-2 border-brass bg-[#0E0F11] px-5 py-5 sm:px-9 sm:py-7"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <p className="font-station text-[clamp(2.2rem,6.2vw,5.5rem)] font-extrabold uppercase leading-[0.9] tracking-[0.01em]">TIS Tech Council</p>
              <p className="mt-2 font-onest text-[14px] text-brass sm:text-[17px]" lang="uz">
                TIS Texnologiya kengashi
              </p>
            </motion.div>
            <div className="lg:hidden">
              <TunnelMouth />
            </div>
          </div>
          <div className="mt-marble rounded-[18px] bg-marble px-5 py-7 text-granite sm:px-9 sm:py-9">
            <h1 id="hero-title" className="max-w-[18ch] font-onest text-[clamp(1.9rem,4vw,3.4rem)] font-medium leading-[1.06] tracking-[-0.03em]">
              {HERO.title}
            </h1>
            <p className="mt-5 max-w-[48ch] font-onest text-[17px] leading-[1.6] text-granite/80 sm:text-[18px]">{HERO.lede}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#suggestions" onClick={go('suggestions')} className={`${brassBtn} hover:bg-granite hover:text-marble`}>
                Suggest an idea <Arrow />
              </a>
              <a href="#projects" onClick={go('projects')} className="font-onest text-[17px] underline decoration-1 underline-offset-[6px] hover:decoration-2">
                See what we’ve built
              </a>
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <TunnelMouth />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stations                                                             */
/* ------------------------------------------------------------------ */

function MissionStation() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'center 0.55'] });
  const scale = useTransform(p, ...span([0, 1], reduce ? [1, 1] : [0.9, 1]), { ease: settle });
  return (
    <Station id="mission" tone="marble" label="Mission">
      <motion.p ref={ref} style={{ scale, originX: 0 }} className="max-w-[16ch] font-station text-[clamp(2.75rem,7vw,6rem)] font-extrabold uppercase leading-[0.92] tracking-[0.005em]">
        {MISSION.line}
      </motion.p>
      <p className="mt-10 max-w-[52ch] font-onest text-[18px] leading-[1.6] text-granite/80">{MISSION.support}</p>
    </Station>
  );
}

function AboutStation() {
  return (
    <Station id="about" tone="granite" label="About">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div>
          <p className="max-w-[20ch] font-onest text-[clamp(1.6rem,2.8vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.025em]">{ABOUT.title}</p>
          {ABOUT.body.map((t) => (
            <p key={t} className="mt-6 max-w-[48ch] font-onest text-[17px] leading-[1.6] text-marble/80">
              {t}
            </p>
          ))}
        </div>
        {/* A branch line: one stop per thing we do. */}
        <ol className="relative">
          <span aria-hidden className="absolute bottom-6 left-[12px] top-6 w-[3px] rounded-full" style={{ background: LINE }} />
          {WORK.map((w) => (
            <li key={w.title} className="relative flex gap-7 py-6">
              <span aria-hidden className="relative z-10 mt-1 block h-[27px] w-[27px] shrink-0 rounded-full border-[4px] bg-granite" style={{ borderColor: LINE }} />
              <div>
                <h3 className="font-station text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold uppercase leading-none">{w.title}</h3>
                <p className="mt-3 max-w-[50ch] font-onest text-[17px] leading-[1.6] text-marble/80">{w.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Station>
  );
}

function Board({ start, end, timezoneLabel }: { start: string; end: string; timezoneLabel: string }) {
  const now = useNow();
  const c = countdownParts(now, start, end);
  return (
    <div className="rounded-[18px] border-2 border-brass bg-granite p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-station text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold uppercase leading-none">TISMUN 2026</p>
          <p className="mt-1 font-onest text-[15px] text-marble/70">Conference starts</p>
        </div>
        {c.phase === 'before' ? (
          <>
            <p className="sr-only">
              {c.days} days, {c.hours} hours and {c.mins} minutes until the conference ({timezoneLabel}).
            </p>
            <div aria-hidden className="flex gap-2 font-station font-bold tabular-nums">
              {[
                [c.days, 'd'],
                [c.hours, 'h'],
                [c.mins, 'm'],
                [c.secs, 's'],
              ].map(([v, u]) => (
                <span key={u as string} className="flex min-w-[72px] items-baseline justify-center gap-0.5 rounded-[10px] bg-[#0E0F11] px-3 py-2 text-[clamp(2rem,4vw,3.25rem)] leading-none">
                  {String(v).padStart(2, '0')}
                  <span className="text-[0.45em] text-brass">{u}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="font-station text-[36px] font-bold uppercase">{c.phase === 'during' ? 'Happening now' : 'Conference complete'}</p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-marble/15 pt-3 font-onest text-[14px] text-marble/70">
        <span>Departures · Jo‘nash</span>
        <span>{timezoneLabel}</span>
      </div>
    </div>
  );
}

function ProjectsStation() {
  const p = featuredProject;
  if (!p) return null;
  return (
    <Station id="projects" tone="vault" label="TISMUN, things we've shipped">
      <p className="max-w-[24ch] font-onest text-[clamp(1.6rem,2.8vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.025em]">Things we’ve shipped. Real platforms, used by real people at TIS.</p>
      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex aspect-[4/3] items-center justify-center rounded-t-[999px] border-[10px] border-b-0 border-marble bg-marble p-10 text-granite">
          <TismunLogo className="w-full max-w-[380px]" />
        </div>
        <div className="flex flex-col">
          <h3 className="font-station text-[clamp(3rem,6vw,5rem)] font-extrabold uppercase leading-none">{p.name}</h3>
          <p className="mt-3 font-onest text-[15px] text-marble/75">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#6FD3A0] align-middle" aria-hidden />
            Live · {p.date}
          </p>
          <p className="mt-4 font-onest text-[19px]">{p.tagline}</p>
          <p className="mt-3 max-w-[56ch] font-onest text-[17px] leading-[1.6] text-marble/80">{p.description}</p>
          <div className="mt-8">
            {p.link ? (
              <a href={p.link} target="_blank" rel="noopener noreferrer" className={brassBtn}>
                Visit {p.name} <Arrow />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex min-h-[52px] cursor-not-allowed items-center rounded-full border-2 border-marble/40 px-7 font-station text-[19px] font-bold uppercase tracking-[0.04em] text-marble/70">Link coming soon</span>
            )}
          </div>
        </div>
      </div>
      {p.event && (
        <div className="mt-14">
          <Board {...p.event} />
        </div>
      )}
      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ul className="border-t border-marble/25">
          {p.features.map((f) => (
            <li key={f} className="border-b border-marble/25 py-4 font-onest text-[17px]">
              {f}
            </li>
          ))}
        </ul>
        <div>
          <p className="font-onest text-[15px] text-marble/70">Built with</p>
          <p className="mt-2 font-onest text-[17px] leading-[1.7]">{p.stack.join(' · ')}</p>
        </div>
      </div>
    </Station>
  );
}

function Medallion({ f, i }: { f: (typeof founders)[number]; i: number }) {
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(true);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.5'] });
  const lag = i * 0.12;
  const scale = useTransform(p, ...span([lag, 1], reduce ? [1, 1] : [0.8, 1]), { ease: settle });
  const opacity = useTransform(p, ...span([lag, lag + (1 - lag) * 0.5], reduce ? [1, 1] : [0, 1]));
  return (
    <motion.div ref={ref} style={{ scale, opacity }} className="flex flex-col items-center text-center">
      {/* Round medallions, like the portraits set into Kosmonavtlar's walls. */}
      <div className="relative aspect-square w-[min(78vw,300px)] overflow-hidden rounded-full border-[6px] border-brass bg-marble-vein">
        {ok && <img src={f.photo} alt={`Portrait of ${f.name}`} loading="lazy" decoding="async" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover object-[50%_16%]" />}
      </div>
      <h3 className="mt-6 font-station text-[clamp(1.8rem,2.6vw,2.25rem)] font-bold uppercase leading-none">{f.name}</h3>
      <p className="mt-2 font-onest text-[15px] text-granite/75">{f.role}</p>
      {f.tagline && <p className="mt-3 max-w-[30ch] font-onest text-[17px]">{f.tagline}</p>}
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="mt-3 min-h-[44px] font-onest text-[15px] underline decoration-1 underline-offset-[6px] hover:decoration-2">
        {open ? 'Hide bio' : 'Read bio'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="max-w-[40ch] whitespace-pre-line pt-2 text-left font-onest text-[16px] leading-[1.65] text-granite/85">{isPlaceholder(f.bio) ? 'Bio coming soon.' : f.bio}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FoundersStation() {
  return (
    <Station id="founders" tone="marble" label="Founders">
      <div className="grid gap-6 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <p className="max-w-[20ch] font-onest text-[clamp(1.6rem,2.8vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.025em]">Three students. One campus to upgrade.</p>
        <p className="max-w-[48ch] font-onest text-[18px] leading-[1.6] text-granite/80 lg:pt-2">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
      </div>
      <div className="mt-16 grid gap-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
        {founders.map((f, i) => (
          <Medallion key={f.id} f={f} i={i % 3} />
        ))}
      </div>
    </Station>
  );
}

function IdeasStation() {
  const uid = useId();
  const form = useSuggestionForm({
    onInvalid: (which) => document.getElementById(which === 'text' ? `${uid}-text` : `${uid}-cat-${CATEGORIES[0].id}`)?.focus(),
  });
  const field =
    'block w-full rounded-[12px] border border-marble/25 bg-[#0E0F11] px-4 font-onest text-[17px] text-marble placeholder:text-marble/50 transition-colors focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass aria-[invalid=true]:border-[#FF8A8A]';
  return (
    <Station id="suggestions" tone="granite" label="Ideas: what tech does TIS need?">
      <div className="grid gap-14 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="max-w-[18ch] font-onest text-[clamp(1.8rem,3.2vw,2.8rem)] font-medium leading-[1.08] tracking-[-0.025em]">{SUGGEST.title}</p>
          <p className="mt-6 max-w-[44ch] font-onest text-[18px] leading-[1.6] text-marble/80">{SUGGEST.lede}</p>
          <ul className="mt-10 border-t border-marble/20">
            {SUGGEST.promises.map(([t, b]) => (
              <li key={t} className="border-b border-marble/20 py-5">
                <span className="block font-onest text-[17px] font-medium">{t}</span>
                <span className="mt-1 block font-onest text-[15px] text-marble/70">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-h-[560px]">
          <AnimatePresence mode="wait" initial={false}>
            {form.status === 'sent' ? (
              <motion.div key="sent" role="status" aria-live="polite" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[18px] border-2 border-brass p-8">
                <p className="font-station text-[clamp(2.4rem,5vw,3.6rem)] font-extrabold uppercase leading-none">{SUGGEST.thanksTitle}</p>
                <p className="mt-4 max-w-[44ch] font-onest text-[18px] text-marble/80">{SUGGEST.thanksBody}</p>
                <button type="button" onClick={form.reset} className="mt-8 inline-flex min-h-[52px] items-center rounded-full border-2 border-marble/60 px-7 font-station text-[19px] font-bold uppercase tracking-[0.04em] hover:border-marble">
                  Send another idea
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={form.submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} aria-describedby={form.error ? `${uid}-error` : undefined}>
                <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input id={`${uid}-website`} tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} />
                </div>
                <div className="flex items-end justify-between">
                  <label htmlFor={`${uid}-text`} className="font-onest text-[17px] font-medium">
                    Your idea
                  </label>
                  <span className={`font-onest text-[14px] tabular-nums ${form.text.length > SUGGESTION_MAX ? 'text-[#FF8A8A]' : 'text-marble/70'}`}>
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
                  className={`${field} mt-3 resize-none py-3.5`}
                />
                <p id={`${uid}-text-hint`} className={`mt-2 font-onest text-[14px] ${form.touched && form.textError ? 'text-[#FF8A8A]' : 'text-marble/70'}`}>
                  {form.touched && form.textError ? form.textError : `Between ${SUGGESTION_MIN} and ${SUGGESTION_MAX} characters.`}
                </p>
                <fieldset className="mt-8">
                  <legend className="font-onest text-[17px] font-medium">Category</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const on = form.category === c.id;
                      return (
                        <label key={c.id} className="cursor-pointer">
                          <input id={`${uid}-cat-${c.id}`} type="radio" name="category" value={c.id} checked={on} onChange={() => form.setCategory(c.id)} className="peer sr-only" />
                          <span className={`inline-flex min-h-[44px] items-center rounded-full border-2 px-5 font-onest text-[15px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marble ${on ? 'border-brass bg-brass text-granite' : 'border-marble/25 hover:border-marble/60'}`}>{c.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {form.touched && form.categoryError && <p className="mt-2 font-onest text-[14px] text-[#FF8A8A]">{form.categoryError}</p>}
                </fieldset>
                <div className="mt-8 border-y border-marble/20 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <span id={`${uid}-anon`}>
                      <span className="block font-onest text-[17px] font-medium">Send anonymously</span>
                      <span className="block font-onest text-[15px] text-marble/70">{form.anonymous ? 'No name attached.' : 'Add your name and grade below.'}</span>
                    </span>
                    <button type="button" role="switch" aria-checked={form.anonymous} aria-labelledby={`${uid}-anon`} onClick={() => form.setAnonymous((a) => !a)} className="flex h-11 w-16 shrink-0 items-center">
                      <span className={`relative block h-7 w-14 rounded-full border-2 transition-colors ${form.anonymous ? 'border-brass bg-brass' : 'border-marble/40'}`}>
                        <motion.span className={`absolute top-[2px] block h-[20px] w-[20px] rounded-full ${form.anonymous ? 'bg-granite' : 'bg-marble/70'}`} animate={{ left: form.anonymous ? 28 : 3 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                      </span>
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {!form.anonymous && (
                      <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                        <div className="grid gap-3 pt-5 sm:grid-cols-[1fr_120px]">
                          <div>
                            <label htmlFor={`${uid}-name`} className="font-onest text-[15px] text-marble/70">
                              Name (optional)
                            </label>
                            <input id={`${uid}-name`} autoComplete="name" maxLength={NAME_MAX} value={form.name} onChange={(e) => form.setName(e.target.value)} className={`${field} mt-1.5 h-12`} />
                          </div>
                          <div>
                            <label htmlFor={`${uid}-grade`} className="font-onest text-[15px] text-marble/70">
                              Grade (optional)
                            </label>
                            <input id={`${uid}-grade`} inputMode="numeric" maxLength={GRADE_MAX} placeholder="e.g. 11" value={form.grade} onChange={(e) => form.setGrade(e.target.value)} className={`${field} mt-1.5 h-12`} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {form.status === 'error' && form.error && (
                  <p id={`${uid}-error`} role="alert" className="mt-6 rounded-[12px] border border-[#FF8A8A]/60 px-4 py-3 font-onest text-[15px]">
                    {form.error}
                  </p>
                )}
                <button type="submit" disabled={form.sending} className={`${brassBtn} mt-8 w-full justify-center disabled:cursor-wait disabled:opacity-70 sm:w-auto`}>
                  {form.sending ? 'Sending…' : 'Send idea'}
                  {!form.sending && <Arrow />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Station>
  );
}

function Question({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-granite/20">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-[64px] w-full items-center justify-between gap-6 py-5 text-left font-onest text-[18px] font-medium sm:text-[20px]">
          {q}
          <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${open ? 'border-granite bg-granite text-marble' : 'border-granite/40'}`}>
            <span className="relative block h-3 w-3">
              <span className="absolute left-0 top-[5px] h-[2px] w-3 bg-current" />
              <span className={`absolute left-[5px] top-0 h-3 w-[2px] bg-current transition-transform duration-300 ${open ? 'scale-y-0' : ''}`} />
            </span>
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
            <p className="max-w-[64ch] pb-6 font-onest text-[17px] leading-[1.65] text-granite/80">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function FaqStation() {
  return (
    <Station id="faq" tone="marble" label="Questions">
      <ul className="border-t-2 border-brass">
        {FAQ.map((x) => (
          <Question key={x.q} {...x} />
        ))}
      </ul>
    </Station>
  );
}

function EndOfLine() {
  const go = useGo();
  return (
    <footer className="bg-granite pb-28 pt-20 text-marble">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        <div className="rounded-[18px] border-2 border-brass px-6 py-6 sm:px-9">
          <p className="font-station text-[clamp(2.6rem,8vw,6rem)] font-extrabold uppercase leading-[0.9]">TIS Tech Council</p>
          <p className="mt-3 font-onest text-[15px] text-brass">End of the line · Oxirgi bekat</p>
        </div>
        <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <LogoMark className="h-12 w-12 text-marble" />
            <p className="font-onest text-[15px] text-marble/70">Tashkent International School</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-1 sm:grid-cols-3">
            {STATIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={go(s.id)} className="inline-flex min-h-[40px] items-center gap-3 font-onest text-[16px] text-marble/75 hover:text-marble">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: LINE }} />
                  {s.en}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-marble/20 pt-6 font-onest text-[14px] text-marble/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council · Tashkent International School</p>
          <p className="flex items-center gap-3">
            <Owl className="h-6 w-6 text-marble" />
            {MOTTO}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MetroPage() {
  return (
    <Shell world="metro" switcherClass="rounded-full bg-granite text-marble/75 border border-brass/50 [&_a]:rounded-full [&_[data-here]]:bg-brass [&_[data-here]]:text-granite">
      <div className="font-onest">
        <Nav />
        <main id="main">
          <Platform />
          <Ride to="mission" color="#F29839" />
          <MissionStation />
          <AboutStation />
          <ProjectsStation />
          <FoundersStation />
          <Ride to="suggestions" color="#0897B6" />
          <IdeasStation />
          <FaqStation />
        </main>
        <EndOfLine />
      </div>
    </Shell>
  );
}
