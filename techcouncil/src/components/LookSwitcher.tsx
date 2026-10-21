import { LOOK, LOOKS } from '@/lib/look';

/** Preview only: switch between the colour treatments. Hidden on the live site. */
export function LookSwitcher() {
  if (window.location.hostname === 'tistechcouncil.pages.dev') return null;
  return (
    <nav aria-label="Compare looks" className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-pill border border-line-dark bg-obsidian/90 p-1 text-body-sm text-fog shadow-lg backdrop-blur">
      <span className="px-3 text-caption uppercase tracking-[0.12em]">Look</span>
      {LOOKS.map((l) => (
        <a
          key={l.id}
          href={`?look=${l.id}`}
          aria-current={l.id === LOOK ? 'page' : undefined}
          className={`rounded-pill px-4 py-1.5 transition-colors ${l.id === LOOK ? 'bg-paper text-obsidian' : 'hover:text-paper'}`}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
