import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 px-5 py-10 text-left', className)}>
      {Icon ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink-50 text-ink-400">
          <Icon size={18} strokeWidth={1.5} />
        </span>
      ) : null}
      <div className="space-y-1.5">
        <h3 className="font-serif text-base text-ink-900">{title}</h3>
        {body ? <p className="max-w-prose text-sm leading-relaxed text-muted">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
