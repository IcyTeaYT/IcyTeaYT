import { cn } from '@/lib/cn';

/** Credit to the student team that built and runs the site. */
export function PoweredBy({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src="/tech-council-mark.svg"
        alt=""
        aria-hidden="true"
        decoding="async"
        className="block h-7 w-7 shrink-0"
      />
      <span className="text-[13px] leading-tight text-muted">
        <span className="block text-[11px] uppercase tracking-label text-ink-400">Powered by</span>
        TIS Tech Council
      </span>
    </span>
  );
}
