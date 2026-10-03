import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * A whip pan into a section: the camera swings in from the side, fast, with a
 * smear of motion blur, and settles. It plays once, on a fixed duration, so a
 * slow or fast scroll gets the same snap. Reduced motion: no move.
 */
export function WhipPan({ children, from = 'right', className }: { children: ReactNode; from?: 'left' | 'right'; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const dir = from === 'right' ? 1 : -1;
  return (
    <motion.div
      className={className}
      initial={{ x: `${dir * 38}vw`, skewX: dir * -7, opacity: 0, filter: 'blur(14px)' }}
      whileInView={{ x: '0vw', skewX: 0, opacity: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      // Starts as soon as the section's top clears the lower quarter of the screen,
      // however tall the section is.
      viewport={{ once: true, amount: 0, margin: '0px 0px -25% 0px' }}
      transition={{
        duration: 0.95,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.35, ease: 'linear' },
        filter: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
      }}
    >
      {children}
    </motion.div>
  );
}
