'use client';
// Reveal.tsx — entrances with restraint.
//   <Sequence> + <Item>: the ONE orchestrated moment (the hero). Children rise in, 80 ms apart, on load.
//   <Reveal>: a single element that enters when scrolled into view. Use for 1–2 moments that matter, not every section.
import type {ReactNode} from 'react';
import {motion} from 'motion/react';
import {rise, staggered} from './motion';

type Props = {children: ReactNode; className?: string};

export function Sequence({children, className, gap = 0.08, delay = 0.1}: Props & {gap?: number; delay?: number}) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={staggered(gap, delay)}>
      {children}
    </motion.div>
  );
}

export function Item({children, className}: Props) {
  return (
    <motion.div className={className} variants={rise}>
      {children}
    </motion.div>
  );
}

export function Reveal({children, className, amount = 0.35}: Props & {amount?: number}) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{once: true, amount}} variants={rise}>
      {children}
    </motion.div>
  );
}
