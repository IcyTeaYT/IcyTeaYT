import { CalendarClock, ChevronDown, Eye, Lock, LockOpen, RotateCcw, Siren, Sun, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AllDelegations } from '@/components/emergency/DelegationPanel';
import { ReleaseCountdown } from '@/components/emergency/ReleaseCountdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { dataSource } from '@/data/source';
import { emergencySession, type ConferenceStatus } from '@/config/emergency';
import type { EmergencyAdmin, OverrideAction } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { formatDateTimeWithZone, formatTimeOfDay } from '@/lib/time';
import { isOwner, useAuth } from '@/store/auth';
import { useConferenceStatus } from '@/store/conferenceStatus';
import { TestAsDialog } from '@/features/testing/TestAsDialog';
import { EmergencySubmissions } from './EmergencySubmissions';

interface Confirm {
  title: string;
  body: string;
  label: string;
  destructive?: boolean;
}

/** What each button will do, said for this moment: before or after the scheduled time. */
function confirmFor(action: OverrideAction, status: ConferenceStatus): Confirm {
  const beforeRelease = status.serverNow < status.releaseAt;
  const beforeDay2 = status.serverNow < status.focusFrom;
  switch (action) {
    case 'release-now':
      return {
        title: 'Release the Emergency Session topic now?',
        body: 'The topic, description and background paper go out to every delegate straight away. Open pages show them within thirty seconds. You can un-release it again.',
        label: 'Release now',
      };
    case 'unrelease':
      return {
        title: 'Un-release the topic?',
        body: beforeRelease
          ? `The topic, description and background paper are hidden again within thirty seconds. It still releases on its own on ${emergencySession.releaseLabel}. Anyone who already downloaded the paper keeps their copy.`
          : 'The topic, description and background paper are hidden again within thirty seconds, and stay hidden until you press Release now. Anyone who already downloaded the paper keeps their copy.',
        label: 'Un-release',
        destructive: true,
      };
    case 'release-auto':
      return {
        title: 'Go back to the schedule?',
        body: `The topic stays hidden until ${emergencySession.releaseLabel}, then releases on its own.`,
        label: 'Back to the schedule',
      };
    case 'day2-now':
      return {
        title: 'Switch to Day 2 now?',
        body: 'Emergency Session delegates see it as their committee today, and everyone’s Day 2 role takes effect straight away. You can go back to Day 1 again.',
        label: 'Switch to Day 2 now',
      };
    case 'day2-hold':
      return {
        title: 'Go back to Day 1?',
        body: beforeDay2
          ? 'Everyone’s Day 1 role comes back straight away. Day 2 still begins on its own at the scheduled time.'
          : 'Everyone’s Day 1 role comes back, and stays until you press Switch to Day 2 now.',
        label: 'Back to Day 1',
        destructive: true,
      };
    case 'day2-auto':
      return {
        title: 'Go back to the schedule?',
        body: 'Day 1 continues until the scheduled time, then Day 2 begins on its own.',
        label: 'Back to the schedule',
      };
  }
}

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
  const owner = useAuth((state) => isOwner(state.user));
  const [previewing, setPreviewing] = useState(false);

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
  const confirm = pending && status ? confirmFor(pending, status) : null;
  // Held back past the schedule's time from before Un-release went back to the
  // schedule: it would not happen on its own, so say so and offer the fix.
  const releaseStuck = status ? status.releaseMode === 'locked' && status.serverNow < status.releaseAt : false;
  const day2Stuck = status ? status.focusMode === 'off' && status.serverNow < status.focusFrom : false;

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
                {releaseStuck
                  ? 'Held locked — it will NOT release on its own at the scheduled time. Press Back to the schedule to fix that.'
                  : status.releaseMode === 'released'
                    ? 'Released early. Un-release hides it again; it still releases on its own at the scheduled time.'
                    : status.releaseMode === 'locked'
                      ? 'Un-released by the Secretariat. It stays hidden until you press Release now.'
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
                {releaseStuck ? (
                  <Button variant="ghost" size="sm" disabled={working} onClick={() => setPending('release-auto')}>
                    <RotateCcw size={14} strokeWidth={1.5} />
                    Back to the schedule
                  </Button>
                ) : null}
              </div>
              {owner && !status.released ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-control border border-hairline bg-canvas px-3 py-2.5">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewing(true)}>
                    <Eye size={14} strokeWidth={1.5} />
                    See it as a delegate will
                  </Button>
                  <p className="text-xs text-muted">Only you see it. It stays locked for everyone else.</p>
                </div>
              ) : null}
            </div>

            {/* Day 2 */}
            <div className="space-y-3 md:border-l md:border-hairline md:pl-6">
              <p className="label-micro">Day 2</p>
              <p className="text-sm text-ink-800">
                {day2Stuck
                  ? 'Held on Day 1 — Day 2 will NOT begin on its own at the scheduled time. Press Back to the schedule to fix that.'
                  : status.focusMode === 'on'
                    ? 'Switched to Day 2 early. Back to Day 1 undoes it; Day 2 still begins on its own at the scheduled time.'
                    : status.focusMode === 'off'
                      ? 'Held on Day 1 by the Secretariat, until you press Switch to Day 2 now.'
                      : status.day2
                        ? 'Day 2 began at the scheduled time.'
                        : 'Day 2 begins at the scheduled time: Day 2 roles take effect and Emergency Session delegates see it first.'}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarClock size={13} strokeWidth={1.5} />
                Scheduled {formatDateTimeWithZone(status.focusFrom)}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {status.day2 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={working || !admin.overridesAvailable}
                    onClick={() => setPending('day2-hold')}
                  >
                    <Undo2 size={14} strokeWidth={1.5} />
                    Back to Day 1
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={working || !admin.overridesAvailable}
                    onClick={() => setPending('day2-now')}
                  >
                    <Sun size={14} strokeWidth={1.5} />
                    Switch to Day 2 now
                  </Button>
                )}
                {day2Stuck ? (
                  <Button variant="ghost" size="sm" disabled={working} onClick={() => setPending('day2-auto')}>
                    <RotateCcw size={14} strokeWidth={1.5} />
                    Back to the schedule
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

            {/* What the delegates have written, once there is a topic to write about */}
            {status.released ? (
              <div className="md:col-span-2">
                <EmergencySubmissions />
              </div>
            ) : null}

            {/* Who changed what, and when */}
            <div className="md:col-span-2">
              <p className="label-micro">Overrides</p>
              {admin.events.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  {admin.status.releaseMode === 'auto' && admin.status.focusMode === 'auto'
                    ? 'None — everything is following the schedule.'
                    : 'None recorded.'}
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

      {owner ? <TestAsDialog open={previewing} onClose={() => setPreviewing(false)} committeeId={emergencySession.committeeId} /> : null}

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
