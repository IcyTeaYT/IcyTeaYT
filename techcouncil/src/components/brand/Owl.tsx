import { motion, useReducedMotion } from 'motion/react';

/** The TIS owl, drawn in one colour (currentColor). Blinks every few seconds. */
export function Owl({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const blink = reduce
    ? undefined
    : { scaleY: [1, 1, 0.1, 1, 1], transition: { duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity } };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M14 14 L22 22 L42 22 L50 14 L52 36 C52 50 43 58 32 58 C21 58 12 50 12 36 Z" fill="currentColor" />
      <circle cx="24" cy="32" r="8" fill="#F5F5F5" />
      <circle cx="40" cy="32" r="8" fill="#F5F5F5" />
      <motion.circle cx="24" cy="32" r="3.6" fill="currentColor" style={{ transformOrigin: '24px 32px' }} animate={blink} />
      <motion.circle cx="40" cy="32" r="3.6" fill="currentColor" style={{ transformOrigin: '40px 32px' }} animate={blink} />
      <path d="M29.5 41 L34.5 41 L32 45 Z" fill="#F5F5F5" />
    </svg>
  );
}
