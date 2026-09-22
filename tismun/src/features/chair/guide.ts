import { DEFAULTS, MOTION_BY_ID } from '@/config/rules';
import { hasQuorum, quorumNeeded } from '@/lib/majority';
import { formatClock } from '@/lib/time';
import { presentIds, type ChairData } from './store';
import type { TimerKey } from './store';

/**
 * Guided Mode: what the committee should do next, derived from where it is.
 *
 * The labels here are the official terms and nothing else — a chair who learns
 * this screen is learning the rules of procedure, not a simplified dialect of
 * them. What Guided Mode makes easy is finding the right control, not knowing
 * what it is called.
 */

export type GuidedCommand =
  | 'mark-all-present'
  | 'take-roll-call'
  | 'timer-toggle'
  | 'timer-reset'
  | 'gsl-next'
  | 'mod-next'
  | 'mod-extend'
  | 'mod-end'
  | 'unmod-extend'
  | 'unmod-end';

export interface GuidedAction {
  label: string;
  emphasis: 'primary' | 'secondary';
  /** Icon name resolved by the view, so this module stays free of JSX. */
  icon:
    | 'clipboard'
    | 'play'
    | 'pause'
    | 'skip'
    | 'plus'
    | 'stop'
    | 'gavel'
    | 'list'
    | 'vote'
    | 'users'
    | 'coffee'
    | 'reset';
  /** Either a route to open, or a command to run against the session. */
  to?: string;
  command?: GuidedCommand;
}

export interface GuidedStage {
  /** The official name of where the committee is. */
  stage: string;
  headline: string;
  hint: string;
  /** Which clock, if any, belongs on this screen. */
  timer: { key: TimerKey; label: string } | null;
  actions: GuidedAction[];
}

export function guidedStage(state: ChairData): GuidedStage {
  const present = presentIds(state.attendance);
  const total = Object.keys(state.names).length;
  const quorum = hasQuorum(present.length, total);
  const onFloor = state.motions.filter((motion) => motion.status === 'floor');

  /* Voting procedure outranks everything: the committee is mid-vote. */
  if (state.vote) {
    return {
      stage: 'Voting Procedure',
      headline: `Voting on ${state.vote.subjectLabel}`,
      hint:
        state.vote.mode === 'roll-call'
          ? 'Call each delegation in turn and record Yes, No, Abstain or Pass.'
          : 'Count the placards for, against and abstaining, then record the result.',
      timer: null,
      actions: [
        // Both resolutions and amendments are voted on in the Resolutions
        // section, on the item itself.
        { label: 'Go to the vote', emphasis: 'primary', icon: 'vote', to: '/chair/resolutions' },
      ],
    };
  }

  if (state.moderated.active) {
    const speaker = state.moderated.currentDelegationId
      ? (state.names[state.moderated.currentDelegationId] ?? 'a delegation')
      : null;
    return {
      stage: 'Moderated Caucus',
      headline: state.moderated.topic || 'Moderated Caucus',
      hint: speaker
        ? `${speaker} has the floor. ${state.moderated.queue.length} recognised and waiting.`
        : 'Recognise a delegation to give it the floor.',
      timer: { key: 'modSpeaker', label: 'Speaking time' },
      actions: [
        { label: 'Next Speaker', emphasis: 'primary', icon: 'skip', command: 'mod-next' },
        {
          label: `Extend the Caucus by ${formatClock(DEFAULTS.extensionSec * 1000)}`,
          emphasis: 'secondary',
          icon: 'plus',
          command: 'mod-extend',
        },
        { label: 'Close the Caucus', emphasis: 'secondary', icon: 'stop', command: 'mod-end' },
        {
          label: 'Recognise delegations',
          emphasis: 'secondary',
          icon: 'list',
          to: '/chair/moderated',
        },
      ],
    };
  }

  if (state.unmoderated.active) {
    return {
      stage: 'Unmoderated Caucus',
      headline: state.unmoderated.purpose || 'Unmoderated Caucus',
      hint: 'Formal debate is suspended until the clock runs out.',
      timer: { key: 'unmod', label: 'Time remaining' },
      actions: [
        {
          label: `Extend the Caucus by ${formatClock(DEFAULTS.extensionSec * 1000)}`,
          emphasis: 'secondary',
          icon: 'plus',
          command: 'unmod-extend',
        },
        { label: 'Close the Caucus', emphasis: 'primary', icon: 'stop', command: 'unmod-end' },
      ],
    };
  }

  /* Nothing is running: the roll comes first. */
  if (!state.rollCallTakenAt) {
    return {
      stage: 'Roll Call',
      headline: 'Take the Roll Call',
      hint: 'Call each delegation and record Present, Present and Voting, or Absent. Debate cannot open until quorum is met.',
      timer: null,
      actions: [
        { label: 'Open Roll Call', emphasis: 'primary', icon: 'clipboard', to: '/chair/roll-call' },
        { label: 'Mark all Present', emphasis: 'secondary', icon: 'users', command: 'mark-all-present' },
      ],
    };
  }

  if (!quorum) {
    return {
      stage: 'Roll Call',
      headline: 'Quorum has not been reached',
      hint: `${present.length} of ${total} delegations are present; ${quorumNeeded(total)} are needed to open debate.`,
      timer: null,
      actions: [
        { label: 'Return to Roll Call', emphasis: 'primary', icon: 'clipboard', to: '/chair/roll-call' },
      ],
    };
  }

  if (onFloor.length > 0) {
    const first = onFloor[0];
    return {
      stage: 'Motions',
      headline: `${onFloor.length} ${onFloor.length === 1 ? 'Motion' : 'Motions'} on the floor`,
      hint: first
        ? `Vote in order of disruptiveness — ${MOTION_BY_ID[first.type].label} first.`
        : 'Vote in order of disruptiveness.',
      timer: null,
      actions: [
        { label: 'Vote on Motions', emphasis: 'primary', icon: 'gavel', to: '/chair/motions' },
      ],
    };
  }

  const current = state.gsl.queue.find((entry) => entry.id === state.gsl.currentId) ?? null;

  if (current) {
    const waiting = state.gsl.queue.length - 1;
    return {
      stage: 'General Speakers’ List',
      headline: state.names[current.delegationId] ?? 'A delegation has the floor',
      hint:
        waiting > 0
          ? `${waiting} ${waiting === 1 ? 'delegation' : 'delegations'} waiting to speak.`
          : 'No further delegations are on the list.',
      timer: { key: 'gsl', label: 'Speaking time' },
      actions: [
        { label: 'Next Speaker', emphasis: 'primary', icon: 'skip', command: 'gsl-next' },
        { label: 'Entertain a Motion', emphasis: 'secondary', icon: 'gavel', to: '/chair/motions' },
        {
          label: 'Manage the Speakers’ List',
          emphasis: 'secondary',
          icon: 'list',
          to: '/chair/speakers',
        },
      ],
    };
  }

  return {
    stage: 'In session',
    headline: 'The committee is in session',
    hint:
      state.gsl.queue.length > 0
        ? `${state.gsl.queue.length} on the General Speakers’ List. Recognise the first speaker, or entertain a Motion.`
        : 'Open the General Speakers’ List, or entertain a Motion from the floor.',
    timer: null,
    actions: [
      state.gsl.queue.length > 0
        ? { label: 'Recognise the first speaker', emphasis: 'primary', icon: 'play', command: 'gsl-next' }
        : {
            label: 'Open the General Speakers’ List',
            emphasis: 'primary',
            icon: 'list',
            to: '/chair/speakers',
          },
      { label: 'Entertain a Motion', emphasis: 'secondary', icon: 'gavel', to: '/chair/motions' },
      { label: 'Moderated Caucus', emphasis: 'secondary', icon: 'users', to: '/chair/moderated' },
      { label: 'Unmoderated Caucus', emphasis: 'secondary', icon: 'coffee', to: '/chair/unmoderated' },
    ],
  };
}

