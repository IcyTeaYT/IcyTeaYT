import { AnimatePresence, animate, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSpotlight } from '@/lib/useSpotlight';
import { EASE_OUT } from '@/lib/motion';
import { Owl } from '../brand/Owl';
import { projects } from '@/data/projects';
import { founders } from '@/data/founders';

const STATEMENT =
  'We’re students who think our school deserves better tech, so we build it. Tools for teachers and students, projects that make campus run smoother, and a direct line for your ideas.';

/* ---------- Scroll-linked statement: words light up as you read ---------- */

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {children}{' '}
    </motion.span>
  );
}

function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const words = STATEMENT.split(' ');
  if (reduce) {
    return <p className="font-display text-[clamp(1.6rem,3.6vw,2.9rem)] font-medium leading-[1.15] tracking-tight text-white">{STATEMENT}</p>;
  }
  return (
    <p ref={ref} className="font-display text-[clamp(1.6rem,3.6vw,2.9rem)] font-medium leading-[1.15] tracking-tight text-white">
      <span className="sr-only">{STATEMENT}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {w}
          </Word>
        ))}
      </span>
    </p>
  );
}

/* ---------- Bento cell shell ---------- */

function Cell({ children, className = '', index }: { children: ReactNode; className?: string; index: number }) {
  const spot = useSpotlight();
  const reduce = useReducedMotion();
  return (
    <motion.article
      {...spot}
      className={`spotlight group overflow-hidden rounded-[28px] border hairline bg-gradient-to-b from-ink-800/80 to-ink-900/80 ${className}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.96, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1, ease: EASE_OUT, delay: (index % 3) * 0.08 }}
      style={{ transformPerspective: 1200 }}
    >
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </motion.article>
  );
}

function CellText({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="p-6 sm:p-8">
      <p className="eyebrow">{kicker}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mist-300">{body}</p>
    </div>
  );
}

/* ---------- Visuals ---------- */

function AppMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });
  const reduce = useReducedMotion();
  const rows = [
    { t: '08:10', title: 'Period 1 · Physics', meta: 'Room B204', tone: 'bg-tis-400' },
    { t: '10:40', title: 'Study room B112 is free', meta: 'Book it in one tap', tone: 'bg-emerald-400' },
    { t: '12:05', title: 'Lunch · Plov day', meta: 'Cafeteria', tone: 'bg-petal-orange' },
    { t: '15:30', title: 'Varsity football', meta: 'Streaming live', tone: 'bg-volt-400', live: true },
    { t: '16:15', title: 'Robotics club', meta: 'Lab 3 · 14 going', tone: 'bg-rose-400' },
  ];
  const bars = [38, 62, 48, 80, 66, 92, 74];
  return (
    <div className="relative mx-5 mb-5 mt-auto pt-16 sm:mx-8 sm:mb-8">
      {/* Notification toast that drops in above the window */}
      <motion.div
        className="absolute right-3 top-0 z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-700/90 py-2.5 pl-3 pr-4 shadow-xl shadow-black/40 backdrop-blur-md sm:right-8"
        initial={{ opacity: 0, y: -16, scale: 0.9 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 1.1 }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path d="m3.5 8.3 2.8 2.8 6.2-6.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-xs">
          <span className="block font-medium text-white">Library Wi-Fi upgraded</span>
          <span className="block text-mist-400">From the suggestion box</span>
        </span>
      </motion.div>
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950/80 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 rounded-md bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-mist-400">campus.tis / today</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_180px] sm:p-5">
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <motion.li
              key={r.title}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
              initial={{ opacity: 0, x: reduce ? 0 : -16 }}
              animate={inView ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.25 + i * 0.12 }}
            >
              <span className={`h-8 w-1 rounded-full ${r.tone}`} />
              <span className="w-11 font-mono text-[11px] text-mist-400">{r.t}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{r.title}</span>
                <span className="block text-xs text-mist-400">{r.meta}</span>
              </span>
              {r.live && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-red-400" />
                  </span>
                  Live
                </span>
              )}
            </motion.li>
          ))}
        </ul>
        <div className="hidden flex-col rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:flex">
          <span className="text-[11px] text-mist-400">Wi-Fi uptime</span>
          <span className="font-display text-2xl font-semibold text-white">99.4%</span>
          <div className="mt-auto flex h-20 items-end gap-1.5">
            {bars.map((b, i) => (
              <motion.span
                key={i}
                className="flex-1 origin-bottom rounded-t bg-gradient-to-t from-tis-600 to-volt-400"
                style={{ height: `${b}%` }}
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : undefined}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.4 + i * 0.06 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

const PIPE = ['Idea', 'Plan', 'Build', 'Ship'];
const PIPE_PATH = 'M20 60 H90 V24 H170 V60 H250 V96 H320';

function PipelineVisual() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });
  const reduce = useReducedMotion();
  const pts: [number, number][] = [
    [20, 60],
    [130, 24],
    [210, 60],
    [320, 96],
  ];
  return (
    <div className="mt-auto px-6 pb-7 sm:px-8">
      <svg ref={ref} viewBox="0 0 340 130" className="w-full overflow-visible" aria-hidden>
        <path d={PIPE_PATH} fill="none" stroke="rgba(160,190,255,0.12)" strokeWidth="2" />
        <motion.path
          d={PIPE_PATH}
          fill="none"
          stroke="url(#pipe-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.2 }}
        />
        <defs>
          <linearGradient id="pipe-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#2F6FF5" />
            <stop offset="1" stopColor="#4DE8FA" />
          </linearGradient>
        </defs>
        {!reduce && (
          <circle r="4" fill="#CFFaff" style={{ filter: 'drop-shadow(0 0 6px #4DE8FA)' }}>
            <animateMotion dur="3.2s" repeatCount="indefinite" path={PIPE_PATH} />
          </circle>
        )}
        {pts.map(([x, y], i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.3 + i * 0.3 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r="7" fill="#070B16" stroke="#4DE8FA" strokeWidth="2" />
            <text x={x} y={y + (y > 60 ? -16 : 26)} textAnchor="middle" className="fill-mist-200 font-mono text-[11px]">
              {PIPE[i]}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

const IDEAS = [
  'Live scores for home games?',
  'Send prints from our phones',
  'A map of water refill stations',
  'Book study rooms online',
  'Club sign-ups in one place',
];

function IdeasVisual() {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-10%' });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || reduce) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % IDEAS.length), 2400);
    return () => window.clearInterval(t);
  }, [inView, reduce]);
  const stack = [0, 1, 2].map((k) => IDEAS[(i + k) % IDEAS.length]!);
  return (
    <div ref={ref} className="relative mx-6 mb-8 mt-auto h-[150px] sm:mx-8" aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {stack.map((idea, k) => (
          <motion.div
            key={idea}
            layout
            className="absolute inset-x-0 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-700/90 px-4 py-3 shadow-lg shadow-black/40"
            style={{ top: k * 14, zIndex: 3 - k, transformOrigin: '50% 100%' }}
            initial={{ opacity: 0, y: -30, scale: 1.04 }}
            animate={{ opacity: 1 - k * 0.3, y: 0, scale: 1 - k * 0.06 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tis-400 to-volt-400 text-ink-950">
              <svg viewBox="0 0 16 16" className="h-4 w-4">
                <path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.2V11h5V9.7A4.5 4.5 0 0 0 8 1.5ZM6 12.5h4M6.8 14.5h2.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <motion.span className="truncate text-sm font-medium text-white" animate={{ opacity: k === 0 ? 1 : 0 }} transition={{ duration: 0.3 }}>
              {idea}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const MOTTO = ['Challenge', 'Explore', 'Connect'];

function MottoCell() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-10%' });
  useEffect(() => {
    if (!inView || reduce) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % MOTTO.length), 1800);
    return () => window.clearInterval(t);
  }, [inView, reduce]);
  return (
    <div ref={ref} className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
      <div className="flex items-start justify-between">
        <p className="eyebrow">The TIS motto</p>
        <Owl className="h-12 w-12 animate-float" />
      </div>
      <ul className="space-y-1">
        {MOTTO.map((m, k) => (
          <li key={m} className="relative flex items-center gap-3">
            <motion.span
              className="font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-none tracking-tight"
              animate={{ color: k === i ? '#FFFFFF' : 'rgba(164,177,204,0.28)', x: k === i && !reduce ? 8 : 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              {m}
            </motion.span>
            {k === i && <motion.span layoutId="motto-dot" className="h-2.5 w-2.5 rounded-full bg-volt-400 shadow-[0_0_14px_3px_rgba(77,232,250,0.6)]" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.4, ease: EASE_OUT, onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return (
    <span ref={ref} className="tabular">
      {v}
    </span>
  );
}

function StatsCell() {
  const stats = [
    { n: founders.length, label: 'Student founders' },
    { n: projects.filter((p) => p.status === 'live').length, label: 'Platform live' },
    { n: projects.filter((p) => p.status === 'pipeline').length, label: 'In the pipeline' },
  ];
  return (
    <div className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
      <p className="eyebrow">So far</p>
      <dl className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col border-l border-white/10 pl-4">
            <dt className="order-2 mt-1 text-[13px] leading-snug text-mist-400">{s.label}</dt>
            <dd className="font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-tight text-white">
              <Counter to={s.n} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- Section ---------- */

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative py-20 sm:py-28">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          <div>
            <p className="eyebrow">
              <span className="text-mist-400">01</span>
              <span className="h-px w-6 bg-volt-400/60" />
              About
            </p>
            <h2 id="about-title" className="mt-4 font-display text-xl font-semibold tracking-tight text-mist-200">
              What we do
            </h2>
          </div>
          <Statement />
        </div>

        <div className="mt-16 grid gap-4 sm:mt-24 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          <Cell index={0} className="md:col-span-2 lg:col-span-4 lg:row-span-2">
            <CellText
              kicker="Build"
              title="Tools for the school"
              body="Apps, sites and bots that make daily life at TIS easier, from schedules and live streams to the systems behind them."
            />
            <AppMock />
          </Cell>
          <Cell index={1} className="lg:col-span-2">
            <CellText kicker="Run" title="Tech projects, start to finish" body="Every project goes from idea to plan to something people actually use." />
            <PipelineVisual />
          </Cell>
          <Cell index={2} className="lg:col-span-2">
            <CellText kicker="Listen" title="Your ideas, first" body="The best projects start as a student suggestion. Anyone can send one." />
            <IdeasVisual />
          </Cell>
          <Cell index={3} className="lg:col-span-3">
            <MottoCell />
          </Cell>
          <Cell index={4} className="lg:col-span-3">
            <StatsCell />
          </Cell>
        </div>
      </div>
    </section>
  );
}
