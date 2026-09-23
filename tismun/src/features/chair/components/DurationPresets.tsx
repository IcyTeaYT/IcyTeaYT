import { useState } from 'react';
import { UNMODERATED_PRESETS_SEC } from '@/config/rules';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';
import { DurationInput } from './DurationInput';

/**
 * The durations a chair actually uses, one tap each — with the exact minutes
 * and seconds a step away for the delegate who moves something unusual.
 */
export function DurationPresets({
  label,
  valueSec,
  onChange,
  presetsSec = UNMODERATED_PRESETS_SEC,
}: {
  label: string;
  valueSec: number;
  onChange: (seconds: number) => void;
  presetsSec?: readonly number[];
}) {
  const [custom, setCustom] = useState(() => !presetsSec.includes(valueSec));

  return (
    <div className="space-y-2">
      <span className="label-micro block">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {presetsSec.map((seconds) => {
          const selected = !custom && valueSec === seconds;
          return (
            <button
              key={seconds}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCustom(false);
                onChange(seconds);
              }}
              className={cn(
                'h-10 min-w-[64px] rounded-control border px-3 text-sm font-medium transition-colors duration-150',
                selected
                  ? 'border-teal-500 bg-teal-50 text-teal-800'
                  : 'border-hairline bg-surface text-ink-700 hover:border-ink-300',
              )}
            >
              {seconds % 60 === 0 ? `${seconds / 60} min` : formatClock(seconds * 1000)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className={cn(
            'h-10 rounded-control border px-3 text-sm font-medium transition-colors duration-150',
            custom
              ? 'border-teal-500 bg-teal-50 text-teal-800'
              : 'border-hairline bg-surface text-ink-700 hover:border-ink-300',
          )}
        >
          Other
        </button>
      </div>
      {custom ? <DurationInput label="Exact time" valueSec={valueSec} onChange={onChange} /> : null}
    </div>
  );
}