/* ── The order of business ────────────────────────────────────────────────── */

export interface ChecklistStep {
  id: string;
  /** The official name of this stage of the session. */
  label: string;
  hint: string;
  done: boolean;
  /** Where the chair goes to do it. */
  to: string;
}

/**
 * The session as a list the chair can see the whole of.
 *
 * Each step is marked done by reading the session rather than by anyone
 * ticking a box, so it cannot disagree with what actually happened: the
 * Roll Call step completes when the roll is taken, the Voting Procedure step
 * when a Draft Resolution has actually been decided.
 */
export function sessionChecklist(state: ChairData): ChecklistStep[] {
  const present = presentIds(state.attendance);
  const total = Object.keys(state.names).length;

  const agendaSet = state.motions.some(
    (motion) => motion.type === 'set-agenda' && motion.status === 'passed',
  );
  const speakersOpened = state.gsl.currentId !== null || state.gsl.spoken.length > 0;
  const debated =
    state.log.some((entry) => entry.type === 'caucus') || state.gsl.spoken.length > 0;
  const resolutionIntroduced = state.resolutions.some(
    (resolution) => resolution.status !== 'draft',
  );
  const voted =
    state.resolutions.some((r) => r.status === 'passed' || r.status === 'failed') ||
    state.amendments.some((a) => a.status === 'passed' || a.status === 'failed');
  const adjourned = state.motions.some(
    (motion) => motion.type === 'adjourn-meeting' && motion.status === 'passed',
  );

  return [
    {
      id: 'roll-call',
      label: 'Take the Roll Call',
      hint: 'Record every delegation as Present, Present and Voting, or Absent.',
      done: state.rollCallTakenAt !== null,
      to: '/chair/roll-call',
    },
    {
      id: 'quorum',
      label: 'Establish Quorum',
      hint: `${present.length} of ${total} present; ${quorumNeeded(total)} needed to open debate.`,
      done: hasQuorum(present.length, total),
      to: '/chair/roll-call',
    },
    {
      id: 'agenda',
      label: 'Set the Agenda',
      hint: 'Entertain a Motion to set the order in which the topics are taken.',
      done: agendaSet,
      to: '/chair/motions',
    },
    {
      id: 'speakers',
      label: 'Open the General Speakers’ List',
      hint: 'Recognise the first speaker to open general debate.',
      done: speakersOpened,
      to: '/chair/speakers',
    },
    {
      id: 'debate',
      label: 'Debate the Topic',
      hint: 'Moderated and Unmoderated Caucuses, and the Motions that open them.',
      done: debated,
      to: '/chair/motions',
    },
    {
      id: 'resolutions',
      label: 'Introduce Draft Resolutions',
      hint: 'Record the draft, its Main Submitters and Signatories, then introduce it.',
      done: resolutionIntroduced,
      to: '/chair/resolutions',
    },
    {
      id: 'voting',
      label: 'Voting Procedure',
      hint: 'Vote on Amendments, then on the Draft Resolution itself.',
      done: voted,
      to: '/chair/resolutions',
    },
    {
      id: 'adjourn',
      label: 'Adjourn the Meeting',
      hint: 'Entertain a Motion to adjourn once the committee has finished.',
      done: adjourned,
      to: '/chair/motions',
    },
  ];
}

/** The first step not yet done — where the committee actually is. */
export function currentStepIndex(steps: ChecklistStep[]): number {
  const index = steps.findIndex((step) => !step.done);
  return index === -1 ? steps.length - 1 : index;
}
