import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { founders, initials, isPlaceholder, type Founder } from '@/data/founders';
import { SectionIntro } from '../ui/SectionIntro';
import { Tilt } from '../ui/Tilt';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { EASE_OUT, SPRING_SOFT } from '@/lib/motion';

const HUES = [
  ['#2F6FF5', '#4DE8FA'],
  ['#5B91FF', '#8CF3FF'],
  ['#1F56D6', '#18D4EE'],
] as const;

/**
 * Photo with an animated initials avatar underneath. The photo fades in only
 * once it has loaded, so a missing file simply leaves the avatar showing and
 * nothing ever shifts.
 */
function Portrait({ founder, index, large = false }: { founder: Founder; index: number; large?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduce = useReducedMotion();
  const [a, b] = HUES[index % HUES.length]!;
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-800">
      {/* Initials avatar */}
      <div aria-hidden className="absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-[42%] h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
          style={{ background: `conic-gradient(from ${index * 120}deg, ${a}, #070B16 28%, ${b} 52%, #070B16 76%, ${a})`, filter: 'blur(48px)', opacity: 0.85 }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 18 + index * 3, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_20%,rgba(4,6,12,0.55)_80%)]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '16px 16px', maskImage: 'radial-gradient(circle at 50% 42%, #000, transparent 65%)', WebkitMaskImage: 'radial-gradient(circle at 50% 42%, #000, transparent 65%)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pb-[18%]">
          <span className={`font-display font-semibold tracking-tight text-white/95 ${large ? 'text-8xl' : 'text-7xl sm:text-8xl'}`}>{initials(founder.name)}</span>
        </div>
      </div>
      {!failed && (
        <img
          src={founder.photo}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out-expo group-hover:scale-[1.04]"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

function FounderCard({ founder, index, onOpen, revealed }: { founder: Founder; index: number; onOpen: () => void; revealed: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      // Cards coming back from the modal must not replay their entrance.
      initial={revealed ? false : reduce ? { opacity: 0 } : { opacity: 0, y: 80, rotate: index === 1 ? 0 : index === 0 ? -3 : 3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.1, ease: EASE_OUT, delay: index * 0.12 }}
      className={index === 1 ? 'md:mt-12' : ''}
    >
      <Tilt max={7} className="group rounded-[28px]">
        <motion.button
          type="button"
          layoutId={`founder-${founder.id}`}
          onClick={onOpen}
          data-open-founder={founder.id}
          aria-haspopup="dialog"
          aria-label={`${founder.name}, ${founder.role}. Read bio`}
          className="relative block aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-white/10 text-left"
          transition={SPRING_SOFT}
        >
          <motion.div layoutId={`founder-photo-${founder.id}`} className="absolute inset-0" transition={SPRING_SOFT}>
            <Portrait founder={founder} index={index} />
          </motion.div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <motion.p layoutId={`founder-role-${founder.id}`} className="font-mono text-[10px] uppercase tracking-label text-volt-300">
                {founder.role}
              </motion.p>
              <motion.h3 layoutId={`founder-name-${founder.id}`} className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-white">
                {founder.name}
              </motion.h3>
              <p className="mt-1 truncate text-sm text-mist-300">{founder.tagline}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-500 group-hover:rotate-90 group-hover:bg-white group-hover:text-ink-950">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </motion.button>
      </Tilt>
    </motion.li>
  );
}

function FounderModal({ founder, index, onClose }: { founder: Founder; index: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose, `[data-open-founder="${founder.id}"]`);
  const pending = isPlaceholder(founder.bio);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
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
        layoutId={`founder-${founder.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`founder-title-${founder.id}`}
        className="relative z-10 flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 sm:rounded-[32px] md:flex-row"
        transition={SPRING_SOFT}
      >
        <motion.div layoutId={`founder-photo-${founder.id}`} className="relative h-64 shrink-0 sm:h-80 md:h-auto md:w-[42%]" transition={SPRING_SOFT}>
          <Portrait founder={founder} index={index} large />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-ink-900/40" />
        </motion.div>
        <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10">
          <motion.p layoutId={`founder-role-${founder.id}`} className="font-mono text-[11px] uppercase tracking-label text-volt-300">
            {founder.role} · TIS Tech Council
          </motion.p>
          <motion.h3 layoutId={`founder-name-${founder.id}`} id={`founder-title-${founder.id}`} className="mt-3 text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl">
            {founder.name}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: 0.18, duration: 0.6, ease: EASE_OUT }}
          >
            <p className="mt-4 text-lg text-mist-200">{founder.tagline}</p>
            <div className="my-7 h-px bg-gradient-to-r from-volt-400/50 via-white/10 to-transparent" />
            {pending ? (
              <p className="text-[16px] italic leading-relaxed text-mist-400">Bio coming soon.</p>
            ) : (
              <p className="text-[16px] leading-relaxed text-mist-200">{founder.bio}</p>
            )}
            {founder.links && founder.links.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2">
                {founder.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="chip gap-1.5 transition-colors hover:border-volt-400/50 hover:text-white">
                      {l.label}
                      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
                        <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <span className="sr-only">(opens in a new tab)</span>
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

export function Founders() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { lock, unlock } = useSmoothScroll();
  const close = useCallback(() => setOpenId(null), []);
  const openIndex = founders.findIndex((f) => f.id === openId);
  const open = openIndex >= 0 ? founders[openIndex] : undefined;

  useEffect(() => {
    if (!openId) return;
    lock();
    return unlock;
  }, [openId, lock, unlock]);

  return (
    <section id="founders" aria-labelledby="founders-title" className="relative py-20 sm:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionIntro
            id="founders-title"
            index="03"
            label="Founders"
            title={
              <>
                Three students.
                <br />
                <span className="text-mist-400">One campus to upgrade.</span>
              </>
            }
          />
          <p className="max-w-xs text-[15px] leading-relaxed text-mist-400 md:pb-3">
            The Tech Council was started by three TIS students who wanted to fix things, not just talk about them. Tap a card to read more.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:mt-20 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          {founders.map((f, i) =>
            f.id === openId ? (
              // Keeps the grid cell while the card is open in the modal.
              <li key={f.id} aria-hidden className={`aspect-[4/5] ${i === 1 ? 'md:mt-12' : ''}`} />
            ) : (
              <FounderCard key={f.id} founder={f} index={i} revealed={revealed} onOpen={() => {
                setRevealed(true);
                setOpenId(f.id);
              }} />
            ),
          )}
        </ul>
      </div>
      {createPortal(<AnimatePresence>{open && <FounderModal key={open.id} founder={open} index={openIndex} onClose={close} />}</AnimatePresence>, document.body)}
    </section>
  );
}
