import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { LogoMark } from './brand/LogoMark';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT, SPRING_SNAPPY } from '@/lib/motion';
import { useIntroDone } from '@/lib/intro';

// Order follows the page: proof (Projects) comes straight after the hero.
const LINKS = [
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'founders', label: 'Founders' },
  { id: 'suggestions', label: 'Suggestions' },
];

const PETAL_KEYS = ['bg-orange', 'bg-teal-ink', 'bg-cyan', 'bg-maroon-ink'];

function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter((e): e is HTMLElement => !!e);
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visible) if (ratio > bestRatio) [best, bestRatio] = [id, ratio];
        setActive(best);
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

export function Navbar() {
  const { scrollTo, lock, unlock } = useSmoothScroll();
  const introDone = useIntroDone();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 40));

  useEffect(() => {
    if (!open) return;
    lock();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      unlock();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, lock, unlock]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // Let the mobile menu start closing before scrolling.
    window.setTimeout(() => scrollTo(`#${id}`), open ? 180 : 0);
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4"
        initial={{ y: -80, opacity: 0 }}
        animate={introDone ? { y: 0, opacity: 1 } : undefined}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.35 }}
      >
        <motion.nav
          aria-label="Main"
          className="relative flex h-14 w-full items-center justify-between rounded-full border px-3 sm:px-4"
          animate={{
            maxWidth: scrolled ? 860 : 1240,
            backgroundColor: scrolled ? 'rgba(15,22,34,0.72)' : 'rgba(15,22,34,0)',
            borderColor: scrolled ? 'rgba(238,241,245,0.12)' : 'rgba(238,241,245,0)',
            boxShadow: scrolled ? '0 20px 50px -20px rgba(0,0,0,0.7)' : '0 0 0 0 rgba(0,0,0,0)',
          }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{ backdropFilter: scrolled ? 'blur(18px) saturate(150%)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(150%)' : 'none' }}
        >
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollTo(0);
              history.replaceState(null, '', ' ');
            }}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2"
            aria-label="TIS Tech Council, back to top"
          >
            <LogoMark className="h-8 w-8 text-paper" />
            <span className="whitespace-nowrap font-display text-[15px] font-semibold tracking-tight text-paper">
              TIS Tech Council
            </span>
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.id} className="relative">
                <a
                  href={`#${l.id}`}
                  onClick={go(l.id)}
                  aria-current={active === l.id ? 'true' : undefined}
                  className={`relative z-10 flex min-h-[44px] items-center rounded-full px-4 text-[15px] font-medium transition-colors duration-300 ${
                    active === l.id ? 'text-paper' : 'text-fog-200 hover:text-paper'
                  }`}
                >
                  {l.label}
                </a>
                {active === l.id && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 bottom-1.5 h-[2px] rounded-full bg-orange"
                    transition={SPRING_SNAPPY}
                  />
                )}
              </li>
            ))}
          </ul>

          <a href="#suggestions" onClick={go('suggestions')} className="hidden min-h-[44px] items-center whitespace-nowrap rounded-full bg-orange px-5 text-[15px] font-semibold text-night transition-colors duration-300 hover:bg-orange-ink md:inline-flex">
            Suggest an idea
          </a>

          <div className="flex items-center gap-2 md:hidden">
          <a href="#suggestions" onClick={go('suggestions')} className="inline-flex min-h-[44px] items-center rounded-full bg-orange px-4 text-[15px] font-semibold text-night">
            Suggest
          </a>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <motion.span className="absolute h-[1.5px] w-4 rounded bg-white" animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -3.5 }} transition={SPRING_SNAPPY} />
            <motion.span className="absolute h-[1.5px] w-4 rounded bg-white" animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 3.5 }} transition={SPRING_SNAPPY} />
          </button>
          </div>
        </motion.nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col bg-night/95 px-6 pb-10 pt-28 backdrop-blur-xl md:hidden"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 40px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 40px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 40px)' }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <ul className="flex flex-col gap-1">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 + i * 0.06 }}
                >
                  <a href={`#${l.id}`} onClick={go(l.id)} className="flex items-center gap-4 py-2 font-display text-5xl font-semibold tracking-display text-paper">
                    <span aria-hidden className={`h-3 w-3 rotate-45 rounded-[3px] ${PETAL_KEYS[i % PETAL_KEYS.length]}`} />
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <motion.p
              className="mt-auto text-[16px] font-medium text-fog-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Challenge <span className="text-fog-400">|</span> Explore <span className="text-fog-400">|</span> Connect
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
