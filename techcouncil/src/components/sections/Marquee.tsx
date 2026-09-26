import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { MARQUEE_BOTTOM, MARQUEE_TOP } from '@/data/marquee';

const PETALS = ['#F29839', '#E0647C', '#3FB8AF', '#4CC6E2'];

function Row({ items, reverse, outline, duration }: { items: string[]; reverse?: boolean; outline?: boolean; duration: number }) {
  // Two identical halves; the track slides by exactly 50% for a seamless loop.
  const loop = [...items, ...items];
  return (
    <div className="group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <ul
        className={`flex w-max shrink-0 items-center ${reverse ? 'animate-marquee-rev' : 'animate-marquee'} group-hover:[animation-play-state:paused]`}
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {loop.map((item, i) => (
          <li key={i} className="flex items-center" aria-hidden={i >= items.length ? true : undefined}>
            <span
              className={`whitespace-nowrap px-6 sm:px-9 ${
                outline
                  ? 'font-mono text-[clamp(1rem,2vw,1.35rem)] text-fog-300'
                  : 'font-display text-[clamp(1.75rem,4.5vw,3.5rem)] font-semibold tracking-display text-paper'
              }`}
            >
              {outline ? `// ${item.toLowerCase()}` : item}
            </span>
            {!outline && (
              <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden>
                <path d="M2 30C2 14.5 14.5 2 30 2c0 15.5-12.5 28-28 28Z" fill={PETALS[i % PETALS.length]} />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ideas the council could build: a big row of names and a quieter row in code comments. */
export function Marquee() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [-2, -2] : [-3.5, 0]);
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['3%', '-3%']);

  return (
    <section ref={ref} aria-label="Tech ideas for TIS" className="relative overflow-hidden py-14 sm:py-20">
      <motion.div style={{ rotate, x }} className="-mx-[5%] flex w-[110%] flex-col gap-3 border-y rule bg-night-800/70 py-6 sm:gap-5 sm:py-8">
        <Row items={MARQUEE_TOP} duration={40} />
        <Row items={MARQUEE_BOTTOM} reverse outline duration={52} />
      </motion.div>
    </section>
  );
}
