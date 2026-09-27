import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { featuredProject, pipelineProjects, STATUS_LABEL, type Project } from '@/data/projects';
import { SectionIntro } from '../ui/SectionIntro';
import { Arrow } from '../ui/Arrow';
import { Ripple } from '../ui/Ripple';
import { TismunLogo } from '../brand/TismunLogo';
import { Countdown } from './Countdown';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { EASE_OUT, SPRING_SOFT } from '@/lib/motion';

function Status({ project, layoutId }: { project: Project; layoutId?: string }) {
  return (
    <motion.span layoutId={layoutId} className="inline-flex items-center gap-2 text-body-sm">
      {project.status === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
          <span className="relative h-2 w-2 rounded-full bg-success" />
        </span>
      )}
      {STATUS_LABEL[project.status]}
    </motion.span>
  );
}

function Stack({ stack }: { stack: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Built with">
      {stack.map((s) => (
        <li key={s} className="rounded-pill border border-current px-3 py-1 text-caption opacity-70">
          {s}
        </li>
      ))}
    </ul>
  );
}

function VisitButton({ project, solid }: { project: Project; solid: 'dark' | 'light' }) {
  const cls = solid === 'dark' ? 'pill-solid-dark' : 'pill-solid-light';
  if (!project.link) {
    return (
      <span className={`${cls} cursor-not-allowed opacity-50`} aria-disabled="true">
        Link coming soon
      </span>
    );
  }
  return (
    <a href={project.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cls}>
      Visit {project.name}
      <Arrow />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/* ---------- Featured project ---------- */

function Featured({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <motion.article layoutId={`project-${project.id}`} className="grid gap-10 md:grid-cols-2 md:gap-16" transition={SPRING_SOFT}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${project.name}: view details`}
        tabIndex={-1}
        className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card bg-ash p-10"
      >
        <motion.div layoutId={`project-logo-${project.id}`} className="w-full max-w-[420px]" transition={SPRING_SOFT}>
          <Ripple>
            <TismunLogo className="w-full transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]" />
          </Ripple>
        </motion.div>
        <span className="absolute bottom-5 left-5 text-caption text-graphite">{project.date}</span>
      </button>

      <div className="flex flex-col justify-center">
        <Status project={project} layoutId={`project-status-${project.id}`} />
        <motion.h3 layoutId={`project-title-${project.id}`} className="type-heading mt-4 text-heading-sm sm:text-[44px]">
          {project.name}
        </motion.h3>
        <p className="mt-3 text-body-lg">{project.tagline}</p>
        <p className="mt-4 text-body text-fog">{project.description}</p>

        {project.event && (
          <div className="mt-10">
            <p className="mb-4 text-caption text-fog">Conference starts in ({project.event.timezoneLabel})</p>
            <Countdown {...project.event} />
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <VisitButton project={project} solid="dark" />
          <button type="button" onClick={onOpen} data-open-project={project.id} aria-haspopup="dialog" className="pill-ghost">
            View details
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* ---------- Detail view ---------- */

function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose, `[data-open-project="${project.id}"]`);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <motion.div className="absolute inset-0 bg-obsidian/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
      <motion.div
        ref={ref}
        layoutId={`project-${project.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`project-detail-title-${project.id}`}
        data-surface="light"
        className="relative z-10 flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-card bg-paper text-obsidian sm:rounded-card"
        transition={SPRING_SOFT}
      >
        <div data-lenis-prevent className="overflow-y-auto overscroll-contain">
          <div className="flex h-48 items-center justify-center bg-ash px-10 sm:h-60">
            <motion.div layoutId={`project-logo-${project.id}`} className="w-full max-w-[360px]" transition={SPRING_SOFT}>
              <TismunLogo className="w-full" />
            </motion.div>
          </div>
          <motion.div
            className="p-6 sm:p-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: 0.12, duration: 0.6, ease: EASE_OUT }}
          >
            <div className="flex flex-wrap items-center gap-4 text-graphite">
              <Status project={project} layoutId={`project-status-${project.id}`} />
              {project.date && <span className="text-body-sm">{project.date}</span>}
            </div>
            <motion.h3 layoutId={`project-title-${project.id}`} id={`project-detail-title-${project.id}`} className="type-heading mt-4 text-[44px]">
              {project.name}
            </motion.h3>
            <p className="mt-3 text-body-lg">{project.tagline}</p>
            <p className="mt-4 text-body text-graphite">{project.description}</p>

            {project.features.length > 0 && (
              <ul className="mt-10 border-t border-line-light">
                {project.features.map((f) => (
                  <li key={f} className="border-b border-line-light py-4 text-body">
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10 text-graphite">
              <Stack stack={project.stack} />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <VisitButton project={project} solid="light" />
              <button type="button" onClick={onClose} className="pill-ghost">
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
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-line-light bg-paper text-obsidian hover:bg-ash"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}

/* ---------- Pipeline (only shown once a pipeline project exists in projects.ts) ---------- */

function PipelineCard({ project, index }: { project: Project; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      className="rounded-card border border-line-dark p-6 opacity-70"
      initial={reduce ? false : { y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay: index * 0.08 }}
      aria-disabled="true"
    >
      <h4 className="text-subheading font-normal">{project.name}</h4>
      <p className="mt-2 text-body text-fog">{project.tagline}</p>
    </motion.li>
  );
}

/* ---------- Section ---------- */

export function Projects() {
  const [open, setOpen] = useState(false);
  const [holdHeight, setHoldHeight] = useState<number>();
  const slotRef = useRef<HTMLDivElement>(null);
  const { lock, unlock } = useSmoothScroll();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    lock();
    return unlock;
  }, [open, lock, unlock]);

  if (!featuredProject) return null;

  return (
    <section id="projects" data-surface="dark" aria-labelledby="projects-title" className="bg-obsidian py-20 text-paper sm:py-28">
      <div className="container-x">
        <SectionIntro id="projects-title" title="Things we’ve shipped.">
          <p className="text-fog">Real platforms, used by real people at TIS.</p>
        </SectionIntro>

        {/* While open, the project lives in the dialog; this slot keeps its space. */}
        <div ref={slotRef} className="mt-16 sm:mt-20" style={{ minHeight: open ? holdHeight : undefined }}>
          {!open && (
            <Featured
              project={featuredProject}
              onOpen={() => {
                setHoldHeight(slotRef.current?.offsetHeight);
                setOpen(true);
              }}
            />
          )}
        </div>

        {pipelineProjects.length > 0 && (
          <div className="mt-20">
            <h3 className="border-t border-line-dark pt-6 text-body text-fog">In the pipeline</h3>
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
