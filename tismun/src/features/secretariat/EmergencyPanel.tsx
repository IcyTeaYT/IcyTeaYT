import { CalendarClock, ChevronDown, Lock, LockOpen, RotateCcw, Siren, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AllDelegations } from '@/components/emergency/DelegationPanel';
import { ReleaseCountdown } from '@/components/emergency/ReleaseCountdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { dataSource } from '@/data/source';
import type { EmergencyAdmin, OverrideAction } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { formatDateTimeWithZone, formatTimeOfDay } from '@/lib/time';
import { useConferenceStatus } from '@/store/conferenceStatus';

const CONFIRM: Record<
  OverrideAction,
  { title: string; body: string; label: string; destructive?: boolean }
> = {
  'release-now': {
    title: 'Release the Emergency Session topic now?',
    body: 'The topic, description and background paper go out to every delegate straight away, ahead of the schedule. Open pages show them within thirty seconds.',
    label: 'Release now',
  },
  unrelease: {
    title: 'Un-release the topic?',
    body: 'The topic, description and background paper are withdrawn and stay locked — even past the scheduled time — until you release them or return to the schedule. Anyone who already downloaded the paper keeps their copy.',
    label: 'Un-release',
    destructive: true,
  },
  'release-auto': {
    title: 'Return the release to the schedule?',
    body: 'The override is removed and the topic follows the scheduled release time again.',
    label: 'Return to the schedule',
  },
  'day2-now': {
    title: 'Switch to Day 2 now?',
    body: 'Emergency Session delegates see it as their committee today, and everyone’s Day 2 role takes effect straight away, ahead of the schedule.',
    label: 'Switch to Day 2 now',
  },
  'day2-hold': {
    title: 'Hold Day 1?',
    body: 'Day 1 continues past the scheduled time, until you switch to Day 2 or return to the schedule.',
    label: 'Hold Day 1',
    destructive: true,
  },
  'day2-auto': {
    title: 'Return Day 2 to the schedule?',
    body: 'The override is removed and Day 2 begins at its scheduled time.',
    label: 'Return to the schedule',
  },
};

/**
 * The Emergency Session, from the Secretariat's side: whether the topic is out,
 * when it goes out on its own, and the backup overrides — each behind a
 * confirmation, and each recorded with who made it. The normal path needs
 * none of these: at the scheduled time the server releases the topic itself.
 */
