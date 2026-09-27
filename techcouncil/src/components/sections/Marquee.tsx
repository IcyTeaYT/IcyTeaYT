import { MARQUEE_TOP, MARQUEE_BOTTOM } from '@/data/marquee';

/** A quiet strip of tech ideas for TIS, scrolling between the hero and About. */
export function Marquee() {
  const items = [...MARQUEE_TOP, ...MARQUEE_BOTTOM];
  const loop = [...items, ...items];
  return (
    <section data-surface="dark" aria-label="Tech ideas for TIS" className="border-y border-line-dark bg-obsidian py-6 text-paper">
      <div className="group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <ul className="flex w-max shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused]" style={{ ['--marquee-duration' as string]: '70s' }}>
          {loop.map((item, i) => (
            <li key={i} className="flex items-center" aria-hidden={i >= items.length ? true : undefined}>
              <span className="whitespace-nowrap px-8 text-subheading font-light">{item}</span>
              <span className="h-1 w-1 rounded-full bg-fog" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
