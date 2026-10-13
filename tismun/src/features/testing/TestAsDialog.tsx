import { CalendarClock, Loader2, Siren } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { isEmergency } from '@/config/emergency';
import { dataSource, type TestOptions } from '@/data/source';
import { cn } from '@/lib/cn';

/**
 * The owner picks a delegate's seat and sees the whole site as that delegate:
 * home page, committee, papers, resolution. Optionally as on Day 2 with the
 * Emergency Session topic out — shown to the owner alone.
 */
export function TestAsDialog({
  open,
  onClose,
  committeeId: startIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Open on this committee (as on Day 2, for the Emergency Session). */
  committeeId?: string;
}) {
  const [data, setData] = useState<TestOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committeeId, setCommitteeId] = useState('');
  const [country, setCountry] = useState('');
  const [day2, setDay2] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setError(null);
    dataSource
      .getTestOptions()
      .then((next) => {
        if (!live) return;
        setData(next);
        const wanted = startIn ?? next.seat?.committeeId;
        const start = next.options.find((option) => option.committeeId === wanted) ?? next.options[0];
        const same = Boolean(next.seat && start?.committeeId === next.seat.committeeId);
        setCommitteeId(start?.committeeId ?? '');
        setCountry(same && next.seat ? next.seat.country : (start?.countries[0] ?? ''));
        setDay2(same && next.seat ? next.seat.day2 : isEmergency(start?.committeeId));
      })
      .catch(() => live && setError('The list of delegates could not be loaded. Try again.'));
    return () => {
      live = false;
    };
  }, [open, startIn]);

  const committee = useMemo(() => data?.options.find((option) => option.committeeId === committeeId) ?? null, [data, committeeId]);

  const pickCommittee = (id: string) => {
    setCommitteeId(id);
    setCountry(data?.options.find((option) => option.committeeId === id)?.countries[0] ?? '');
    // The Emergency Session only has something to show once its topic is out.
    if (isEmergency(id)) setDay2(true);
  };

  const start = async () => {
    if (!committeeId || !country) return;
    setBusy(true);
    setError(null);
    try {
      await dataSource.startTest({ committeeId, country, day2 });
      // Start afresh, on the delegate's home page, as them.
      window.location.assign('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Testing could not start.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="See the site as a delegate"
      description="Pick a delegate. The whole site then looks exactly as it does for them, until you press Stop testing."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy || !committeeId || !country} onClick={() => void start()}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            Start testing
          </Button>
        </>
      }
    >
      <div className="px-5 py-4">
      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" />
          Loading…
        </p>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-ink-700">
              Committee
              <select
                className="mt-1 block h-11 w-full rounded-control border border-hairline bg-surface px-2.5 text-sm text-ink-900"
                value={committeeId}
                onChange={(event) => pickCommittee(event.target.value)}
              >
                {data.options.map((option) => (
                  <option key={option.committeeId} value={option.committeeId}>
                    {option.abbreviation || option.name}
                    {option.abbreviation && option.name !== option.abbreviation ? ` — ${option.name}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-ink-700">
              Country
              <select
                className="mt-1 block h-11 w-full rounded-control border border-hairline bg-surface px-2.5 text-sm text-ink-900"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {(committee?.countries ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="text-sm text-ink-700">Show it as</legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              <DayChoice
                selected={!day2}
                onSelect={() => setDay2(false)}
                icon={<CalendarClock size={16} strokeWidth={1.5} />}
                title="Right now"
                body="What they see today."
              />
              <DayChoice
                selected={day2}
                onSelect={() => setDay2(true)}
                icon={<Siren size={16} strokeWidth={1.5} />}
                title="Day 2, topic released"
                body="The Emergency Session as it opens. Only you see it — it stays locked for everyone else."
              />
            </div>
          </fieldset>

          <p className="rounded-control border border-warning-border bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
            Looking is safe. Anything you submit on their resolution is real and the chairs see it — withdraw it
            afterwards.
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      </div>
    </Modal>
  );
}

function DayChoice({
  selected,
  onSelect,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2.5 rounded-control border px-3 py-2.5 text-left transition-colors duration-200',
        selected ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-hairline bg-surface hover:border-teal-300',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', selected ? 'text-teal-700' : 'text-muted')}>{icon}</span>
      <span>
        <span className="block text-sm font-medium text-ink-900">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{body}</span>
      </span>
    </button>
  );
}
