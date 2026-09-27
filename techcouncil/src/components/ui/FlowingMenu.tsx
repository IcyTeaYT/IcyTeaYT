import { motion, useAnimationControls } from 'motion/react';
import type { PointerEvent } from 'react';

interface Item {
  title: string;
  body: string;
}

/**
 * A list of large rows. Hovering a row slides a black band in from the edge
 * the cursor entered by, carrying a scrolling repeat of the row's title; it
 * leaves through the edge the cursor exits by. Mouse only; on touch the rows
 * are simply static text.
 */
function Row({ item }: { item: Item }) {
  const band = useAnimationControls();
  const edge = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY - r.top < r.height / 2 ? '-101%' : '101%';
  };
  const enter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    band.set({ y: edge(e) });
    void band.start({ y: '0%', transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } });
  };
  const leave = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    void band.start({ y: edge(e), transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } });
  };
  const repeat = Array.from({ length: 8 }, () => item.title);

  return (
    <li className="relative overflow-hidden border-t border-line-light last:border-b" onPointerEnter={enter} onPointerLeave={leave}>
      <div className="grid gap-3 py-8 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-10 md:py-10">
        <h3 className="type-heading text-[clamp(1.9rem,3.6vw,3rem)]">{item.title}</h3>
        <p className="text-body text-graphite">{item.body}</p>
      </div>
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden bg-obsidian text-paper" initial={{ y: '101%' }} animate={band}>
        <div className="flex w-max animate-marquee" style={{ ['--marquee-duration' as string]: '18s' }}>
          {[...repeat, ...repeat].map((t, i) => (
            <span key={i} className="type-heading flex items-center whitespace-nowrap px-8 text-[clamp(1.9rem,3.6vw,3rem)]">
              {t}
              <span className="ml-16 h-2 w-2 rounded-full bg-petal" />
            </span>
          ))}
        </div>
      </motion.div>
    </li>
  );
}

export function FlowingMenu({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((it) => (
        <Row key={it.title} item={it} />
      ))}
    </ul>
  );
}
