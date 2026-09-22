import { CalendarDays, CheckCircle2, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { conferencePhase } from '@/lib/conferenceDates';
import { cn } from '@/lib/cn';

/**
 * Where we are relative to the conference: counting down, mid-conference, or
 * done. Recomputed every minute so a page left open overnight rolls over to
 * the next day on its own — the phase is derived in Tashkent time, so the
 * rollover happens when the conference says it does.
 */
export function ConferenceCountdown({ className }: { className?: string }) {
  const [phase, setPhase] = useState(() => conferencePhase());

  useEffect(() => {
    const id = window.setInterval(() => setPhase(conferencePhase()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const tone =
    phase.kind === 'during'
      ? 'border-teal-500 bg-teal-500 text-white'
      : phase.kind === 'before'
        ? 'border-teal-200 bg-teal-50 text-teal-800'
        : 'border-hairline bg-surface text-muted';

  const Icon = phase.kind === 'during' ? Radio : phase.kind === 'before' ? CalendarDays : CheckCircle2;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium',
        tone,
        className,
      )}
    >
      <Icon size={14} strokeWidth={1.5} className="shrink-0" />
      {phase.label}
      {phase.kind === 'during' ? (
        <span className="text-white/70">of {phase.totalDays}</span>
      ) : null}
    </span>
  );
}
