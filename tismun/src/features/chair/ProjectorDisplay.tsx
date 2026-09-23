import { useEffect, useState } from 'react';
import { Flag } from '@/components/Flag';
import { CONFERENCE } from '@/config/conference';
import { createChannel } from '@/lib/broadcast';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';
import { phaseOf, type TimerState } from '@/lib/timer';
import { useTimer } from '@/lib/useTimer';
import { useAuth } from '@/store/auth';
import { useCommittee } from '@/store/conference';
import { displayChannelName, type DisplayMessage, type DisplayState } from './display';

/**
 * The classroom projector view.
 *
 * It holds no session state of its own: the chair's dashboard pushes a snapshot
 * over BroadcastChannel and this window renders it. Because the snapshot carries
 * timer STATE rather than a remaining-seconds number, the countdown here runs off
 * this window's own clock — smooth at 60fps, and correct even if a message is
 * dropped or the window is opened halfway through a caucus.
 */
/** No word from the dashboard for this long and the feed is treated as stale. */
const STALE_AFTER_MS = 20_000;

export function ProjectorDisplay() {
  const user = useAuth((state) => state.user);
  // Only a committee this account runs right now has anything to project.
  const committee = useCommittee(user?.access.chairOf);
  const [snapshot, setSnapshot] = useState<DisplayState | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const channelName = committee ? displayChannelName(committee.id) : null;

  useEffect(() => {
    if (!channelName) return;
    const channel = createChannel<DisplayMessage>(channelName);
    const unsubscribe = channel.subscribe((message) => {
      if (message.kind === 'state') {
        setSnapshot(message.state);
        setReceivedAt(Date.now());
      }
    });
    // Ask the dashboard for the current state, in case nothing has changed
    // since this window was opened.
    channel.post({ kind: 'hello' });
    return () => {
      unsubscribe();
      channel.close();
    };
  }, [channelName]);

  // The dashboard publishes on every change plus whenever asked, so a long
  // silence means its tab was closed or navigated away — worth saying, since
  // the timers here would otherwise keep counting down convincingly.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);
  const stale = receivedAt !== null && now - receivedAt > STALE_AFTER_MS;

  const title = snapshot?.committeeName ?? committee?.name ?? CONFERENCE.name;
  const abbreviation = snapshot?.committeeAbbreviation ?? committee?.abbreviation ?? '';

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 px-[4vw] py-[3vh] text-white">
      <header className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="text-[1.1vw] font-semibold uppercase tracking-label text-teal-300">
            {abbreviation}
          </p>
          <h1 className="mt-[0.6vh] truncate font-serif text-[2.6vw] leading-tight text-white">{title}</h1>
        </div>
        {/* The slate wordmark vanishes on ink, so the logo goes in a white chip. */}
        <div className="shrink-0 rounded-card bg-white px-[1.2vw] py-[0.8vh]">
          <img src="/logo.png" alt={CONFERENCE.name} className="h-[5vh] w-auto" />
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-[2vh]">
        {/* With no clock running the status IS the headline below, so showing
            it here too would just print "In session" twice. */}
        {snapshot && (snapshot.primary || snapshot.detail) ? <StatusLine snapshot={snapshot} /> : null}

        {snapshot?.primary ? (
          <BigTimer timer={snapshot.primary.timer} />
        ) : (
          /* No clock is running. Showing a dimmed 00:00 here read as a broken
             screen from across a room — near-black on black. Say what is
             actually happening instead, at a size the back row can read. */
          <div>
            <p className="font-serif text-[9vw] leading-none text-white">
              {snapshot?.status ?? 'Waiting for the Chair'}
            </p>
            <p className="mt-[2vh] text-[1.8vw] text-ink-300">
              {snapshot
                ? 'No delegation has the floor. The clock starts when a speaker is recognised.'
                : 'Open the Chair Dashboard on this computer and press Projector.'}
            </p>
          </div>
        )}

        <div className="mt-[3vh] flex flex-wrap items-end justify-between gap-[3vw]">
          <div className="min-w-0">
            {snapshot?.speakerName ? (
              <p className="text-[1vw] font-semibold uppercase tracking-label text-ink-400">
                Now speaking
              </p>
            ) : null}
            {snapshot?.speakerName ? (
              <div className="mt-[1vh] flex items-center gap-[1.4vw]">
                <Flag
                  code={snapshot.speakerCode}
                  country={snapshot.speakerName}
                  className="!h-[7vh] !w-[9.4vh]"
                />
                <p className="truncate font-serif text-[4.4vw] leading-none">{snapshot.speakerName}</p>
              </div>
            ) : null}
          </div>

          {snapshot?.secondary ? (
            <SecondaryTimer label={snapshot.secondary.label} timer={snapshot.secondary.timer} />
          ) : null}
        </div>

        {snapshot && snapshot.queue.length > 0 ? (
          <div className="mt-[3vh] border-t border-white/10 pt-[2vh]">
            <p className="text-[0.95vw] font-semibold uppercase tracking-label text-ink-400">Next</p>
            <ol className="mt-[1vh] flex flex-wrap gap-x-[2.5vw] gap-y-[1vh]">
              {snapshot.queue.map((country, index) => (
                <li key={`${country}-${index}`} className="text-[1.5vw] text-ink-200">
                  <span className="tabular mr-[0.6vw] text-ink-500">{index + 1}</span>
                  {country}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </main>

      <footer className="flex items-center justify-between border-t border-white/10 pt-[1.6vh] text-[0.95vw] text-ink-400">
        <span className="font-serif text-[1.1vw] font-semibold text-white">{CONFERENCE.edition}</span>
        <span className={stale ? 'text-warning' : undefined}>
          {!snapshot
            ? 'Waiting for the Chair Dashboard…'
            : stale
              ? 'Chair Dashboard not responding'
              : 'Live'}
        </span>
      </footer>
    </div>
  );
}

/** What the committee is doing, with what it is for underneath: an Unmoderated
 *  Caucus and its purpose, or a presentation and the draft being presented. */
function StatusLine({ snapshot }: { snapshot: DisplayState }) {
  return (
    <div className="mb-[1.5vh] min-w-0">
      <p className="truncate text-[1.9vw] font-medium text-teal-300">{snapshot.status}</p>
      {snapshot.detail ? (
        <p className="mt-[0.4vh] truncate text-[1.6vw] text-ink-200">{snapshot.detail}</p>
      ) : null}
    </div>
  );
}

const PHASE_COLOUR = {
  idle: 'text-white',
  normal: 'text-white',
  warning: 'text-warning',
  critical: 'text-danger',
  expired: 'text-danger animate-time-up',
} as const;

function BigTimer({ timer }: { timer: TimerState }) {
  const view = useTimer(timer);
  const phase = phaseOf(timer, Date.now());

  return (
    <div className="flex items-baseline gap-[2vw]">
      <p
        className={cn(
          'tabular text-[20vw] font-semibold leading-none tracking-tight',
          PHASE_COLOUR[phase],
        )}
      >
        {formatClock(view.remainingMs)}
      </p>
      {view.expired ? (
        <span className="text-[3vw] font-semibold uppercase tracking-label text-danger">Time</span>
      ) : null}
    </div>
  );
}

function SecondaryTimer({ label, timer }: { label: string; timer: TimerState }) {
  const view = useTimer(timer);
  const phase = phaseOf(timer, Date.now());

  return (
    <div className="text-right">
      <p className="text-[1vw] font-semibold uppercase tracking-label text-ink-400">{label}</p>
      <p className={cn('tabular text-[5.5vw] font-semibold leading-none', PHASE_COLOUR[phase])}>
        {formatClock(view.remainingMs)}
      </p>
    </div>
  );
}
