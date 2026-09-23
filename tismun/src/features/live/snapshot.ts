import { hasQuorum } from '@/lib/majority';
import type { TimerState } from '@/lib/timer';
import {
  presentAndVotingIds,
  presentIds,
  sessionStatusOf,
  type ChairData,
} from '@/features/chair/store';
import type { LiveDelegation, LiveSnapshot, LiveSummary } from './types';

/** Move a timer's origin between clocks. A stopped timer has nothing to shift. */
export const shiftTimer = (timer: TimerState, deltaMs: number): TimerState =>
  timer.startedAt === null ? timer : { ...timer, startedAt: timer.startedAt + deltaMs };

const shiftLabelled = (
  entry: { label: string; timer: TimerState } | null,
  deltaMs: number,
): { label: string; timer: TimerState } | null =>
  entry ? { label: entry.label, timer: shiftTimer(entry.timer, deltaMs) } : null;

/** Which clocks a committee is showing right now, given what it is doing. */
function timersOf(state: ChairData): {
  primary: { label: string; timer: TimerState } | null;
  secondary: { label: string; timer: TimerState } | null;
  speakerId: string | null;
  queueIds: string[];
  detail: string;
} {
  if (state.moderated.active) {
    return {
      primary: { label: 'Speaking time', timer: state.moderated.speakerTimer },
      secondary: { label: 'Caucus remaining', timer: state.moderated.totalTimer },
      speakerId: state.moderated.currentDelegationId,
      queueIds: state.moderated.queue,
      detail: state.moderated.topic,
    };
  }

  if (state.unmoderated.active) {
    return {
      primary: { label: 'Time remaining', timer: state.unmoderated.timer },
      secondary: null,
      speakerId: null,
      queueIds: [],
      detail: state.unmoderated.purpose,
    };
  }

  const current = state.gsl.queue.find((entry) => entry.id === state.gsl.currentId) ?? null;
  return {
    primary: current ? { label: 'Speaking time', timer: state.gsl.timer } : null,
    secondary: null,
    speakerId: current?.delegationId ?? null,
    queueIds: state.gsl.queue
      .filter((entry) => entry.id !== state.gsl.currentId)
      .map((entry) => entry.delegationId),
    detail: '',
  };
}

/**
 * Reduce a committee's session to what the Secretariat needs at a glance.
 * `offsetToServer` shifts every timestamp out of this device's clock.
 */
export function buildLiveSummary(
  state: ChairData,
  committeeId: string,
  offsetToServer: number,
): LiveSummary {
  const { primary, secondary, speakerId, detail } = timersOf(state);
  const present = presentIds(state.attendance);
  const total = Object.keys(state.names).length;

  return {
    committeeId,
    status: sessionStatusOf(state),
    detail,
    updatedAt: Date.now() + offsetToServer,
    present: present.length,
    presentAndVoting: presentAndVotingIds(state.attendance).length,
    total,
    quorum: hasQuorum(present.length, total),
    rollCallTakenAt:
      state.rollCallTakenAt === null ? null : state.rollCallTakenAt + offsetToServer,
    currentSpeaker: speakerId
      ? { country: state.names[speakerId] ?? '—', countryCode: state.codes[speakerId] ?? null }
      : null,
    primaryTimer: shiftLabelled(primary, offsetToServer),
    secondaryTimer: shiftLabelled(secondary, offsetToServer),
    motionsOnFloor: state.motions.filter((motion) => motion.status === 'floor').length,
    resolutionCount: state.resolutions.length,
    voteSubject: state.vote?.subjectLabel ?? null,
    awards: (state.awards ?? []).map((award) => ({
      ...award,
      awardedAt: award.awardedAt + offsetToServer,
    })),
  };
}

/** How much of the log travels with each push. The server keeps the rest. */
const LOG_WINDOW = 60;

export function buildLiveSnapshot(
  state: ChairData,
  committeeId: string,
  offsetToServer: number,
): LiveSnapshot {
  const { queueIds } = timersOf(state);

  const roster: LiveDelegation[] = Object.keys(state.names)
    .map((id) => ({
      id,
      country: state.names[id] ?? id,
      countryCode: state.codes[id] ?? null,
      attendance: state.attendance[id] ?? ('absent' as const),
    }))
    .sort((a, b) => a.country.localeCompare(b.country));

  return {
    summary: buildLiveSummary(state, committeeId, offsetToServer),
    roster,
    queue: queueIds.map((id) => ({
      country: state.names[id] ?? '—',
      countryCode: state.codes[id] ?? null,
    })),
    motions: state.motions,
    resolutions: state.resolutions,
    amendments: state.amendments,
    vote: state.vote,
    log: state.log.slice(0, LOG_WINDOW).map((entry) => ({ ...entry, at: entry.at + offsetToServer })),
  };
}
