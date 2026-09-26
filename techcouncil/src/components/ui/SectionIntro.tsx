import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';

interface Props {
  index: string;
  label: string;
  title: ReactNode;
  kicker?: ReactNode;
  align?: 'left' | 'center';
  /** 'mask' wipes the title in from the left; 'rise' lifts it with blur. */
  variant?: 'mask' | 'rise';
  id?: string;
  size?: 'lg' | 'md';
}

/** Numbered section header: "01 — About" eyebrow, big title, optional kicker. */
export function SectionIntro({ index, label, title, kicker, align = 'left', variant = 'rise', id, size = 'lg' }: Props) {
  const reduce = useReducedMotion();
  const viewport = { once: true, margin: '0px 0px -15% 0px' } as const;
  const titleMotion = reduce
    ? { initial: { opacity: 0 }, whileInView: { opacity: 1 } }
    : variant === 'mask'
      ? {
          initial: { clipPath: 'inset(0 100% 0 0)', x: -24 },
          whileInView: { clipPath: 'inset(0 0% 0 0)', x: 0 },
        }
      : {
          initial: { opacity: 0, y: 40, filter: 'blur(12px)' },
          whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
        };

  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <motion.p
        className="eyebrow"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <span className="text-mist-400">{index}</span>
        <span className="h-px w-6 bg-volt-400/60" />
        {label}
      </motion.p>
      <motion.h2
        id={id}
        className={`mt-5 font-display ${size === 'lg' ? 'text-[clamp(2.4rem,6.4vw,5rem)]' : 'text-[clamp(2.4rem,4.8vw,4.25rem)]'} font-semibold leading-[0.98] tracking-tightest text-white`}
        {...titleMotion}
        viewport={viewport}
        transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.05 }}
      >
        {title}
      </motion.h2>
      {kicker && (
        <motion.p
          className={`mt-6 max-w-xl text-[17px] leading-relaxed text-mist-300 ${align === 'center' ? 'mx-auto' : ''}`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
        >
          {kicker}
        </motion.p>
      )}
    </div>
  );
}
