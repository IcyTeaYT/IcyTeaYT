import { CONFERENCE } from '@/config/conference';
import { cn } from '@/lib/cn';

/**
 * The host school's lockup: always secondary to the TISMUN mark, always
 * smaller, never on its own.
 *
 * The TIS logo is a PNG with a baked-in white background, so — like the TISMUN
 * mark — it is blended into light surfaces with `mix-blend-multiply` rather
 * than sitting in a visible white square. It is never placed on a dark ground.
 */
export function HostedBy({
  variant = 'full',
  className,
}: {
  /** 'full' says "Hosted by …"; 'compact' is the footer's name-only form. */
  variant?: 'full' | 'compact';
  className?: string;
}) {
  const compact = variant === 'compact';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src="/tis-logo.png"
        alt=""
        aria-hidden="true"
        decoding="async"
        className={cn('block w-auto object-contain mix-blend-multiply', compact ? 'h-6' : 'h-8')}
      />
      <span className={cn('leading-tight text-muted', compact ? 'text-xs' : 'text-[13px]')}>
        {compact ? (
          CONFERENCE.host
        ) : (
          <>
            <span className="block text-[11px] uppercase tracking-label text-ink-400">Hosted by</span>
            {CONFERENCE.host}
          </>
        )}
      </span>
    </span>
  );
}
