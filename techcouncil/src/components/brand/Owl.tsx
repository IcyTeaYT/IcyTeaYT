import { motion, useReducedMotion } from 'motion/react';

/** Geometric take on the TIS owl mascot. Blinks every few seconds. */
export function Owl({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const blink = reduce
    ? undefined
    : { scaleY: [1, 1, 0.1, 1, 1], transition: { duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity } };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="owl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B91FF" />
          <stop offset="1" stopColor="#1F56D6" />
        </linearGradient>
      </defs>
      <path d="M14 14 L22 22 L42 22 L50 14 L52 36 C52 50 43 58 32 58 C21 58 12 50 12 36 Z" fill="url(#owl-body)" />
      <path d="M22 44 C26 48 38 48 42 44 C40 52 24 52 22 44 Z" fill="#8AB2FF" opacity="0.5" />
      <circle cx="24" cy="32" r="8.5" fill="#04060C" />
      <circle cx="40" cy="32" r="8.5" fill="#04060C" />
      <motion.g style={{ transformOrigin: '24px 32px' }} animate={blink}>
        <circle cx="24" cy="32" r="4.2" fill="#4DE8FA" />
        <circle cx="25.4" cy="30.6" r="1.3" fill="#fff" />
      </motion.g>
      <motion.g style={{ transformOrigin: '40px 32px' }} animate={blink}>
        <circle cx="40" cy="32" r="4.2" fill="#4DE8FA" />
        <circle cx="41.4" cy="30.6" r="1.3" fill="#fff" />
      </motion.g>
      <path d="M29.5 38 L34.5 38 L32 42.5 Z" fill="#F29839" />
    </svg>
  );
}
