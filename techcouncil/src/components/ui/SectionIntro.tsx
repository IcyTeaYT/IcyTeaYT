import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';
import { Eyebrow } from '../brand/Shapes';

interface Props {
  id: string;
  title: ReactNode;
  /** Body copy shown in the right column on wide screens. */
  children?: ReactNode;
  className?: string;
  /** Small all-caps label above the heading. */
  eyebrow?: string;
  /** The surface the intro sits on, for the label's colours. */
  tone?: 'light' | 'dark';
}

/**
 * Two-column section opener: a large light heading on the left, body copy on
 * the right. The heading is visible from the first frame; entering the
 * viewport only settles it into place.
 */
export function SectionIntro({ id, title, children, className = '', eyebrow, tone = 'light' }: Props) {
  const reduce = useReducedMotion();
  return (
    <div className={`grid gap-8 md:grid-cols-2 md:gap-16 ${className}`}>
      <motion.div initial={reduce ? false : { y: 24 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0 }} transition={{ duration: 1, ease: EASE_OUT }}>
        {eyebrow && (
          <div className="mb-5">
            <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          </div>
        )}
        <h2 id={id} className="type-heading text-[clamp(2.4rem,4.8vw,3.75rem)]">
          {title}
        </h2>
      </motion.div>
      {children && <div className="flex flex-col gap-[30px] text-body-lg md:pt-2">{children}</div>}
    </div>
  );
}
