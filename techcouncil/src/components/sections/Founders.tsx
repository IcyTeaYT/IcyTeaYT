import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { founders, initials, isPlaceholder, type Founder } from '@/data/founders';
import { SectionIntro } from '../ui/SectionIntro';
import { Arrow } from '../ui/Arrow';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { EASE_OUT, SPRING_SOFT } from '@/lib/motion';
import { archPath, shapeMask, TIS } from '../brand/Shapes';
import { LOOK } from '@/lib/look';

/**
 * What each founder's arch sits on: a solid brand colour (blocks), or quiet
 * dark blue with the arch drawn in a fine brand-colour line (calm).
 */
const BACKDROPS = LOOK === 'blocks' ? [TIS.turquoise, TIS.apricot, TIS.teal] : ['#323F4D', '#323F4D', '#323F4D'];
const ARCH_OPEN = { hidden: { clipPath: 'inset(100% 0% 0% 0%)' }, shown: { clipPath: 'inset(0% 0% 0% 0%)' } };
const LINES = [TIS.turquoise, TIS.apricot, TIS.green];

// The arch window in a card: 82% of its width, from 7% below its top (the card is 4:5).
const ARCH_W = 328;
const ARCH_H = 465;
const ARCH_MASK = shapeMask(archPath(ARCH_W, ARCH_H), ARCH_W, ARCH_H);

/**
 * The portrait on its colour block. In the cards the photo is set in a lancet
 * arch, the petal shape (manual 6.1); in the bio it fills the panel. Until a
 * photo exists the initials stand in, and the photo fades in once loaded, so
 * a missing file never shifts anything.
 */
function Portrait({ founder, index, large = false, play = false }: { founder: Founder; index: number; large?: boolean; play?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const photo = (
    <>
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center pb-[10%] font-light tracking-[-0.04em] text-paper ${large ? 'text-[7rem]' : 'text-[5.5rem]'}`}
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
          className="absolute inset-0 h-full w-full object-cover object-[50%_20%] transition-[opacity,transform] duration-700 ease-out-expo group-hover:scale-[1.04]"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </>
  );
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: BACKDROPS[index % BACKDROPS.length] }}>
      {large ? (
        <div className="absolute inset-0 bg-obsidian">{photo}</div>
      ) : (
        <>
          {/* The arch opens upward as the card comes into view. */}
          <motion.div
            className="absolute inset-x-[9%] bottom-0 top-[7%] bg-obsidian"
            style={ARCH_MASK}
            variants={play ? ARCH_OPEN : undefined}
            transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.15 + index * 0.12 }}
          >
            {photo}
          </motion.div>
          {LOOK === 'calm' && (
            <svg aria-hidden viewBox={`0 0 ${ARCH_W} ${ARCH_H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-x-[9%] bottom-0 top-[7%] h-[93%] w-[82%] overflow-visible">
              <path d={archPath(ARCH_W, ARCH_H)} fill="none" stroke={LINES[index % LINES.length]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" transform={`translate(-8 -8) scale(${(ARCH_W + 16) / ARCH_W} ${(ARCH_H + 8) / ARCH_H})`} />
            </svg>
          )}
        </>
      )}
    </div>
  );
}

function FounderCard({ founder, index, onOpen, revealed }: { founder: Founder; index: number; onOpen: () => void; revealed: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      // A card coming back from the bio dialog must not replay its entrance.
      initial={revealed || reduce ? false : 'hidden'}
      whileInView="shown"
      variants={{ hidden: { y: 48, opacity: 0 }, shown: { y: 0, opacity: 1 } }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, ease: EASE_OUT, delay: index * 0.1 }}
    >
      <motion.button
        type="button"
        layoutId={`founder-${founder.id}`}
        onClick={onOpen}
        data-open-founder={founder.id}
        aria-haspopup="dialog"
        aria-label={`${founder.name}, ${founder.role}. Read bio`}
        className="group block w-full text-left text-paper"
        transition={SPRING_SOFT}
      >
        <div className="rounded-[28px] bg-white/[0.04] p-2 ring-1 ring-white/10 transition-colors duration-500 group-hover:bg-white/[0.07]">
          <motion.div
            layoutId={`founder-photo-${founder.id}`}
            className="relative aspect-[4/5] overflow-hidden rounded-[20px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            transition={SPRING_SOFT}
          >
            <Portrait founder={founder} index={index} play={!revealed && !reduce} />
          </motion.div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4 px-2">
          <div>
            <motion.h3 layoutId={`founder-name-${founder.id}`} className="text-subheading font-semibold">
              {founder.name}
            </motion.h3>
            <p className="mt-1 text-body text-fog">{founder.role}</p>
          </div>
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-dark transition-colors duration-300 group-hover:border-tis-turquoise group-hover:bg-tis-turquoise"
          >
            <Arrow />
          </span>
        </div>
      </motion.button>
    </motion.li>
  );
}

function FounderModal({ founder, index, onClose }: { founder: Founder; index: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose, `[data-open-founder="${founder.id}"]`);
  const pending = isPlaceholder(founder.bio);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <motion.div className="absolute inset-0 bg-obsidian/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
      <motion.div
        ref={ref}
        layoutId={`founder-${founder.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`founder-title-${founder.id}`}
        data-surface="light"
        className="relative z-10 flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-t-card bg-paper text-obsidian sm:rounded-card md:flex-row"
        transition={SPRING_SOFT}
      >
        <motion.div layoutId={`founder-photo-${founder.id}`} className="relative h-72 shrink-0 md:h-auto md:w-[42%]" transition={SPRING_SOFT}>
          <Portrait founder={founder} index={index} large />
        </motion.div>
        <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10">
          <p className="text-body-sm text-graphite">{founder.role}, TIS Tech Council</p>
          <motion.h3 layoutId={`founder-name-${founder.id}`} id={`founder-title-${founder.id}`} className="type-heading mt-3 pr-10 text-[44px]">
            {founder.name}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: 0.15, duration: 0.5, ease: EASE_OUT }}
          >
            {founder.tagline && <p className="mt-4 text-body-lg">{founder.tagline}</p>}
            <div className="my-8 h-px bg-line-light" />
            <p className={`whitespace-pre-line text-body-lg ${pending ? 'text-graphite' : ''}`}>{pending ? 'Bio coming soon.' : founder.bio}</p>
            {founder.links && founder.links.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-3">
                {founder.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="pill-ghost">
                      {l.label}
                      <Arrow />
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
    <section id="founders" data-surface="dark" aria-labelledby="founders-title" className="relative overflow-hidden bg-obsidian py-24 text-paper sm:py-36">
      <div className="container-x relative">
        <SectionIntro id="founders-title" eyebrow="The team" tone="dark" title="Three students. One campus to upgrade.">
          <p className="text-fog">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
        </SectionIntro>
        <ul className="mt-20 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-8">
          {founders.map((f, i) =>
            f.id === openId ? (
              <li key={f.id} aria-hidden>
                <div className="aspect-[4/5]" />
                <div className="h-[76px]" />
              </li>
            ) : (
              <FounderCard
                key={f.id}
                founder={f}
                index={i}
                revealed={revealed}
                onOpen={() => {
                  setRevealed(true);
                  setOpenId(f.id);
                }}
              />
            ),
          )}
        </ul>
      </div>
      {createPortal(<AnimatePresence>{open && <FounderModal key={open.id} founder={open} index={openIndex} onClose={close} />}</AnimatePresence>, document.body)}
    </section>
  );
}
