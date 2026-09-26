import { motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';
import type { ReactNode } from 'react';

interface Props {
  text: string;
  /** 'word' for headlines, 'char' for short wordmarks. */
  by?: 'word' | 'char';
  delay?: number;
  stagger?: number;
  /** Animate now (true) or when scrolled into view ('inView'). */
  play?: boolean | 'inView';
  className?: string;
  /** Per-word class, e.g. to gradient one word. */
  wordClass?: (word: string, index: number) => string | undefined;
}

/**
 * Text that rises out of a mask piece by piece. The full string is exposed to
 * assistive tech once; the animated pieces are aria-hidden.
 */
export function SplitText({ text, by = 'word', delay = 0, stagger, play = true, className, wordClass }: Props) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const step = stagger ?? (by === 'word' ? 0.07 : 0.028);
  let i = 0;

  const hidden: TargetAndTransition = reduce ? { opacity: 0 } : { y: '110%', rotate: 4, opacity: 0 };
  const shown: TargetAndTransition = reduce ? { opacity: 1 } : { y: '0%', rotate: 0, opacity: 1 };

  const animateProps =
    play === 'inView'
      ? { whileInView: 'shown', viewport: { once: true, margin: '0px 0px -12% 0px' } }
      : { animate: play ? 'shown' : 'hidden' };

  return (
    <motion.span className={className} initial="hidden" {...animateProps}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wi) => {
          const pieces: ReactNode =
            by === 'word' ? (
              <Piece key={wi} i={i++} className={wordClass?.(word, wi)} {...{ delay, step, hidden, shown }}>
                {word}
              </Piece>
            ) : (
              word.split('').map((ch, ci) => (
                <Piece key={ci} i={i++} {...{ delay, step, hidden, shown }}>
                  {ch}
                </Piece>
              ))
            );
          return (
            <span key={wi} className={`inline-block whitespace-nowrap ${by === 'char' ? (wordClass?.(word, wi) ?? '') : ''}`}>
              {pieces}
              {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          );
        })}
      </span>
    </motion.span>
  );
}

function Piece({
  children,
  className,
  i,
  delay,
  step,
  hidden,
  shown,
}: {
  children: ReactNode;
  className?: string;
  i: number;
  delay: number;
  step: number;
  hidden: TargetAndTransition;
  shown: TargetAndTransition;
}) {
  return (
    <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
      <motion.span
        className={`inline-block origin-bottom-left will-change-transform ${className ?? ''}`}
        variants={{
          hidden,
          shown: { ...shown, transition: { duration: 0.9, ease: EASE_OUT, delay: delay + i * step } },
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
