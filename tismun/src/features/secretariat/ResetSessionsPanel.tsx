import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { dataSource } from '@/data/source';
import type { SessionsReset } from '@/data/source/types';
import { formatDateTime } from '@/lib/time';
import { useConferenceStatus } from '@/store/conferenceStatus';

const CONFIRM_WORD = 'RESET';

/**
 * Reset every committee's session at once — typically after testing, before
 * the conference begins. Each chair's own "Reset session" keeps awards; this
 * one clears everything, so it asks for the word typed out.
 */
export function ResetSessionsPanel() {
  const [info, setInfo] = useState<SessionsReset | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dataSource
      .getSessionsReset()
      .then((next) => {
        if (!cancelled) setInfo(next);
      })
      .catch(() => {
        if (!cancelled) setInfo({ available: false, last: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setError(null);
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      setInfo(await dataSource.resetAllSessions());
      // Every open chair dashboard in this browser takes it in straight away.
      await useConferenceStatus.getState().refresh();
      setDone(true);
      setOpen(false);
      setTyped('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The sessions could not be reset.');
    } finally {
      setBusy(false);
    }
  };

  const last = info?.last ?? null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl text-ink-900">Reset every session</h2>
      <Card className="mt-4">
        <CardBody className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-ink-700">
              Clears every committee’s session at once — roll call, timers, speakers, motions,
              resolutions, votes, session logs and awards — on the server and on every chair’s
              device. Use it after testing, before the conference starts.
            </p>
            <p className="mt-1.5 text-xs text-muted">
              {last
                ? `Last reset ${formatDateTime(last.at)}${last.byName ? ` by ${last.byName}` : ''}.`
                : 'Never reset.'}
              {done ? ' Chairs’ devices clear within about ten seconds.' : ''}
            </p>
            {info && !info.available ? (
              <p className="mt-1.5 text-xs text-muted">
                Needs the live-sync database (the DB binding in Cloudflare).
              </p>
            ) : null}
          </div>
          <Button
            variant="danger"
            className="shrink-0"
            disabled={!info?.available}
            onClick={() => setOpen(true)}
          >
            <RotateCcw size={15} strokeWidth={1.5} />
            Reset all sessions
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={close}
        title="Reset every committee’s session?"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={typed.trim().toUpperCase() !== CONFIRM_WORD || busy}
              onClick={() => void reset()}
            >
              {busy ? 'Resetting…' : 'Reset all sessions'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-ink-600">
            Every committee — the Emergency Session included — goes back to the start: roll call,
            timers, the speakers’ list, motions, resolutions, votes, every session log and{' '}
            <strong className="font-medium text-ink-900">all awards</strong>. This cannot be undone.
            The Emergency Session release and Day 2 settings are not changed.
          </p>
          <label className="block">
            <span className="text-sm text-ink-700">
              Type <strong className="font-semibold text-ink-900">{CONFIRM_WORD}</strong> to
              confirm
            </span>
            <Input
              className="mt-1.5"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-label={`Type ${CONFIRM_WORD} to confirm`}
            />
          </label>
          {error ? (
            <p
              role="alert"
              className="rounded-control border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
