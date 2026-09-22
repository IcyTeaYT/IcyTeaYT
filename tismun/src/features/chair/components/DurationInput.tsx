import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Minutes and seconds as two small number fields. A single "seconds" box is
 * quicker to build and slower to use: motions are written as 10:00 and 1:30,
 * so that is how the chair should be able to type them.
 */
export function DurationInput({
  valueSec,
  onChange,
  label,
  className,
  max = 180 * 60,
}: {
  valueSec: number;
  onChange: (seconds: number) => void;
  label: string;
  className?: string;
  max?: number;
}) {
  const id = useId();
  const minutes = Math.floor(valueSec / 60);
  const seconds = valueSec % 60;

  const commit = (nextMinutes: number, nextSeconds: number) => {
    const total = Math.max(0, Math.min(max, nextMinutes * 60 + nextSeconds));
    onChange(total);
  };

  const box =
    'h-10 w-16 rounded-control border border-hairline bg-surface px-2 text-center text-sm tabular ' +
    'text-ink-900 transition-colors duration-200 hover:border-ink-300 focus:border-teal-500 ' +
    'focus:outline-none focus:ring-2 focus:ring-teal-500/20';

  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="label-micro block" id={`${id}-label`}>
        {label}
      </span>
      <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-label`}>
        <input
          type="number"
          min={0}
          max={Math.floor(max / 60)}
          value={minutes}
          onChange={(event) => commit(Number(event.target.value) || 0, seconds)}
          className={box}
          aria-label={`${label} minutes`}
        />
        <span className="text-sm font-medium text-ink-400">min</span>
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={seconds}
          onChange={(event) => commit(minutes, Math.min(59, Number(event.target.value) || 0))}
          className={box}
          aria-label={`${label} seconds`}
        />
        <span className="text-sm font-medium text-ink-400">sec</span>
      </div>
    </div>
  );
}
