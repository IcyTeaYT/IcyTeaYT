import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { CodeWindow } from '../ui/CodeWindow';
import { Owl } from '../brand/Owl';
import { useSpotlight } from '@/lib/useSpotlight';
import { EASE_OUT } from '@/lib/motion';
import { founders } from '@/data/founders';
import { projects } from '@/data/projects';

/* ---------- Content ---------- */

// A trimmed excerpt of functions/api/suggestions.ts: the code that runs when
// someone presses "Send suggestion". Keep it in step with the real file.
const SUGGEST_CODE = `// Runs when you press "Send suggestion"
export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);

  // Bots fill a hidden field. People never see it.
  if (body.website?.trim()) return json({ ok: true });

  const text = clean(body.text, SUGGESTION_MAX);
  if (text.length < SUGGESTION_MIN) return json(error, 400);

  // Your IP is salted and hashed. The raw IP is never stored.
  const hash = await ipHash(request, env, 'suggest');
  if (await isRateLimited(env.DB, hash, 5, 3600)) {
    return json(error, 429);
  }

  await env.DB.prepare('INSERT INTO suggestions ...')
    .bind(text, category, name || null, grade || null)
    .run();

  return json({ ok: true }, 201);
};`;

const live = projects.filter((p) => p.status === 'live').map((p) => `'${p.name} 2026'`);
const next = projects.filter((p) => p.status === 'pipeline').map((p) => `'${p.name}'`);
const COUNCIL_CODE = `export const council = {
  founders: ${founders.length},
  live: [${live.join(', ')}],
  next: [
    ${next.join(',\n    ')},
  ],
  suggestions: 'open',
};`;

/* ---------- Bento cell ---------- */

function Cell({ children, className = '', index }: { children: ReactNode; className?: string; index: number }) {
  const spot = useSpotlight();
  const reduce = useReducedMotion();
  return (
    <motion.article
      {...spot}
      className={`spotlight group overflow-hidden rounded-[26px] border rule bg-night-800 ${className}`}
      style={{ ['--spot-fill' as string]: 'rgba(76,198,226,0.07)' }}
      initial={reduce ? false : { y: 40 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 1, ease: EASE_OUT, delay: (index % 3) * 0.07 }}
    >
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </motion.article>
  );
}

function CellText({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-6 sm:p-8">
      <h3 className="text-[22px] font-semibold leading-snug text-paper sm:text-[24px]">{title}</h3>
      <p className="mt-2 max-w-[44ch] text-[16px] leading-relaxed text-fog-200">{body}</p>
    </div>
  );
}

/* ---------- Pipeline: a real sequence, so it earns its numbers ---------- */

const PIPE = [
  { label: 'Idea', color: '#F29839' },
  { label: 'Plan', color: '#E0647C' },
  { label: 'Build', color: '#3FB8AF' },
  { label: 'Ship', color: '#4CC6E2' },
];
const PIPE_PATH = 'M20 60 H90 V24 H170 V60 H250 V96 H320';
const PIPE_PTS: [number, number][] = [
  [20, 60],
  [130, 24],
  [210, 60],
  [320, 96],
];

