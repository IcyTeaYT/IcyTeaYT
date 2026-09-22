import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-hairline bg-surface shadow-card', className)} {...props} />;
}

export function CardHeader({
  label,
  title,
  action,
  className,
}: {
  label?: string;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-hairline px-5 py-4', className)}>
      <div className="min-w-0">
        {label ? <p className="label-micro mb-1.5">{label}</p> : null}
        {typeof title === 'string' ? (
          <h2 className="truncate font-serif text-lg text-ink-900">{title}</h2>
        ) : (
          title
        )}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}
