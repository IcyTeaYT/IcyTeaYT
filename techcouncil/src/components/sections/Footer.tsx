import { motion, useReducedMotion } from 'motion/react';
import { LogoMark } from '../brand/LogoMark';
import { Owl } from '../brand/Owl';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT } from '@/lib/motion';

const LINKS = [
  ['Mission', '#mission'],
  ['About', '#about'],
  ['Projects', '#projects'],
  ['Founders', '#founders'],
  ['Suggest an idea', '#suggestions'],
  ['Questions', '#faq'],
] as const;

/**
 * Sticky reveal: the footer sits pinned at the bottom of the viewport behind
 * the page, and the last section slides up off it.
 */
export function Footer() {
  const reduce = useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  return (
    <footer data-surface="light" className="sticky bottom-0 z-0 bg-ash text-obsidian">
      <div className="container-x pb-8 pt-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10 text-obsidian" />
            <div>
              <p className="text-body font-medium">TIS Tech Council</p>
              <p className="text-body-sm text-graphite">Tashkent International School</p>
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-12 gap-y-1 sm:grid-cols-3">
              {LINKS.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(href);
                    }}
                    className="inline-flex min-h-[40px] items-center text-body text-graphite transition-colors hover:text-obsidian"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p aria-hidden className="type-display mt-20 flex flex-wrap gap-x-[0.25em] overflow-hidden text-[clamp(3.25rem,12vw,11rem)] leading-[0.9]">
          {['TIS', 'Tech', 'Council'].map((w, i) => (
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
        <div className="mt-6 h-1 w-full rounded-full bg-petal" />

        <div className="mt-8 flex flex-col gap-2 text-body-sm text-graphite sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council · Tashkent International School</p>
          <p className="flex items-center gap-3">
            <Owl className="h-6 w-6 text-obsidian" />
            Challenge | Explore | Connect
          </p>
        </div>
      </div>
    </footer>
  );
}
