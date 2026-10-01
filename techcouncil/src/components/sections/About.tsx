import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { FlowingMenu } from '../ui/FlowingMenu';
import { EASE_OUT } from '@/lib/motion';
import { founders } from '@/data/founders';
import { projects } from '@/data/projects';
import { WORK } from '@/data/copy';


function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration: 1.4, ease: EASE_OUT, onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to, reduce]);
  return (
    <span ref={ref} className="tabular">
      {v}
    </span>
  );
}

export function About() {
  const stats = [
    { n: founders.length, label: 'Student founders' },
    { n: projects.filter((p) => p.status === 'live').length, label: 'Platform live' },
    { n: projects.filter((p) => p.status === 'pipeline').length, label: 'In the pipeline' },
  ].filter((s) => s.n > 0);

  return (
    <section id="about" data-surface="light" aria-labelledby="about-title" className="bg-paper py-20 text-obsidian sm:py-28">
      <div className="container-x">
        <SectionIntro id="about-title" title="We build the tech our campus is missing.">
          <p>
            The TIS Tech Council is a group of students at Tashkent International School who think our school deserves better tools, so we
            make them.
          </p>
          <p className="text-graphite">
            We design, build and run projects for students and teachers, and we start from what people at TIS actually ask for.
          </p>
        </SectionIntro>

        <div className="mt-20">
          <FlowingMenu items={WORK} />
        </div>

        <dl className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="order-2 mt-2 text-body-sm text-graphite">{s.label}</dt>
              <dd className="type-display text-[clamp(3.5rem,7vw,5.5rem)]">
                <Counter to={s.n} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
