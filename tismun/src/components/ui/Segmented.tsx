import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Tailwind classes applied when this option is the selected one. */
  activeClassName?: string;
}

/**
 * A radio group that looks like a segmented control. Implemented with real
 * radio semantics so arrow keys move between options and screen readers
 * announce the group, which matters when a chair is taking roll by keyboard.
 */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  name: string;
  value: T | null;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 rounded-control border border-hairline bg-ink-50 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[6px] font-medium transition-all duration-200',
              size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
              selected
                ? cn('bg-surface shadow-card', option.activeClassName ?? 'text-ink-900')
                : 'text-muted hover:text-ink-700',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
