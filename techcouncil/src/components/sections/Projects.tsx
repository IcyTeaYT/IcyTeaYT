import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { featuredProject, pipelineProjects, STATUS_LABEL, type Project } from '@/data/projects';
import { SectionIntro } from '../ui/SectionIntro';
import { Tilt } from '../ui/Tilt';
import { TismunLogo } from '../brand/TismunLogo';
import { Countdown } from './Countdown';
import { useSpotlight } from '@/lib/useSpotlight';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { EASE_OUT, SPRING_SOFT } from '@/lib/motion';

/* ---------- Small pieces ---------- */

function StatusBadge({ project, layoutId }: { project: Project; layoutId?: string }) {
  const live = project.status === 'live';
  return (
    <motion.span
      layoutId={layoutId}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"
    >
      {live && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
      )}
      {STATUS_LABEL[project.status]}
    </motion.span>
  );
}

function StackChips({ stack }: { stack: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Tech stack">
      {stack.map((s) => (
        <li key={s} className="chip">
          {s}
        </li>
      ))}
    </ul>
  );
}

function VisitButton({ project, className = '' }: { project: Project; className?: string }) {
  if (!project.link) {
    return (
      <span className={`btn-ghost cursor-not-allowed opacity-60 ${className}`} aria-disabled="true">
        Link coming soon
      </span>
    );
  }
  return (
    <a
      href={project.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group/btn relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full px-6 text-[15px] font-semibold text-ink-950 ${className}`}
      style={{ background: project.accent.primary }}
    >
      Visit {project.name}
      <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" aria-hidden>
        <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function accentVars(p: Project): CSSProperties {
  return {
    ['--c1' as string]: p.accent.primary,
    ['--c2' as string]: p.accent.secondary,
    ['--c3' as string]: p.accent.tertiary,
    ['--c4' as string]: '#4A5A78',
    ['--spot-border' as string]: `${p.accent.primary}AA`,
    ['--spot-fill' as string]: `${p.accent.tertiary}22`,
  };
}

/* ---------- Featured card ---------- */

function FeaturedCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const spot = useSpotlight();
  return (
    <Tilt max={3.5} className="group rounded-[32px]">
      <motion.div
        layoutId={`project-${project.id}`}
        onClick={onOpen}
        {...spot}
        className="conic-border spotlight relative cursor-pointer overflow-hidden rounded-[32px] bg-[#0B111F]"
        style={{ ...accentVars(project) }}
        transition={SPRING_SOFT}
      >
        {/* Brand glows from the TISMUN palette */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl transition-opacity duration-700 group-hover:opacity-50" style={{ background: project.accent.primary }} />
          <div className="absolute -bottom-32 right-10 h-80 w-80 rounded-full opacity-20 blur-3xl transition-opacity duration-700 group-hover:opacity-40" style={{ background: project.accent.tertiary }} />
          <div className="absolute right-1/3 top-1/2 h-60 w-60 rounded-full opacity-15 blur-3xl" style={{ background: project.accent.secondary }} />
        </div>

        <div className="relative z-10 grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:p-8">
          {/* Light tile keeps the original logo readable on our dark site */}
          <motion.div
            layoutId={`project-tile-${project.id}`}
            className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-[22px] bg-[#F7F7F5] p-8 sm:min-h-[300px] sm:p-12"
          >
            <div aria-hidden className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(rgba(45,55,72,0.09) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            <TismunLogo className="relative w-full max-w-[500px] transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]" />
            <span className="absolute bottom-4 left-4 rounded-full bg-[#2D3748] px-3 py-1 font-mono text-[10px] uppercase tracking-label text-white/90">
              {project.date}
            </span>
          </motion.div>

          <div className="flex flex-col justify-center py-2 lg:py-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge project={project} layoutId={`project-status-${project.id}`} />
              <span className="font-mono text-[11px] uppercase tracking-label text-mist-400">Featured project</span>
            </div>
            <motion.h3 layoutId={`project-title-${project.id}`} className="mt-5 text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1] tracking-tight text-white">
              {project.name}
            </motion.h3>
            <p className="mt-3 text-lg text-mist-200">{project.tagline}</p>
            <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-mist-400">{project.description}</p>

            {project.event && (
              <div className="mt-7">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-label text-mist-400">
                  Conference starts in · {project.event.timezoneLabel}
                </p>
                <Countdown {...project.event} accent={project.accent.primary} />
              </div>
            )}

            <div className="mt-7">
              <StackChips stack={project.stack} />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <VisitButton project={project} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="btn-ghost"
                data-open-project={project.id}
                aria-haspopup="dialog"
              >
                View details
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                  <path d="M3 8h10M8 3v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </Tilt>
  );
}

/* ---------- Expanded detail view ---------- */

function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose, `[data-open-project="${project.id}"]`);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="presentation">
      <motion.div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={ref}
        layoutId={`project-${project.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`project-detail-title-${project.id}`}
        className="relative z-10 flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0B111F] shadow-2xl shadow-black/60 sm:rounded-[32px]"
        style={accentVars(project)}
        transition={SPRING_SOFT}
      >
        <div data-lenis-prevent className="overflow-y-auto overscroll-contain">
          <motion.div layoutId={`project-tile-${project.id}`} className="relative flex h-44 items-center justify-center overflow-hidden bg-[#0E1526] px-8 sm:h-56">
            <div aria-hidden className="absolute -left-10 top-0 h-64 w-64 rounded-full opacity-40 blur-3xl" style={{ background: project.accent.primary }} />
            <div aria-hidden className="absolute -right-10 bottom-0 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: project.accent.tertiary }} />
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.6, ease: EASE_OUT }} className="group relative w-full max-w-[380px]">
              {/* Transparent, white-wordmark version made for dark surfaces */}
              <TismunLogo tone="dark" className="w-full" />
            </motion.div>
          </motion.div>

          <motion.div
            className="p-6 sm:p-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: 0.12, duration: 0.6, ease: EASE_OUT }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge project={project} layoutId={`project-status-${project.id}`} />
              {project.date && <span className="chip">{project.date}</span>}
            </div>
            <motion.h3 layoutId={`project-title-${project.id}`} id={`project-detail-title-${project.id}`} className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {project.name}
            </motion.h3>
            <p className="mt-3 text-lg text-mist-200">{project.tagline}</p>
            <p className="mt-5 text-[16px] leading-relaxed text-mist-300">{project.description}</p>

            {project.event && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-label text-mist-400">Conference starts in · {project.event.timezoneLabel}</p>
                <Countdown {...project.event} accent={project.accent.primary} />
              </div>
            )}

            {project.features.length > 0 && (
              <div className="mt-8">
                <h4 className="font-mono text-[11px] uppercase tracking-label text-mist-400">What it does</h4>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {project.features.map((f, i) => (
                    <motion.li
                      key={f}
                      className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-[14px] leading-snug text-mist-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.05, duration: 0.5, ease: EASE_OUT }}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${[project.accent.primary, project.accent.tertiary, project.accent.secondary][i % 3]}33` }}>
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                          <path d="m2.5 6.2 2.2 2.2 4.8-4.9" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8">
              <h4 className="mb-4 font-mono text-[11px] uppercase tracking-label text-mist-400">Built with</h4>
              <StackChips stack={project.stack} />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <VisitButton project={project} />
              <button type="button" onClick={onClose} className="btn-ghost">
                Close
              </button>
            </div>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={onClose}
          data-autofocus
          aria-label="Close project details"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-950/60 text-white backdrop-blur-md transition-colors hover:bg-ink-800"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}

/* ---------- Pipeline ---------- */

const ICONS: Record<NonNullable<Project['icon']>, ReactNode> = {
  bot: (
    <path d="M4 9.5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-5l-4 3v-3.3A4 4 0 0 1 4 14.5v-5ZM9.5 11.5h.01M14.5 11.5h.01M12 2.5v3" />
  ),
  air: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />,
  feedback: <path d="M4 5h16v11H9l-5 4V5ZM8 9h8M8 12.5h5" />,
};

function PipelineCard({ project, index }: { project: Project; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      className="relative overflow-hidden rounded-[24px] border border-dashed border-white/10 bg-ink-900/60 p-6"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay: index * 0.1 }}
      aria-disabled="true"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" style={{ animationDelay: `${index * 0.5}s` }} />
      </div>
      <div className="relative opacity-75">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-volt-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {project.icon && ICONS[project.icon]}
            </svg>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-mist-400">{STATUS_LABEL[project.status]}</span>
        </div>
        <h4 className="mt-6 font-display text-xl font-semibold tracking-tight text-white">{project.name}</h4>
        <p className="mt-2 text-[14px] leading-relaxed text-mist-400">{project.tagline}</p>
      </div>
    </motion.li>
  );
}

/* ---------- Section ---------- */

export function Projects() {
  const [open, setOpen] = useState(false);
  const [holdHeight, setHoldHeight] = useState<number>();
  const slotRef = useRef<HTMLDivElement>(null);
  const { lock, unlock } = useSmoothScroll();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'start 35%'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    lock();
    return unlock;
  }, [open, lock, unlock]);

  if (!featuredProject) return null;

  return (
    <section id="projects" aria-labelledby="projects-title" className="relative py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-40 -z-10 mx-auto h-[500px] max-w-5xl rounded-full bg-[radial-gradient(closest-side,rgba(232,154,60,0.08),transparent)] blur-2xl" />
      <div className="container-x">
        <SectionIntro
          id="projects-title"
          index="02"
          label="Projects"
          variant="mask"
          title={
            <>
              Things we’ve <span className="text-gradient">shipped.</span>
            </>
          }
          kicker="Real platforms, used by real people at TIS."
        />

        <motion.div ref={stageRef} className="mt-14 sm:mt-20" style={{ rotateX, scale, opacity, transformPerspective: 1400, transformOrigin: '50% 0%' }}>
          {/* While open, the card lives in the dialog; this slot keeps its space so nothing shifts. */}
          <div ref={slotRef} style={{ minHeight: open ? holdHeight : undefined }}>
            {!open && (
              <FeaturedCard
                project={featuredProject}
                onOpen={() => {
                  setHoldHeight(slotRef.current?.offsetHeight);
                  setOpen(true);
                }}
              />
            )}
          </div>
        </motion.div>

        {pipelineProjects.length > 0 && (
          <div className="mt-16 sm:mt-20">
            <div className="flex items-center gap-4">
              <h3 className="font-mono text-[11px] uppercase tracking-label text-mist-300">In the pipeline</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {pipelineProjects.map((p, i) => (
                <PipelineCard key={p.id} project={p} index={i} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {createPortal(<AnimatePresence>{open && <ProjectDetail project={featuredProject} onClose={close} />}</AnimatePresence>, document.body)}
    </section>
  );
}
