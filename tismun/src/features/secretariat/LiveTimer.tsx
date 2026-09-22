import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';
import { phaseOf, type TimerState } from '@/lib/timer';
import { useTimer } from '@/lib/useTimer';
import { useLocalisedTimer } from '@/features/live/useLive';

const PHASE_COLOUR = {
  idle: 'text-ink-400',
  normal: 'text-ink-900',
  warning: 'text-warning',
  critical: 'text-danger',
  expired: 'text-danger animate-time-up',
} as const;

/**
 * A committee's clock as seen from outside the room.
 *
 * The timer arrives as state rather than as a number of seconds, so this ticks
 * on its own between polls — two-second polling gives a smooth countdown, not
 * a clock that jumps every two seconds.
 */
export function LiveTimer({
  timer,
  size = 'md',
  className,
}: {
  timer: TimerState | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const localised = useLocalisedTimer(timer);
  const view = useTimer(localised ?? { durationMs: 0, startedAt: null, elapsedMs: 0 });
  const phase = localised ? phaseOf(localised, Date.now()) : 'idle';

  const sizes = { sm: 'text-[20px]', md: 'text-[30px]', lg: 'text-[44px]' } as const;

  if (!localised) {
    return (
      <p className={cn('tabular font-semibold leading-none text-ink-200', sizes[size], className)}>
        --:--
      </p>
    );
  }

  return (
    <p
      className={cn(
        'tabular font-semibold leading-none tracking-tight',
        sizes[size],
        PHASE_COLOUR[phase],
        className,
      )}
    >
      {formatClock(view.remainingMs)}
    </p>
  );
}