export function EmergencyPanel() {
  const [admin, setAdmin] = useState<EmergencyAdmin | null>(null);
  const [pending, setPending] = useState<OverrideAction | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelegations, setShowDelegations] = useState(false);
  const refreshStatus = useConferenceStatus((state) => state.refresh);

  const load = useCallback(async () => {
    try {
      setAdmin(await dataSource.getEmergencyAdmin());
    } catch {
      setError('The Emergency Session status could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const run = async (action: OverrideAction) => {
    setWorking(true);
    setError(null);
    try {
      setAdmin(await dataSource.setEmergencyOverride(action));
      // The whole app follows at once, not at its next thirty-second check.
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The override could not be saved.');
    } finally {
      setWorking(false);
    }
  };

  const status = admin?.status;
  const confirm = pending ? CONFIRM[pending] : null;

  return (
    <section className="mt-7">
      <Card className="border-teal-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-teal-50 text-teal-700">
              <Siren size={16} strokeWidth={1.5} />
            </span>
            <h2 className="font-serif text-lg text-ink-900">Emergency Session</h2>
          </div>
          {status ? (
            <div className="flex flex-wrap gap-2">
              <Badge tone={status.released ? 'success' : 'warning'}>
                {status.released ? (
                  <LockOpen size={11} strokeWidth={1.5} />
                ) : (
                  <Lock size={11} strokeWidth={1.5} />
                )}
                {status.released ? 'Topic released' : 'Topic locked'}
              </Badge>
              <Badge tone={status.day2 ? 'teal' : 'neutral'}>
                {status.day2 ? 'Day 2' : 'Day 1'}
              </Badge>
            </div>
          ) : null}
        </div>

        {!status ? (
          <CardBody className="py-5 text-sm text-muted">{error ?? 'Loading…'}</CardBody>
        ) : (
          <CardBody className="grid gap-6 py-5 md:grid-cols-2">
            {/* Topic release */}
            <div className="space-y-3">
              <p className="label-micro">Topic and background paper</p>
              <p className="text-sm text-ink-800">
                {status.releaseMode === 'released'
                  ? 'Released early by the Secretariat.'
                  : status.releaseMode === 'locked'
                    ? 'Held locked by the Secretariat, past the schedule if need be.'
                    : status.released
                      ? 'Released automatically at the scheduled time.'
                      : 'Releases automatically at the scheduled time. Nothing to press.'}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarClock size={13} strokeWidth={1.5} />
                Scheduled {formatDateTimeWithZone(status.releaseAt)}
              </p>
              {!status.released && status.releaseMode === 'auto' ? (
                <p className="text-xs text-muted">
                  In <ReleaseCountdown className="text-xs" />
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {status.released ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={working || !admin.overridesAvailable}
                    onClick={() => setPending('unrelease')}
                  >
                    <Lock size={14} strokeWidth={1.5} />
                    Un-release
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={working || !admin.overridesAvailable}
                    onClick={() => setPending('release-now')}
                  >
                    <LockOpen size={14} strokeWidth={1.5} />
                    Release now
                  </Button>
                )}
                {status.releaseMode !== 'auto' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working}
                    onClick={() => setPending('release-auto')}
                  >
                    <RotateCcw size={14} strokeWidth={1.5} />
                    Return to the schedule
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Day 2 */}
            <div className="space-y-3 md:border-l md:border-hairline md:pl-6">
              <p className="label-micro">Day 2</p>
              <p className="text-sm text-ink-800">
                {status.focusMode === 'on'
                  ? 'Switched to Day 2 early by the Secretariat.'
                  : status.focusMode === 'off'
                    ? 'Day 1 held by the Secretariat.'
                    : status.day2
                      ? 'Day 2 began at the scheduled time.'
                      : 'Day 2 begins at the scheduled time: Day 2 roles take effect and Emergency Session delegates see it first.'}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarClock size={13} strokeWidth={1.5} />
                Scheduled {formatDateTimeWithZone(status.focusFrom)}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {!status.day2 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={working || !admin.overridesAvailable}
                    onClick={() => setPending('day2-now')}
                  >
                    <Sun size={14} strokeWidth={1.5} />
                    Switch to Day 2 now
                  </Button>
                ) : null}
                {status.focusMode !== 'auto' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working}
                    onClick={() => setPending('day2-auto')}
                  >
                    <RotateCcw size={14} strokeWidth={1.5} />
                    Return to the schedule
                  </Button>
                ) : null}
              </div>
            </div>

            {!admin.overridesAvailable ? (
              <p className="rounded-control border border-hairline bg-canvas px-3 py-2.5 text-xs text-muted md:col-span-2">
                Overrides need the live-sync database (the DB binding). The schedule applies on its
                own without it.
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-control border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger md:col-span-2"
              >
                {error}
              </p>
            ) : null}

            {/* Who changed what, and when */}
            <div className="md:col-span-2">
              <p className="label-micro">Overrides</p>
              {admin.events.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  None — everything is following the schedule.
                </p>
              ) : (
                <ol className="mt-2 divide-y divide-hairline rounded-card border border-hairline">
                  {admin.events.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-2.5"
                    >
                      <time className="tabular w-14 shrink-0 text-xs text-muted">
                        {formatTimeOfDay(event.at)}
                      </time>
                      <span className="min-w-0 flex-1 text-sm text-ink-800">
                        {event.detail ?? event.action}
                      </span>
                      <span className="text-xs text-muted">{event.byName ?? 'Secretariat'}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowDelegations((open) => !open)}
                aria-expanded={showDelegations}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  className={cn(
                    'transition-transform duration-200',
                    showDelegations && 'rotate-180',
                  )}
                />
                {showDelegations ? 'Hide' : 'Show'} every delegation
              </button>
              {showDelegations ? <AllDelegations className="mt-3" /> : null}
            </div>
          </CardBody>
        )}
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) void run(pending);
        }}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel={confirm?.label ?? 'Confirm'}
        destructive={confirm?.destructive}
      />
    </section>
  );
}
