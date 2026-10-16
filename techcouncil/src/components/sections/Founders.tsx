import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { founders, initials, isPlaceholder, type Founder } from '@/data/founders';
import { SectionIntro } from '../ui/SectionIntro';
import { WhipPan } from '../ui/WhipPan';
import { useMediaQuery } from '@/lib/media';
import { Arrow } from '../ui/Arrow';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { EASE_OUT, SPRING_SOFT, span } from '@/lib/motion';

/**
 * Photo with the petal-gradient wash over it. Until a photo exists the wash
 * sits on black with large initials; the photo fades in once it has loaded,
 * so a missing file never shifts anything.
 */
function Portrait({ founder, index, large = false }: { founder: Founder; index: number; large?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden bg-obsidian">
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center pb-[20%] font-light tracking-[-0.06em] text-paper ${large ? 'text-[7rem]' : 'text-[5.5rem]'}`}
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
          className="absolute inset-0 h-full w-full object-cover object-[50%_20%] transition-[opacity,transform] duration-700 ease-out-expo group-hover:scale-[1.03]"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
      {/* The wash: the one place the petal gradient appears besides the top bar. */}
      <div aria-hidden className="absolute inset-0 bg-petal opacity-40 mix-blend-screen" style={{ backgroundPosition: `${index * 50}% 0`, backgroundSize: '200% 100%' }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian/80 to-transparent" />
    </div>
  );
}

function FounderCard({ founder, index, onOpen }: { founder: Founder; index: number; onOpen: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const two = useMediaQuery('(min-width: 640px)');
  const three = useMediaQuery('(min-width: 768px)');
  // Each card flies in from deep in the frame as it scrolls up; side by side,
  // they leave one after another, like a dolly passing a row.
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'start 0.4'] });
  const lag = (index % (three ? 3 : two ? 2 : 1)) * 0.14;
  const settle = { ease: (t: number) => 1 - Math.pow(1 - t, 3) };
  const z = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [-560, 0]), settle);
  const y = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [110, 0]), settle);
  const rotateX = useTransform(p, ...span([lag, 1], reduce ? [0, 0] : [12, 0]), settle);
  const opacity = useTransform(p, ...span([lag, lag + (1 - lag) * 0.5], reduce ? [1, 1] : [0, 1]));

  return (
    <motion.li ref={ref} style={{ z, y, rotateX, opacity, transformPerspective: 1200 }}>
      <motion.button
        type="button"
        layoutId={`founder-${founder.id}`}
        onClick={onOpen}
        data-open-founder={founder.id}
        aria-haspopup="dialog"
        aria-label={`${founder.name}, ${founder.role}. Read bio`}
        className="group relative block aspect-[3/4] w-full overflow-hidden rounded-card text-left text-paper"
        transition={SPRING_SOFT}
      >
        <motion.div layoutId={`founder-photo-${founder.id}`} className="absolute inset-0" transition={SPRING_SOFT}>
          <Portrait founder={founder} index={index} />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 p-6">
          <motion.h3 layoutId={`founder-name-${founder.id}`} className="text-subheading font-medium">
            {founder.name}
          </motion.h3>
          <p className="mt-1 text-body text-paper/80">{founder.role}</p>
          <span className="pill-ghost mt-5 min-h-[40px] px-5 group-hover:bg-paper group-hover:text-obsidian">
            Read bio
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
    <section id="founders" data-surface="light" aria-labelledby="founders-title" className="overflow-hidden bg-paper py-20 text-obsidian sm:py-28">
      <div className="container-x">
        <WhipPan from="left">
          <SectionIntro id="founders-title" title="Three students. One campus to upgrade.">
            <p className="text-graphite">The Tech Council was started by three TIS students who wanted to fix things, not just talk about them.</p>
          </SectionIntro>
        </WhipPan>
        <ul className="mt-16 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {founders.map((f, i) =>
            f.id === openId ? (
              <li key={f.id} aria-hidden className="aspect-[3/4]" />
            ) : (
              <FounderCard
                key={f.id}
                founder={f}
                index={i}
                onOpen={() => setOpenId(f.id)}
              />
            ),
          )}
        </ul>
      </div>
      {createPortal(<AnimatePresence>{open && <FounderModal key={open.id} founder={open} index={openIndex} onClose={close} />}</AnimatePresence>, document.body)}
    </section>
  );
}
