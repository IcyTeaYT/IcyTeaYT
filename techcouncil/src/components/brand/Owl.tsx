import { motion, useReducedMotion } from 'motion/react';

/**
 * The TIS owl, drawn in the council's petal colours: petal-shaped wings in
 * teal and cyan, orange eyes and beak. Blinks every few seconds.
 */
export function Owl({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const blink = reduce
    ? undefined
    : { scaleY: [1, 1, 0.1, 1, 1], transition: { duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity } };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M14 12 L23 21 L41 21 L50 12 L52 36 C52 50 43 58 32 58 C21 58 12 50 12 36 Z" fill="#EEF1F5" />
      {/* Wings: two petals from the mark */}
      <path d="M12 56C12 45 18 37 27 35c0 11-6 19-15 21Z" fill="#07686E" />
      <path d="M52 56C52 45 46 37 37 35c0 11 6 19 15 21Z" fill="#0897B6" />
      <circle cx="24" cy="31" r="8" fill="#0A0F17" />
      <circle cx="40" cy="31" r="8" fill="#0A0F17" />
      <motion.g style={{ transformOrigin: '24px 31px' }} animate={blink}>
        <circle cx="24" cy="31" r="4" fill="#F29839" />
        <circle cx="25.3" cy="29.7" r="1.2" fill="#fff" />
      </motion.g>
      <motion.g style={{ transformOrigin: '40px 31px' }} animate={blink}>
        <circle cx="40" cy="31" r="4" fill="#F29839" />
        <circle cx="41.3" cy="29.7" r="1.2" fill="#fff" />
      </motion.g>
      <path d="M29.5 38 L34.5 38 L32 42.5 Z" fill="#951E34" />
    </svg>
  );
}
