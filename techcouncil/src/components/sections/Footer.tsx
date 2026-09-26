import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { LogoMark } from '../brand/LogoMark';
import { Owl } from '../brand/Owl';
import { useSmoothScroll } from '@/lib/smoothScroll';
import { EASE_OUT } from '@/lib/motion';

const WORD = 'TECH COUNCIL';

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [120, 0]);
  const glow = useTransform(scrollYProgress, [0.4, 1], [0, 1]);

  return (
    <footer ref={ref} className="relative overflow-hidden border-t hairline pt-20 sm:pt-28">
      <motion.div aria-hidden style={{ opacity: glow }} className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[70%] w-[120%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(47,111,245,0.35),transparent)] blur-2xl" />

      <div className="container-x relative">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <LogoMark className="h-10 w-10 text-white" />
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-white">TIS Tech Council</p>
                <p className="text-sm text-mist-400">Tashkent International School</p>
              </div>
            </div>
            <p className="mt-6 text-[15px] leading-relaxed text-mist-400">Student-built tech for a smarter, more connected campus.</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
            {[
              ['About', '#about'],
              ['Projects', '#projects'],
              ['Founders', '#founders'],
              ['Suggest an idea', '#suggestions'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(href!);
                }}
                className="text-mist-300 transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => scrollTo(0)}
            className="group flex items-center gap-3 self-start rounded-full border border-white/10 py-2 pl-4 pr-2 text-sm text-mist-300 transition-colors hover:border-white/25 hover:text-white"
          >
            Back to top
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 group-hover:-translate-y-0.5">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                <path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Giant wordmark */}
      <motion.div style={{ y }} className="relative mt-16 select-none sm:mt-24" aria-hidden>
        <div className="flex justify-center overflow-hidden whitespace-nowrap px-2 font-display text-[clamp(3rem,12.6vw,13rem)] font-semibold leading-[0.8] tracking-[-0.055em]">
          {WORD.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block bg-gradient-to-b from-white via-mist-200 to-mist-200/0 bg-clip-text pb-[0.06em] text-transparent"
              initial={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
              whileInView={{ y: '0%', opacity: 1 }}
              viewport={{ once: true, margin: '0px 0px -5% 0px' }}
              transition={{ duration: 1, ease: EASE_OUT, delay: i * 0.035 }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <div className="relative border-t hairline bg-ink-950/80">
        <div className="container-x flex flex-col gap-4 py-6 text-xs text-mist-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TIS Tech Council · Tashkent International School</p>
          <p className="flex items-center gap-3 font-mono uppercase tracking-label">
            <Owl className="h-6 w-6" />
            Challenge <span className="text-volt-400">|</span> Explore <span className="text-volt-400">|</span> Connect
          </p>
        </div>
      </div>
    </footer>
  );
}
