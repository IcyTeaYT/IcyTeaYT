import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { MARQUEE_BOTTOM, MARQUEE_TOP } from '@/data/marquee';

function Row({ items, reverse, outline, duration }: { items: string[]; reverse?: boolean; outline?: boolean; duration: number }) {
  // Two identical halves; the track slides by exactly 50% for a seamless loop.
  const loop = [...items, ...items];
  return (
    <div className="group flex overflow-hidden mask-fade-x">
      <ul
        className={`flex w-max shrink-0 items-center ${reverse ? 'animate-marquee-rev' : 'animate-marquee'} group-hover:[animation-play-state:paused]`}
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {loop.map((item, i) => (
          <li key={i} className="flex items-center" aria-hidden={i >= items.length ? true : undefined}>
            <span
              className={`whitespace-nowrap px-6 font-display text-[clamp(1.75rem,4.5vw,3.5rem)] font-semibold tracking-tight sm:px-9 ${
                outline ? 'text-transparent [-webkit-text-stroke:1px_rgba(164,177,204,0.45)]' : 'text-white'
              }`}
            >
              {item}
            </span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-volt-400 sm:h-6 sm:w-6" aria-hidden>
              <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two counter-scrolling rows of ideas, tilted slightly and skewed further by scroll. */
export function Marquee() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [-2, -2] : [-4, 0]);
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['4%', '-4%']);

  return (
    <section ref={ref} aria-label="Ideas students have asked for" className="relative overflow-hidden py-16 sm:py-24">
      <motion.div style={{ rotate, x }} className="-mx-[5%] flex w-[110%] flex-col gap-3 border-y hairline bg-ink-900/60 py-6 sm:gap-5 sm:py-8">
        <Row items={MARQUEE_TOP} duration={38} />
        <Row items={MARQUEE_BOTTOM} reverse outline duration={46} />
      </motion.div>
    </section>
  );
}
