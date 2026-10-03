import { featuredProject } from '@/data/projects';
import { getPhase, useNow } from './sections/Countdown';
import { useSmoothScroll } from '@/lib/smoothScroll';

export const BAR_HEIGHT = 36;

/** Full-bleed petal-gradient strip at the very top of the page. */
export function AnnouncementBar({ onClose }: { onClose: () => void }) {
  const now = useNow(60_000);
  const { scrollTo } = useSmoothScroll();
  const p = featuredProject;
  if (!p?.event) return null;
  const phase = getPhase(now, p.event.start, p.event.end);
  if (phase === 'after') return null;
  const days = Math.max(0, Math.ceil((Date.parse(p.event.start) - now) / 86_400_000));
  const text =
    phase === 'during'
      ? `${p.name} 2026 is happening now`
      : `${p.name} 2026 · ${p.date} · ${days === 1 ? '1 day' : `${days} days`} to go`;

  return (
    <div className="relative z-[55] flex items-center justify-center bg-petal px-10 text-caption text-paper" style={{ height: BAR_HEIGHT }} data-chrome>
      {/* Straight to the event's own site when it has one, else to it on this page. */}
      <a
        href={p.link || '#projects'}
        {...(p.link
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                scrollTo('#projects');
              },
            })}
        className="flex min-h-[44px] items-center truncate underline-offset-4 hover:underline"
      >
        {text}
        {p.link && <span aria-hidden> ↗</span>}
      </a>
      <button type="button" onClick={onClose} aria-label="Dismiss announcement" className="absolute right-2 flex h-9 w-9 items-center justify-center text-paper/90 hover:text-paper">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
