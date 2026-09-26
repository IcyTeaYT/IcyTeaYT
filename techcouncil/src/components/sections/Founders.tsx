import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { founders, initials, isPlaceholder, type Founder } from '@/data/founders';
import { SectionIntro } from '../ui/SectionIntro';
import { Tilt } from '../ui/Tilt';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useSpotlight } from '@/lib/useSpotlight';
import { EASE_OUT, SPRING_SOFT } from '@/lib/motion';

// Each founder takes one petal of the mark as their colour.
const PETALS = [
  { field: '#F29839', ink: '#0A0F17' },
  { field: '#07686E', ink: '#FFFFFF' },
  { field: '#951E34', ink: '#FFFFFF' },
] as const;

/**
 * Initials on the founder's petal colour, with the photo laid over it once it
 * has loaded. A missing photo leaves the initials; nothing shifts.
 */
function Portrait({ founder, index, className = '', large = false }: { founder: Founder; index: number; className?: string; large?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const petal = PETALS[index % PETALS.length]!;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: petal.field }}>
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center font-display font-semibold tracking-display ${large ? 'text-[5.5rem]' : 'text-[1.6rem]'}`}
        style={{ color: petal.ink }}
      >
        {initials(founder.name)}
      </span>
      {!failed && (
        <img
          src={founder.photo}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

function FounderCard({ founder, index, onOpen }: { founder: Founder; index: number; onOpen: () => void }) {
  const spot = useSpotlight();
  return (
    <li>
      <Tilt max={6} glare={false} className="group h-full rounded-[22px]">
        <motion.button
          type="button"
          layoutId={`founder-${founder.id}`}
          onClick={onOpen}
          {...spot}
          data-open-founder={founder.id}
          aria-haspopup="dialog"
          className="spotlight flex h-full w-full items-center gap-5 rounded-[22px] border rule bg-night-800 p-5 text-left transition-colors duration-300 hover:border-white/25 sm:p-6"
          style={{ ['--spot-fill' as string]: `${PETALS[index % PETALS.length]!.field}26` }}
          transition={SPRING_SOFT}
        >
          <motion.div layoutId={`founder-photo-${founder.id}`} className="relative z-10 shrink-0 overflow-hidden rounded-full" transition={SPRING_SOFT}>
            <Portrait founder={founder} index={index} className="h-[72px] w-[72px] rounded-full" />
          </motion.div>
          <span className="relative z-10 min-w-0 flex-1">
            <motion.span layoutId={`founder-name-${founder.id}`} className="block text-[20px] font-semibold leading-tight text-paper">
              {founder.name}
            </motion.span>
            <span className="mt-1 block text-[15px] text-fog-300">
              <span className="font-mono text-[13px] text-cyan-ink">{founder.role.toLowerCase()}</span>
              {founder.tagline && <span className="text-fog-200"> · {founder.tagline}</span>}
            </span>
            <span className="mt-3 inline-block text-[14px] font-medium text-paper underline decoration-fog-400/60 underline-offset-4 group-hover:decoration-orange">
              Read bio
            </span>
          </span>
        </motion.button>
      </Tilt>
    </li>
  );
}

function FounderModal({ founder, index, onClose }: { founder: Founder; index: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose, `[data-open-founder="${founder.id}"]`);
  const pending = isPlaceholder(founder.bio);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <motion.div
        className="absolute inset-0 bg-night/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={ref}
        layoutId={`founder-${founder.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`founder-title-${founder.id}`}
        className="relative z-10 flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[26px] border rule bg-night-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:rounded-[26px] md:flex-row"
        transition={SPRING_SOFT}
      >
        <motion.div layoutId={`founder-photo-${founder.id}`} className="h-56 shrink-0 overflow-hidden sm:h-72 md:h-auto md:w-[40%]" transition={SPRING_SOFT}>
          <Portrait founder={founder} index={index} large className="h-full w-full" />
        </motion.div>
        <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10">
          <motion.h3 layoutId={`founder-name-${founder.id}`} id={`founder-title-${founder.id}`} className="pr-10 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-display text-paper sm:text-5xl">
            {founder.name}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: 0.15, duration: 0.5, ease: EASE_OUT }}
          >
            <p className="mt-3 text-[16px] text-fog-300">{founder.role}, TIS Tech Council</p>
            {founder.tagline && <p className="mt-5 text-[19px] text-paper">{founder.tagline}</p>}
            <div className="my-7 h-px bg-white/10" />
            {pending ? (
              <p className="text-[17px] leading-relaxed text-fog-300">Bio coming soon.</p>
            ) : (
              <p className="text-[17px] leading-relaxed text-fog-200">{founder.bio}</p>
            )}
            {founder.links && founder.links.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-3">
                {founder.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-link inline-flex min-h-[44px] items-center">
                      {l.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          aria-label="Close bio"
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-night text-paper transition-colors hover:bg-night-600"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}

export function Founders() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { lock, unlock } = useSmoothScroll();
  const reduce = useReducedMotion();
  const close = useCallback(() => setOpenId(null), []);
  const openIndex = founders.findIndex((f) => f.id === openId);
  const open = openIndex >= 0 ? founders[openIndex] : undefined;

  useEffect(() => {
    if (!openId) return;
    lock();
    return unlock;
  }, [openId, lock, unlock]);

  return (
    <section id="founders" aria-labelledby="founders-title" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionIntro id="founders-title" path="founders" title="Who started it." kicker="The council was founded by three TIS students." />
        <motion.ul
          className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-3 md:gap-5"
          initial={reduce ? false : { y: 24 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        >
          {founders.map((f, i) =>
            f.id === openId ? (
              // Holds the slot while this card is open in the dialog.
              <li key={f.id} aria-hidden className="min-h-[122px]" />
            ) : (
              <FounderCard key={f.id} founder={f} index={i} onOpen={() => setOpenId(f.id)} />
            ),
          )}
        </motion.ul>
      </div>
      {createPortal(<AnimatePresence>{open && <FounderModal key={open.id} founder={open} index={openIndex} onClose={close} />}</AnimatePresence>, document.body)}
    </section>
  );
}
