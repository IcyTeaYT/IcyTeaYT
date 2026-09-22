import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { playChime } from '@/lib/chime';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';
import { isPristine, type TimerState } from '@/lib/timer';
import { useTimer } from '@/lib/useTimer';
import { useChair } from '../context';
import type { TimerKey } from '../store';

const PHASE_COLOUR = {
  idle: 'text-ink-900',
  normal: 'text-ink-900',
  warning: 'text-warning',
  critical: 'text-danger',
  expired: 'text-danger animate-time-up',
} as const;

const PHASE_BAR = {
  idle: 'bg-ink-200',
  normal: 'bg-teal-500',
  warning: 'bg-warning',
  critical: 'bg-danger',
  expired: 'bg-danger',
} as const;

export function TimerDisplay({
  timer,
  size = 'lg',
  showProgress = true,
  onExpire,
}: {
  timer: TimerState;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onExpire?: () => void;
}) {
  const view = useTimer(timer, onExpire);

  const sizes = {
    sm: 'text-[32px]',
    md: 'text-[48px]',
    lg: 'text-[64px] sm:text-[76px]',
  } as const;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p
          className={cn(
            'tabular font-semibold leading-none tracking-tight',
            sizes[size],
            PHASE_COLOUR[view.phase],
          )}
          aria-live="off"
        >
          {formatClock(view.remainingMs)}
        </p>
        {view.expired ? (
          <span className="text-sm font-semibold uppercase tracking-label text-danger">Time</span>
        ) : null}
      </div>

      {showProgress ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className={cn('h-full transition-[width] duration-200 ease-linear', PHASE_BAR[view.phase])}
            style={{ width: `${Math.round(view.progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The clock plus its controls. Every timer in the dashboard is one of these,
 * so Start behaves identically whether it is the speakers' list or a caucus.
 */
export function TimerPanel({
  timerKey,
  timer,
  label,
  hint,
  size = 'lg',
  extra,
  className,
}: {
  timerKey: TimerKey;
  timer: TimerState;
  label: string;
  hint?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  extra?: ReactNode;
  className?: string;
}) {
  const toggle = useChair((state) => state.timerToggle);
  const reset = useChair((state) => state.timerReset);
  const adjust = useChair((state) => state.timerAdjust);
  const soundEnabled = useChair((state) => state.soundEnabled);

  const handleExpire = useCallback(() => {
    if (soundEnabled) playChime();
  }, [soundEnabled]);

  const running = timer.startedAt !== null;
  const pristine = isPristine(timer);

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4">
        <p className="label-micro">{label}</p>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>

      <div className="mt-3">
        <TimerDisplay timer={timer} size={size} onExpire={handleExpire} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant={running ? 'secondary' : 'primary'} onClick={() => toggle(timerKey)}>
          {running ? (
            <>
              <Pause size={15} strokeWidth={1.5} />
              Pause
            </>
          ) : (
            <>
              <Play size={15} strokeWidth={1.5} />
              {pristine ? 'Start' : 'Resume'}
            </>
          )}
        </Button>

        <Button variant="quiet" onClick={() => reset(timerKey)}>
          <RotateCcw size={15} strokeWidth={1.5} />
          Reset
        </Button>

        <div className="flex items-center gap-1.5">
          <Button variant="quiet" size="sm" onClick={() => adjust(timerKey, -30_000)}>
            <Minus size={13} strokeWidth={1.5} />
            30s
          </Button>
          <Button variant="quiet" size="sm" onClick={() => adjust(timerKey, 30_000)}>
            <Plus size={13} strokeWidth={1.5} />
            30s
          </Button>
          <Button variant="quiet" size="sm" onClick={() => adjust(timerKey, 60_000)}>
            <Plus size={13} strokeWidth={1.5} />
            1 min
          </Button>
        </div>

        {extra}
      </div>
    </div>
  );
}
