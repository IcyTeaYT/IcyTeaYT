import { CalendarClock, Gavel, Loader2, Siren, User } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { isEmergency } from '@/config/emergency';
import { dataSource, type TestingSeat, type TestOptions } from '@/data/source';
import { cn } from '@/lib/cn';

type Role = TestingSeat['role'];

/**
 * The owner picks a seat — a delegate's or a chair's — and sees the whole site
 * as that person: home page, committee, papers, resolution, Chair Dashboard.
 * Optionally as on Day 2 with the Emergency Session topic out, which only the
 * owner sees. Everything done while testing goes to a practice copy of the
 * committee, never the real one.
 */
export function TestAsDialog({
  open,
  onClose,
  committeeId: startIn,
  role: startAs,
}: {
  open: boolean;
  onClose: () => void;
  /** Open on this committee. */
  committeeId?: string;
  /** Open on this kind of seat. */
  role?: Role;
}) {
  const [data, setData] = useState<TestOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('delegate');
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
        const seat = next.seat;
        const wanted = startIn ?? seat?.committeeId;
        const start = next.options.find((option) => option.committeeId === wanted) ?? next.options[0];
        const same = Boolean(seat && start?.committeeId === seat.committeeId);
        setRole(startAs ?? (same && seat ? (seat.role ?? 'delegate') : 'delegate'));
        setCommitteeId(start?.committeeId ?? '');
        setCountry(same && seat?.country ? seat.country : (start?.countries[0] ?? ''));
        setDay2(same && seat ? seat.day2 : isEmergency(start?.committeeId));
      })
      .catch(() => live && setError('The list of seats could not be loaded. Try again.'));
    return () => {
      live = false;
    };
  }, [open, startIn, startAs]);

  const committee = useMemo(() => data?.options.find((option) => option.committeeId === committeeId) ?? null, [data, committeeId]);
  // The Emergency Session sits on Day 2: its chair is only ever seen then.
  const day2Only = role === 'chair' && isEmergency(committeeId);
  const showDay2 = day2 || day2Only;
  const ready = Boolean(committeeId) && (role === 'chair' || Boolean(country));

  const pickCommittee = (id: string) => {
    setCommitteeId(id);
    setCountry(data?.options.find((option) => option.committeeId === id)?.countries[0] ?? '');
    // The Emergency Session only has something to show once its topic is out.
    if (isEmergency(id)) setDay2(true);
  };

  const start = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await dataSource.startTest({ role, committeeId, country: role === 'chair' ? '' : country, day2: showDay2 });
      // Start afresh, as them: a delegate on their home page, a chair at their dashboard.
      window.location.assign(role === 'chair' ? '/chair' : '/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Testing could not start.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Test the site"
      description="Pick a seat. The whole site then looks exactly as it does for them, until you press Stop testing."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy || !ready} onClick={() => void start()}>
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
            <fieldset>
              <legend className="text-sm text-ink-700">Test as</legend>
              <div role="radiogroup" aria-label="Test as" className="mt-1.5 grid grid-cols-2 gap-2">
                <Choice
                  selected={role === 'delegate'}
                  onSelect={() => setRole('delegate')}
                  icon={<User size={16} strokeWidth={1.5} />}
                  title="A delegate"
                  body="Their home page, papers and resolution."
                />
                <Choice
                  selected={role === 'chair'}
                  onSelect={() => setRole('chair')}
                  icon={<Gavel size={16} strokeWidth={1.5} />}
                  title="A chair"
                  body="The Chair Dashboard, to run the session."
                />
              </div>
            </fieldset>

            <div className={cn('grid gap-3', role === 'delegate' && 'sm:grid-cols-2')}>
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
              {role === 'delegate' ? (
                <label className="text-sm text-ink-700">
                  Country
                  <select
                    className="mt-1 block h-11 w-full rounded-control border border-hairline bg-surface px-2.5 text-sm text-ink-900"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  >
                    {(committee?.countries ?? []).length === 0 ? <option value="">No delegates on the sheet</option> : null}
                    {(committee?.countries ?? []).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <fieldset>
              <legend className="text-sm text-ink-700">Show it as</legend>
              <div role="radiogroup" aria-label="Show it as" className="mt-1.5 grid gap-2 sm:grid-cols-2">
                <Choice
                  selected={!showDay2}
                  disabled={day2Only}
                  onSelect={() => setDay2(false)}
                  icon={<CalendarClock size={16} strokeWidth={1.5} />}
                  title="Right now"
                  body={day2Only ? 'The Emergency Session only sits on Day 2.' : 'What they see today.'}
                />
                <Choice
                  selected={showDay2}
                  onSelect={() => setDay2(true)}
                  icon={<Siren size={16} strokeWidth={1.5} />}
                  title="Day 2, topic released"
                  body="The Emergency Session as it opens. Only you see it — it stays locked for everyone else."
                />
              </div>
            </fieldset>

            <p className="rounded-control border border-hairline bg-canvas px-3 py-2.5 text-xs leading-relaxed text-muted">
              Safe to try anything: while you test, every committee is a practice copy. The real committees, their
              chairs and delegates never see what you do. Test as a chair here and as a delegate on your phone to see
              both sides.
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

function Choice({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  body,
}: {
  selected: boolean;
  disabled?: boolean;
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
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2.5 rounded-control border px-3 py-2.5 text-left transition-colors duration-200',
        selected ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-hairline bg-surface hover:border-teal-300',
        disabled && 'cursor-not-allowed opacity-60 hover:border-hairline',
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
