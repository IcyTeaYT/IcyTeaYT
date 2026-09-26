import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';

interface Props {
  id: string;
  title: ReactNode;
  kicker?: ReactNode;
  /** Shown as a file path above the heading: ~/tech-council/<path>. */
  path?: string;
  className?: string;
}

/**
 * Section heading. It is visible from the first frame; scrolling into view only
 * settles it into place, so a missed observer can never hide a heading.
 */
export function SectionIntro({ id, title, kicker, path, className = '' }: Props) {
  const reduce = useReducedMotion();
  const settle = reduce ? {} : { initial: { y: 28 }, whileInView: { y: 0 } };
  return (
    <div className={`max-w-3xl ${className}`}>
      {path && (
        <p className="mb-5 font-mono text-[13px] text-fog-400">
          ~/tech-council/<span className="text-cyan-ink">{path}</span>
        </p>
      )}
      <motion.h2
        id={id}
        className="font-display text-[clamp(2.4rem,5.4vw,4.5rem)] font-semibold leading-[1] tracking-display text-paper"
        {...settle}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 1, ease: EASE_OUT }}
      >
        {title}
      </motion.h2>
      {kicker && <p className="mt-5 max-w-[52ch] text-[18px] leading-relaxed text-fog-200">{kicker}</p>}
    </div>
  );
}
