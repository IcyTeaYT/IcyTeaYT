import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { emergencySession } from '@/config/emergency';
import { cn } from '@/lib/cn';
import { serverNow, useConferenceStatus } from '@/store/conferenceStatus';

function parts(ms: number): { days: number; clock: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return { days, clock: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

/**
 * Time left until the Emergency Session topic is released, counted on the
 * server's clock. The countdown reaching zero does not release anything by
 * itself: the server does, and the next check picks it up.
 */
export function ReleaseCountdown({ className }: { className?: string }) {
  const releaseAt = useConferenceStatus((state) => state.status?.releaseAt ?? null);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (releaseAt === null) return null;
  const left = releaseAt - now;
  if (left <= 0) return <span className={cn('text-sm text-muted', className)}>Releasing now…</span>;

  const { days, clock } = parts(left);
  return (
    <span className={cn('tabular text-sm font-semibold text-ink-900', className)} aria-live="off">
      {days > 0 ? `${days} ${days === 1 ? 'day' : 'days'}, ` : ''}
      {clock}
    </span>
  );
}

/** The locked state: what will be released, when, and how long there is to go. */
export function LockedTopic({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-teal-200 bg-teal-50/40',
        compact ? 'px-4 py-3' : 'px-5 py-4',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-teal-50 text-teal-700">
          <Lock size={15} strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-ink-800">
            Topic and background paper will be released on {emergencySession.releaseLabel}.
          </p>
          <p className="mt-1 text-xs text-muted">
            Released in <ReleaseCountdown className="text-xs" />
          </p>
        </div>
      </div>
    </div>
  );
}
