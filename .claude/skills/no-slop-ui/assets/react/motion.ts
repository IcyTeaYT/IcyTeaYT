// motion.ts — one motion vocabulary for the whole site. Import these instead of inventing values per component.
import type {Transition, Variants} from 'motion/react';

export const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeInOut: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const springs = {
  /** Buttons, toggles, tabs: fast and crisp. */
  ui: {type: 'spring', stiffness: 420, damping: 32, mass: 0.8},
  /** Panels, drawers, larger moves. */
  soft: {type: 'spring', stiffness: 140, damping: 22},
} satisfies Record<string, Transition>;

/** Entrance: rise out of a soft blur. Used by <Sequence>/<Item> and <Reveal>. */
export const rise: Variants = {
  hidden: {opacity: 0, y: 18, filter: 'blur(10px)'},
  show: {opacity: 1, y: 0, filter: 'blur(0px)', transition: {duration: 1, ease}},
};

export const staggered = (gap = 0.08, delay = 0.1): Variants => ({
  hidden: {},
  show: {transition: {staggerChildren: gap, delayChildren: delay}},
});