function PipelineVisual() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const reduce = useReducedMotion();
  return (
    <div className="mt-auto px-6 pb-8 sm:px-8">
      <svg ref={ref} viewBox="0 0 340 130" className="w-full overflow-visible" role="img" aria-label="Idea, then plan, then build, then ship">
        <path d={PIPE_PATH} fill="none" stroke="rgba(238,241,245,0.12)" strokeWidth="2" />
        <motion.path
          d={PIPE_PATH}
          fill="none"
          stroke="url(#pipe-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.2 }}
        />
        <defs>
          <linearGradient id="pipe-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#F29839" />
            <stop offset="0.4" stopColor="#E0647C" />
            <stop offset="0.7" stopColor="#3FB8AF" />
            <stop offset="1" stopColor="#4CC6E2" />
          </linearGradient>
        </defs>
        {!reduce && (
          <circle r="4" fill="#EEF1F5">
            <animateMotion dur="3.2s" repeatCount="indefinite" path={PIPE_PATH} />
          </circle>
        )}
        {PIPE_PTS.map(([x, y], i) => (
          <motion.g
            key={i}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.3 + i * 0.3 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r="7" fill="#0F1622" stroke={PIPE[i]!.color} strokeWidth="2" />
            <text x={x} y={y + (y > 60 ? -16 : 26)} textAnchor="middle" fill="#C6CEDA" style={{ font: '500 12px "JetBrains Mono Variable", ui-monospace, monospace' }}>
              {`0${i + 1} ${PIPE[i]!.label}`}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Ideas: example prompts, cycling ---------- */

const IDEAS = ['Live scores for home games', 'Send prints from our phones', 'A map of water refill stations', 'Book study rooms online', 'Club sign-ups in one place'];

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
    <div ref={ref} className="mt-auto px-6 pb-8 sm:px-8">
      <p className="mb-3 font-mono text-[12px] text-fog-400">// example ideas</p>
      <div className="relative h-[110px]" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout">
          {stack.map((idea, k) => (
            <motion.div
              key={idea}
              layout
              className="absolute inset-x-0 flex items-center gap-3 rounded-2xl border rule bg-night-700 px-4 py-3 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.9)]"
              style={{ top: k * 14, zIndex: 3 - k, transformOrigin: '50% 100%' }}
              initial={{ opacity: 0, y: -30, scale: 1.04 }}
              animate={{ opacity: 1 - k * 0.3, y: 0, scale: 1 - k * 0.06 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-night">
                <svg viewBox="0 0 16 16" className="h-4 w-4">
                  <path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.2V11h5V9.7A4.5 4.5 0 0 0 8 1.5ZM6 12.5h4M6.8 14.5h2.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <motion.span className="truncate text-[15px] font-medium text-paper" animate={{ opacity: k === 0 ? 1 : 0 }} transition={{ duration: 0.3 }}>
                {idea}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- Motto ---------- */

const MOTTO = [
  { word: 'Challenge', color: '#F29839' },
  { word: 'Explore', color: '#3FB8AF' },
  { word: 'Connect', color: '#4CC6E2' },
];

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[22px] font-semibold text-paper sm:text-[24px]">The TIS motto</h3>
          <p className="mt-1 text-[16px] text-fog-200">What every project has to live up to.</p>
        </div>
        <Owl className="h-14 w-14 shrink-0" />
      </div>
      <ul className="space-y-1" aria-label="Challenge, Explore, Connect">
        {MOTTO.map((m, k) => (
          <li key={m.word} className="flex items-center gap-3" aria-hidden>
            <motion.span
              className="font-display text-[clamp(2rem,4vw,3.1rem)] font-semibold leading-none tracking-display"
              animate={{ color: k === i ? m.color : 'rgba(238,241,245,0.22)', x: k === i && !reduce ? 6 : 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              {m.word}
            </motion.span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Section ---------- */

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionIntro
          id="about-title"
          path="about"
          title="Built by students, for the whole school."
          kicker="The Tech Council is a group of TIS students who build the tech our campus is missing."
        />

        <div className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          <Cell index={0} className="md:col-span-2 lg:col-span-4 lg:row-span-2">
            <CellText
              title="Tools for the school"
              body="We write real software for TIS. This is the actual code that receives the suggestion box further down this page."
            />
            <div className="mt-auto px-4 pb-4 sm:px-8 sm:pb-8">
              <CodeWindow
                filename="functions/api/suggestions.ts"
                code={SUGGEST_CODE}
                trace
                label="The server code for the suggestion box: it ignores bots, checks the length, hashes your IP instead of storing it, limits how often one person can send, and saves the suggestion."
              />
            </div>
          </Cell>
          <Cell index={1} className="lg:col-span-2">
            <CellText title="Projects, start to finish" body="Every project goes from an idea to a plan to something people at TIS actually use." />
            <PipelineVisual />
          </Cell>
          <Cell index={2} className="lg:col-span-2">
            <CellText title="Your ideas, first" body="The best projects start as a student suggestion. Anyone can send one." />
            <IdeasVisual />
          </Cell>
          <Cell index={3} className="lg:col-span-3">
            <MottoCell />
          </Cell>
          <Cell index={4} className="lg:col-span-3">
            <div className="flex h-full flex-col p-4 sm:p-8">
              <div className="px-2 pb-5 pt-2 sm:px-0 sm:pt-0">
                <h3 className="text-[22px] font-semibold text-paper sm:text-[24px]">Where we are</h3>
                <p className="mt-1 text-[16px] text-fog-200">Generated from the same data this site runs on.</p>
              </div>
              <CodeWindow filename="src/council.ts" code={COUNCIL_CODE} className="mt-auto" label={`The council has ${founders.length} founders, one live platform and ${next.length} projects coming next. Suggestions are open.`} />
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
