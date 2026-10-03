import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef } from 'react';

const TEXT =
  'We’re students who think our school deserves better tech, so we build it. Tools for teachers and students, projects that make campus run smoother, and a direct line for your ideas.';

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

/** Pinned while you scroll past it; the sentence lights up word by word. */
export function Statement({ id }: { id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const words = TEXT.split(' ');

  if (reduce) {
    return (
      <section id={id} data-surface="dark" aria-label="What we believe" className="bg-obsidian py-28 text-paper">
        <p className="container-x type-heading text-[clamp(2rem,4.4vw,3.5rem)]">{TEXT}</p>
      </section>
    );
  }

  return (
    <section id={id} ref={ref} data-surface="dark" aria-label="What we believe" className="relative h-[220vh] bg-obsidian text-paper">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <p className="container-x type-heading text-[clamp(2rem,4.4vw,3.5rem)]">
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
