import type { Committee } from '@/data/source/types';
import type { TimerState } from '@/lib/timer';
import { sessionStatusOf, type ChairState } from './store';
import type { SessionStatus } from './types';

/** The snapshot the chair's laptop pushes to the projector window. */
export interface DisplayState {
  committeeName: string;
  committeeAbbreviation: string;
  status: SessionStatus;
  /** The line under the status, e.g. the caucus topic or purpose. */
  detail: string;
  speakerName: string | null;
  speakerCode: string | null;
  /**
   * Timers are sent as STATE, not as a remaining-milliseconds number: the
   * projector derives its own countdown from Date.now(), so it ticks smoothly
   * at 60fps off a single message rather than needing one message per frame.
   */
  primary: { label: string; timer: TimerState } | null;
  secondary: { label: string; timer: TimerState } | null;
  queue: string[];
  updatedAt: number;
}

export type DisplayMessage =
  | { kind: 'state'; state: DisplayState }
  /** The projector window asking for a snapshot when it opens. */
  | { kind: 'hello' };

export const displayChannelName = (committeeId: string): string => `tismun.display.${committeeId}`;

/* ────────────────────────────────────────────────────────────────────────── */

/** Reduce the whole session down to what belongs on a projector. */
export function buildDisplayState(state: ChairState, committee: Committee): DisplayState {
  const base = {
    committeeName: committee.name,
    committeeAbbreviation: committee.abbreviation,
    status: sessionStatusOf(state),
    updatedAt: Date.now(),
  };

  const nameOf = (id: string | null | undefined) => (id ? (state.names[id] ?? null) : null);
  const codeOf = (id: string | null | undefined) => (id ? (state.codes[id] ?? null) : null);

  if (state.presentation.active) {
    const resolution = state.resolutions.find(
      (entry) => entry.id === state.presentation.resolutionId,
    );
    return {
      ...base,
      detail: resolution ? `${resolution.number} — ${resolution.title}` : '',
      speakerName: nameOf(state.presentation.presenterId),
      speakerCode: codeOf(state.presentation.presenterId),
      primary: {
        label: state.presentation.phase === 'questions' ? 'Questions' : 'Presentation time',
        timer: state.presentation.timer,
      },
      secondary: null,
      queue: [],
    };
  }

  if (state.unmoderated.active) {
    return {
      ...base,
      detail: state.unmoderated.purpose,
      speakerName: null,
      speakerCode: null,
      primary: { label: 'Time remaining', timer: state.unmoderated.timer },
      secondary: null,
      queue: [],
    };
  }

  const current = state.gsl.queue.find((entry) => entry.id === state.gsl.currentId) ?? null;
  return {
    ...base,
    detail: '',
    speakerName: nameOf(current?.delegationId),
    speakerCode: codeOf(current?.delegationId),
    primary: current ? { label: 'Speaking time', timer: state.gsl.timer } : null,
    secondary: null,
    queue: state.gsl.queue
      .filter((entry) => entry.id !== state.gsl.currentId)
      .slice(0, 5)
      .map((entry) => state.names[entry.delegationId] ?? '—'),
  };
}
