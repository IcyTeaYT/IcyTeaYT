import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';

interface Props {
  id: string;
  title: ReactNode;
  /** Body copy shown in the right column on wide screens. */
  children?: ReactNode;
  className?: string;
}

/**
 * Two-column section opener: a large light heading on the left, body copy on
 * the right. The heading is visible from the first frame; entering the
 * viewport only settles it into place.
 */
export function SectionIntro({ id, title, children, className = '' }: Props) {
  const reduce = useReducedMotion();
  return (
    <div className={`grid gap-8 md:grid-cols-2 md:gap-16 ${className}`}>
      <motion.h2
        id={id}
        className="type-heading text-[clamp(2.25rem,4.4vw,3.25rem)]"
        initial={reduce ? false : { y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 1, ease: EASE_OUT }}
      >
        {title}
      </motion.h2>
      {children && <div className="flex flex-col gap-[30px] text-body-lg md:pt-2">{children}</div>}
    </div>
  );
}
