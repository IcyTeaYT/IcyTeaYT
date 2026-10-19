import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { span } from '@/lib/motion';
import { MISSION as MISSION_COPY } from '@/data/copy';

const { line: MISSION, support: SUPPORT } = MISSION_COPY;

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, ...span(range, [0.16, 1]));
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

/**
 * Pinned for two screens of scroll. The camera pushes in on the mission line
 * and pulls focus onto it, the words light up one by one, then the
 * supporting line settles in underneath.
 */
export function Mission() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const scale = useTransform(p, ...span([0, 0.4], [0.84, 1]), { ease: (t) => 1 - Math.pow(1 - t, 3) });
  const blurPx = useTransform(p, ...span([0, 0.3], [10, 0]));
  const filter = useMotionTemplate`blur(${blurPx}px)`;
  const supportOpacity = useTransform(p, ...span([0.64, 0.8], [0, 1]));
  const supportY = useTransform(p, ...span([0.64, 0.8], [24, 0]));
  const words = MISSION.split(' ');

  if (reduce) {
    return (
      <section id="mission" data-surface="dark" aria-labelledby="mission-title" className="bg-obsidian py-28 text-paper">
        <div className="container-x">
          <h2 id="mission-title" className="type-display max-w-[16ch] text-[clamp(2.75rem,6.4vw,5.75rem)]">
            {MISSION}
          </h2>
          <p className="mt-10 max-w-[46ch] text-body-lg text-fog">{SUPPORT}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="mission" ref={ref} data-surface="dark" aria-labelledby="mission-title" className="relative h-[300vh] bg-obsidian text-paper">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <motion.div className="container-x" style={{ scale, filter, originX: 0.2, originY: 0.5 }}>
          <h2 id="mission-title" className="type-display max-w-[16ch] text-[clamp(2.75rem,6.4vw,5.75rem)]">
            <span className="sr-only">{MISSION}</span>
            <span aria-hidden>
              {words.map((w, i) => (
                <Word key={i} progress={p} range={[0.14 + (i / words.length) * 0.46, 0.14 + ((i + 1) / words.length) * 0.46]}>
                  {w}
                </Word>
              ))}
            </span>
          </h2>
          <motion.p className="mt-10 max-w-[46ch] text-body-lg text-fog" style={{ opacity: supportOpacity, y: supportY }}>
            {SUPPORT}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
