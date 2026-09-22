import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Shared frame for every tool in the dashboard, so they all sit identically. */
export function Pane({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-5', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-ink-900">{title}</h2>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** A labelled number in the summary panels — "Present", "12 of 15". */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={cn(
          'tabular text-right text-sm font-semibold',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          tone === 'default' && 'text-ink-900',
        )}
      >
        {value}
        {hint ? <span className="ml-1.5 font-normal text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}
