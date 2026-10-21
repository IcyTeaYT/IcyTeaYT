import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';
import { archPath, TIS } from '../brand/Shapes';
import { span } from '@/lib/motion';

const TEXT =
  'We’re students who think our school deserves better tech, so we build it. Tools for teachers and students, projects that make campus run smoother, and a direct line for your ideas.';

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  // Padded to 0..1, or lit words fall back to dim once the range is passed.
  const opacity = useTransform(progress, ...span(range, [0.28, 1]));
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

/**
 * The manual's nested lancet arches (6.2) in solid green and deep teal,
 * rising into the corner.
 */
function Arches({ rise }: { rise?: MotionValue<string> }) {
  const outer = archPath(400, 520);
  const inner = archPath(250, 340);
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 400 520"
      className="pointer-events-none absolute bottom-0 right-[-4vw] h-[28svh] w-auto overflow-visible sm:right-[3vw] md:h-[74svh]"
      style={{ y: rise }}
    >
      <path d={outer} fill={TIS.green} />
      <path d={inner} transform="translate(75 180)" fill={TIS.teal} />
    </motion.svg>
  );
}

/**
 * Pinned while you scroll past it; the sentence lights up word by word while
 * the arches rise into the corner.
 */
export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const rise = useTransform(scrollYProgress, [0, 0.85], ['60%', '0%']);
  const words = TEXT.split(' ');
  const type = 'container-x relative type-heading text-[clamp(2.1rem,4.6vw,3.75rem)] md:pr-[32%]';

  if (reduce) {
    return (
      <section data-surface="dark" aria-label="What we believe" className={`relative overflow-hidden py-32 text-paper bg-obsidian`}>
        <Arches />
        <p className={type}>{TEXT}</p>
      </section>
    );
  }

  return (
    <section ref={ref} data-surface="dark" aria-label="What we believe" className={`relative h-[220vh] text-paper bg-obsidian`}>
      {/* Phones set the text high and keep the arches small below it, so text never sits on them. */}
      <div className="sticky top-0 flex h-[100svh] items-start overflow-hidden pt-[17svh] md:items-center md:pt-0">
        <Arches rise={rise} />
        <p className={type}>
          <span className="sr-only">{TEXT}</span>
          <span aria-hidden>
            {words.map((w, i) => (
              <Word key={i} progress={scrollYProgress} range={[0.1 + (i / words.length) * 0.75, 0.1 + ((i + 1) / words.length) * 0.75]}>
                {w}
              </Word>
            ))}
          </span>
        </p>
      </div>
    </section>
  );
}
