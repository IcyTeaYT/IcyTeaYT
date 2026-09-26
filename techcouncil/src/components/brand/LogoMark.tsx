import { motion } from 'motion/react';
import { LOGO_COLORS, LOGO_PATHS, LOGO_VIEWBOX } from './logoPaths';
import { EASE_OUT } from '@/lib/motion';

interface Props {
  className?: string;
  /** Petals bloom in one after another. */
  animate?: boolean;
  title?: string;
}

const PETALS = ['orange', 'red', 'cyan', 'teal'] as const;

export function LogoMark({ className, animate = false, title }: Props) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {PETALS.map((k, i) => (
        <motion.path
          key={k}
          d={LOGO_PATHS[k]}
          fill={LOGO_COLORS[k]}
          style={{ transformOrigin: '296px 302px', transformBox: 'view-box' }}
          initial={animate ? { scale: 0.4, opacity: 0, rotate: -30 } : false}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.7, delay: animate ? 0.05 + i * 0.07 : 0, ease: EASE_OUT }}
        />
      ))}
      <motion.path
        d={LOGO_PATHS.navy}
        fill="currentColor"
        style={{ transformOrigin: '296px 302px', transformBox: 'view-box' }}
        initial={animate ? { scale: 0.7, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: animate ? 0.25 : 0, ease: EASE_OUT }}
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <LogoMark className="h-7 w-7 shrink-0 text-white" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-tight text-white">TIS Tech Council</span>
      </span>
    </span>
  );
}
