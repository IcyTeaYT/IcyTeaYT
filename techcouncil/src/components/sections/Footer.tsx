import { motion, useReducedMotion } from 'motion/react';
import { LogoMark } from '../brand/LogoMark';
import { Owl } from '../brand/Owl';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT } from '@/lib/motion';

const WORDS = ['TIS', 'Tech', 'Council'];
const LINKS = [
  ['About', '#about'],
  ['Projects', '#projects'],
  ['Founders', '#founders'],
  ['Suggest an idea', '#suggestions'],
] as const;
const PETAL_BAR = ['bg-orange', 'bg-maroon', 'bg-teal', 'bg-cyan'];

export function Footer() {
  const reduce = useReducedMotion();
  const { scrollTo } = useSmoothScroll();

  return (
    <footer className="relative overflow-hidden border-t rule pt-20 sm:pt-24">
      <div className="container-x">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <Owl className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <p className="font-display text-[clamp(1.35rem,3vw,2.25rem)] font-semibold leading-tight tracking-display text-paper">
              <span className="whitespace-nowrap">Challenge</span> <span className="text-fog-400">|</span>{' '}
              <span className="whitespace-nowrap">Explore</span> <span className="text-fog-400">|</span>{' '}
              <span className="whitespace-nowrap">Connect</span>
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-7 gap-y-1">
              {LINKS.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(href);
                    }}
                    className="inline-flex min-h-[44px] items-center text-[16px] text-fog-200 transition-colors hover:text-paper"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Wordmark: words rise into place, then the petal bar draws underneath. */}
        <div className="mt-20 sm:mt-28" aria-hidden>
          <p className="flex flex-wrap items-end gap-x-[0.22em] font-display text-[clamp(3.4rem,11.5vw,11rem)] font-semibold leading-[0.86] tracking-display text-paper">
            {WORDS.map((w, i) => (
              <span key={w} className="inline-block overflow-hidden pb-[0.08em]">
                <motion.span
                  className="inline-block"
                  initial={reduce ? false : { y: '100%' }}
                  whileInView={{ y: '0%' }}
                  viewport={{ once: true, amount: 0 }}
                  transition={{ duration: 1.1, ease: EASE_OUT, delay: i * 0.08 }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </p>
          <div className="mt-6 flex h-2 overflow-hidden rounded-full sm:h-3">
            {PETAL_BAR.map((c, i) => (
              <motion.span
                key={c}
                className={`flex-1 origin-left ${c}`}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.35 + i * 0.1 }}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t rule py-8 text-[14px] text-fog-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-3">
              <LogoMark className="h-6 w-6 text-paper" />
              © 2026 TIS Tech Council, Tashkent International School
            </p>
            <p className="font-mono text-[12px] text-fog-400">
              deployed {__BUILD_DATE__} · react + vite · cloudflare pages + d1
            </p>
          </div>
          <button type="button" onClick={() => scrollTo(0)} className="inline-flex min-h-[44px] items-center self-start text-fog-200 underline decoration-fog-400/60 underline-offset-4 hover:text-paper hover:decoration-orange sm:self-auto">
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
