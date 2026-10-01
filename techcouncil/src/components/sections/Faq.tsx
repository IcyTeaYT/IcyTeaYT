import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import { EASE_OUT } from '@/lib/motion';
import { FAQ } from '@/data/copy';

const QUESTIONS = FAQ;

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-t border-line-light last:border-b">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-6 py-6 text-left text-subheading font-normal"
        >
          {q}
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-light" aria-hidden>
            <span className="absolute h-px w-3.5 bg-current" />
            <motion.span className="absolute h-3.5 w-px bg-current" animate={{ scaleY: open ? 0 : 1 }} transition={{ duration: 0.3 }} />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <p className="max-w-[60ch] pb-8 text-body-lg text-graphite">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Faq() {
  return (
    <section id="faq" data-surface="light" aria-labelledby="faq-title" className="bg-paper py-20 text-obsidian sm:py-28">
      <div className="container-x grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 id="faq-title" className="type-heading text-[clamp(2.25rem,4.4vw,3.25rem)]">
          Questions
        </h2>
        <ul>
          {QUESTIONS.map((x) => (
            <Item key={x.q} {...x} />
          ))}
        </ul>
      </div>
    </section>
  );
}
