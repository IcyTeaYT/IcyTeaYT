'use client';
// Nav.tsx — transparent at the top, glass after 8px, hides on scroll down and returns on scroll up.
// 3–5 links max. The active-section pill glides between links (layoutId).
import {useState, type ReactNode} from 'react';
import {motion, useMotionValueEvent, useScroll} from 'motion/react';
import {springs} from './motion';

type Link = {href: string; label: string};

export function Nav({brand, links, cta, active}: {brand: ReactNode; links: Link[]; cta?: ReactNode; active?: string}) {
  const {scrollY} = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 8);
    setHidden(y > 240 && y > prev);
  });
  return (
    <motion.header
      animate={{y: hidden ? '-100%' : '0%'}}
      transition={{duration: 0.45, ease: [0.22, 1, 0.36, 1]}}
      onFocusCapture={() => setHidden(false)}
      className={`fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-colors duration-300 ${
        solid ? 'border-line bg-black/60 backdrop-blur-md backdrop-saturate-150' : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-[min(100%-2.5rem,1200px)] items-center justify-between gap-6">
        <a href="#" className="text-sm font-semibold tracking-[-0.01em]">
          {brand}
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="relative rounded-full px-3.5 py-2 text-sm text-fg-2 transition-colors hover:text-fg" aria-current={active === l.href ? 'page' : undefined}>
              {active === l.href && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface-2" transition={springs.ui} />}
              {l.label}
            </a>
          ))}
        </nav>
        {cta}
      </div>
    </motion.header>
  );
}
