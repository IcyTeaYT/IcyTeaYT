import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';
import { LogoMark } from './brand/LogoMark';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { useChromeAt } from '@/lib/surface';
import { EASE_OUT, SPRING_SNAPPY } from '@/lib/motion';
import { useIntroDone } from '@/lib/intro';

const LINKS = [
  { id: 'mission', label: 'Mission' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'founders', label: 'Founders' },
];
const NAV_H = 72;

function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = [...LINKS.map((l) => l.id), 'suggestions'];
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
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

/**
 * Logo left, links right. Transparent over the hero; once scrolled it takes
 * the colour of the section underneath (black or white), with a hairline,
 * unless that section asks to stay see-through (a full-screen film).
 */
export function Navbar({ offset }: { offset: number }) {
  const { scrollTo, lock, unlock } = useSmoothScroll();
  const introDone = useIntroDone();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const { surface, clear } = useChromeAt(offset + NAV_H / 2);
  const dark = open || surface === 'dark';
  // Sits under the announcement bar at the top, slides up to 0 as the bar scrolls away.
  const top = useTransform(scrollY, (y) => Math.max(0, offset - y));

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > offset + 8));

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
    const wasOpen = open;
    setOpen(false);
    window.setTimeout(() => scrollTo(`#${id}`), wasOpen ? 200 : 0);
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <>
      <motion.header
        data-chrome
        className={`fixed inset-x-0 z-50 border-b transition-colors duration-300 ${
          dark ? 'text-paper' : 'text-obsidian'
        } ${scrolled && !open && !clear ? (dark ? 'border-line-dark bg-obsidian' : 'border-line-light bg-paper') : 'border-transparent bg-transparent'}`}
        style={{ top }}
        initial={{ opacity: 0 }}
        animate={introDone ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.3 }}
      >
        <nav aria-label="Main" className="container-x flex items-center justify-between" style={{ height: NAV_H }}>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              scrollTo(0);
              history.replaceState(null, '', ' ');
            }}
            className="flex items-center gap-3"
            aria-label="TIS Tech Council, back to top"
          >
            <LogoMark className="h-8 w-8" />
            <span className="text-body font-medium tracking-[-0.02em]">TIS Tech Council</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <ul className="flex items-center gap-8">
              {LINKS.map((l) => (
                <li key={l.id} className="relative">
                  <a
                    href={`#${l.id}`}
                    onClick={go(l.id)}
                    aria-current={active === l.id ? 'true' : undefined}
                    className={`flex min-h-[44px] items-center text-body transition-opacity duration-300 ${active === l.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                  >
                    {l.label}
                  </a>
                  {active === l.id && <motion.span layoutId="nav-active" className="absolute inset-x-0 bottom-2 h-px bg-current" transition={SPRING_SNAPPY} />}
                </li>
              ))}
            </ul>
            <a href="#suggestions" onClick={go('suggestions')} className="rounded-nav border border-current px-3 py-1.5 text-body transition-opacity hover:opacity-70">
              Suggest an idea
            </a>
          </div>

          <button
            type="button"
            className="relative -mr-2 flex h-11 w-11 items-center justify-center md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <motion.span className="absolute h-px w-5 bg-current" animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }} transition={SPRING_SNAPPY} />
            <motion.span className="absolute h-px w-5 bg-current" animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }} transition={SPRING_SNAPPY} />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            data-chrome
            className="fixed inset-0 z-40 flex flex-col bg-obsidian px-5 pb-10 pt-32 text-paper md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ul className="flex flex-col">
              {[...LINKS, { id: 'suggestions', label: 'Suggest an idea' }].map((l, i) => (
                <motion.li
                  key={l.id}
                  className="border-b border-line-dark"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.05 + i * 0.05 }}
                >
                  <a href={`#${l.id}`} onClick={go(l.id)} className="type-heading block py-5 text-[2.5rem]">
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <p className="mt-auto text-body-sm text-fog">Challenge | Explore | Connect</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
