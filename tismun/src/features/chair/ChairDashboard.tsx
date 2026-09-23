import {
  Award,
  ClipboardCheck,
  Compass,
  Coffee,
  FileText,
  Gavel,
  ListOrdered,
  Loader2,
  MessagesSquare,
  Monitor,
  MonitorCheck,
  RotateCcw,
  ScrollText,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { createChannel } from '@/lib/broadcast';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { useCommittee } from '@/store/conference';
import { useCommitteeControl } from '@/features/live/useControl';
import { useLivePush } from '@/features/live/useLive';
import { ChairProvider, useChair, useChairContext, useChairStoreApi } from './context';
import { buildDisplayState, displayChannelName, type DisplayMessage } from './display';
import { Awards } from './panes/Awards';
import { Guided } from './panes/Guided';
import { ModeratedCaucus } from './panes/ModeratedCaucus';
import { Motions } from './panes/Motions';
import { Resolutions } from './panes/Resolutions';
import { RollCall } from './panes/RollCall';
import { SessionLog } from './panes/SessionLog';
import { SpeakersList } from './panes/SpeakersList';
import { UnmoderatedCaucus } from './panes/UnmoderatedCaucus';
import { sessionStatusOf } from './store';
import { SHORTCUTS, useChairShortcuts } from './useChairShortcuts';
import { WatchPanel } from './WatchPanel';

interface Section {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Guided Mode leads; the rest are the full tools, in order of procedure. */
const SECTIONS: Section[] = [
  { to: '/chair/guided', label: 'Guided Mode', icon: Compass },
  { to: '/chair/roll-call', label: 'Roll Call', icon: ClipboardCheck },
  { to: '/chair/speakers', label: 'Speakers’ List', icon: ListOrdered },
  { to: '/chair/moderated', label: 'Moderated Caucus', icon: MessagesSquare },
  { to: '/chair/unmoderated', label: 'Unmoderated Caucus', icon: Coffee },
  { to: '/chair/motions', label: 'Motions', icon: Gavel },
  { to: '/chair/resolutions', label: 'Resolutions', icon: FileText },
  { to: '/chair/awards', label: 'Awards', icon: Award },
  { to: '/chair/log', label: 'Session Log', icon: ScrollText },
];

/** Keeps the projector window fed with the current session snapshot. */
function useProjectorBroadcast() {
  const { committee, store } = useChairContext();

  useEffect(() => {
    const channel = createChannel<DisplayMessage>(displayChannelName(committee.id));
    const publish = () => channel.post({ kind: 'state', state: buildDisplayState(store.getState(), committee) });

    // Any state change republishes; the payload carries timer STATE, so the
    // projector keeps counting smoothly between messages on its own.
    const unsubscribeStore = store.subscribe(publish);
    const unsubscribeChannel = channel.subscribe((message) => {
      if (message.kind === 'hello') publish();
    });

    publish();
    return () => {
      unsubscribeStore();
      unsubscribeChannel();
      channel.close();
    };
  }, [committee, store]);
}

function DashboardChrome() {
  const { committee, loading, error, roster } = useChairContext();
  const status = useChair(sessionStatusOf);
  const soundEnabled = useChair((state) => state.soundEnabled);
  const toggleSound = useChair((state) => state.toggleSound);
  const resetSession = useChair((state) => state.resetSession);
  const store = useChairStoreApi();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  useProjectorBroadcast();
  // One device runs the committee at a time; any other chair's device watches
  // until its chair presses Take over.
  const control = useCommitteeControl(committee.id, store);
  const running = control.mode === 'control' || control.mode === 'solo';
  // Report this committee's session so the Secretariat can watch it live.
  // No-ops harmlessly when there is no API behind the site.
  useLivePush(committee.id, store, { enabled: running, onLocked: control.lostControl });

  const openProjector = useCallback(() => {
    window.open('/chair/display', 'tismun-projector', 'noopener,width=1280,height=720');
  }, []);

  useChairShortcuts(openProjector, running);

  // Keep the roster in the store fresh if it arrives after first paint.
  useEffect(() => {
    if (roster.length) store.getState().syncRoster(roster);
  }, [roster, store]);

  const statusTone =
    status === 'Not in session' ? 'neutral' : status === 'Voting procedure' ? 'warning' : 'teal';

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-7 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-hairline pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="label-micro">Chair Dashboard</p>
            {running ? <Badge tone={statusTone}>{status}</Badge> : null}
          </div>
          <h1 className="mt-2.5 font-serif text-[26px] leading-tight text-ink-900 sm:text-[30px]">
            {committee.name}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {committee.abbreviation} · {committee.room} · {roster.length} delegations
          </p>
          {control.mode === 'control' ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <MonitorCheck size={13} strokeWidth={1.5} className="text-teal-600" />
              Running on this device. Other chairs can watch, or take over.
            </p>
          ) : null}
        </div>

        {running ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Chime on' : 'Chime off'}
            >
              {soundEnabled ? (
                <Volume2 size={15} strokeWidth={1.5} />
              ) : (
                <VolumeX size={15} strokeWidth={1.5} />
              )}
              {soundEnabled ? 'Chime on' : 'Chime off'}
            </Button>
            <Button variant="secondary" size="sm" onClick={openProjector}>
              <Monitor size={15} strokeWidth={1.5} />
              Projector
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} strokeWidth={1.5} />
              Reset session
            </Button>
          </div>
        ) : null}
      </header>

      {control.mode === 'checking' ? (
        <Card className="mt-6">
          <div className="flex items-center gap-3 px-5 py-10 text-sm text-muted">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            Checking whether another chair is running this committee…
          </div>
        </Card>
      ) : control.mode === 'watching' ? (
        <div className="mt-6">
          <WatchPanel control={control} abbreviation={committee.abbreviation} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
          {/* Sidebar on desktop, a scrolling tab strip on smaller screens. */}
          {/* min-w-0: a grid item defaults to min-width:auto, which would let this
            nav grow to fit the whole tool list and push the page sideways on a
            phone instead of letting the strip below scroll. */}
          <nav aria-label="Chair tools" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <ul className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
              {SECTIONS.map((section, index) => (
                <li
                  key={section.to}
                  className={
                    index === 1
                      ? 'shrink-0 lg:mt-2 lg:border-t lg:border-hairline lg:pt-2'
                      : 'shrink-0'
                  }
                >
                  <NavLink
                    to={section.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 whitespace-nowrap rounded-control px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                        isActive
                          ? 'bg-teal-50 text-teal-800'
                          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                      )
                    }
                  >
                    <section.icon size={16} strokeWidth={1.5} className="shrink-0" />
                    {section.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-5 hidden rounded-card border border-hairline bg-surface p-4 lg:block">
              <p className="label-micro">Shortcuts</p>
              <dl className="mt-3 space-y-2">
                {SHORTCUTS.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between gap-3">
                    <dt>
                      <kbd className="rounded border border-hairline bg-canvas px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-600">
                        {shortcut.keys}
                      </kbd>
                    </dt>
                    <dd className="text-xs text-muted">{shortcut.action}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </nav>

          <div className="min-w-0">
            {error ? (
              <Card>
                <EmptyState title="Roster unavailable" body={error} />
              </Card>
            ) : loading ? (
              <Card>
                <div className="flex items-center gap-3 px-5 py-10 text-sm text-muted">
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                  Loading the committee roster…
                </div>
              </Card>
            ) : (
              <Routes>
                <Route index element={<Navigate to="/chair/guided" replace />} />
                <Route path="guided" element={<Guided />} />
                <Route path="roll-call" element={<RollCall />} />
                <Route path="speakers" element={<SpeakersList />} />
                <Route path="moderated" element={<ModeratedCaucus />} />
                <Route path="unmoderated" element={<UnmoderatedCaucus />} />
                <Route path="motions" element={<Motions />} />
                <Route path="resolutions" element={<Resolutions />} />
                <Route path="awards" element={<Awards />} />
                <Route path="log" element={<SessionLog />} />
                <Route path="*" element={<Navigate to="/chair/guided" replace />} />
              </Routes>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetSession();
          navigate('/chair/guided');
        }}
        title="Reset this committee’s session?"
        body="Roll call, timers, the speakers’ list, motions, resolutions and votes for this committee will be cleared. The session log is cleared too. Awards are kept. This cannot be undone."
        confirmLabel="Reset session"
        destructive
      />
    </div>
  );
}

export function ChairDashboard() {
  const user = useAuth((state) => state.user);
  const committee = useCommittee(user?.committeeId);

  if (!committee) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-6">
        <Card>
          <EmptyState
            title="No committee assigned"
            body="Your chair account is not linked to a committee yet. Contact the Secretariat."
          />
        </Card>
      </div>
    );
  }

  return (
    <ChairProvider committee={committee}>
      <DashboardChrome />
    </ChairProvider>
  );
}
