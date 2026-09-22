import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'teal' | 'neutral' | 'success' | 'warning' | 'danger' | 'outline';

const TONES: Record<Tone, string> = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  neutral: 'bg-ink-50 text-ink-600 border-ink-200',
  success: 'bg-success-soft text-success border-success-border',
  warning: 'bg-warning-soft text-warning border-warning-border',
  danger: 'bg-danger-soft text-danger border-danger-border',
  outline: 'bg-transparent text-muted border-hairline',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-label',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
