import { flowFor, type FlowStepId } from '@/config/flows';
import { DEFAULTS, MOTION_BY_ID, PRESENTATION, type MotionTypeId } from '@/config/rules';
import { hasQuorum, quorumNeeded } from '@/lib/majority';
import { formatClock } from '@/lib/time';
import { presentIds, type ChairData, type TimerKey } from './store';

/**
 * Guided Mode: the committee's order of business, and what to do next.
 *
 * The labels here are the official terms and nothing else — a chair who learns
 * this screen is learning the rules of procedure, not a simplified dialect of
 * them. What Guided Mode makes easy is finding the right control, not knowing
 * what it is called.
 */

export type GuidedCommand =
  | 'mark-all-present'
  | 'gsl-next'
  | 'unmod-motion'
  | 'unmod-extend'
  | 'unmod-end'
  | 'present-questions'
  | 'present-end';

export interface GuidedAction {
  label: string;
  emphasis: 'primary' | 'secondary';
  /** Icon name resolved by the view, so this module stays free of JSX. */
  icon:
    | 'clipboard'
    | 'play'
    | 'skip'
    | 'plus'
    | 'stop'
    | 'gavel'
    | 'list'
    | 'vote'
    | 'users'
    | 'coffee'
    | 'mic'
    | 'question'
    | 'file';
  /** Either a route to open, or a command to run against the session. */
  to?: string;
  /** With `to: '/chair/motions'`, the motion to have ready in the form. */
  motion?: MotionTypeId;
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

/* ── The order of business ────────────────────────────────────────────────── */

export interface ChecklistStep {
  id: FlowStepId;
  /** The official name of this stage of the session. */
  label: string;
  hint: string;
  done: boolean;
  /** Where the chair goes to do it. */
  to: string;
}

const passed = (state: ChairData, type: MotionTypeId): boolean =>
  state.motions.some((motion) => motion.type === type && motion.status === 'passed');

const decided = (state: ChairData): boolean =>
  state.resolutions.some((r) => r.status === 'passed' || r.status === 'failed');

/**
 * Whether each step has happened, read from the session itself rather than
 * ticked by anyone — so the list cannot disagree with what the room did.
 */
function isDone(id: FlowStepId, state: ChairData): boolean {
  switch (id) {
    case 'roll-call':
      return (
        state.rollCallTakenAt !== null &&
        hasQuorum(presentIds(state.attendance).length, Object.keys(state.names).length)
      );
    case 'agenda':
      return passed(state, 'set-agenda');
    case 'present-draft':
      return state.presentationsHeld > 0;
    case 'gsl':
      return state.gsl.currentId !== null || state.gsl.spoken.length > 0;
    case 'unmod-motion':
      return passed(state, 'unmoderated-caucus');
    case 'unmod':
      return state.unmoderatedHeld > 0;
    // The loop between the Speakers' List and further caucuses ends when
    // debate is closed.
    case 'continue-debate':
    case 'close-debate':
      return passed(state, 'close-debate');
    case 'voting':
    case 'result':
      return decided(state);
  }
}

const ROUTE: Record<FlowStepId, string> = {
  'roll-call': '/chair/roll-call',
  agenda: '/chair/motions',
  'present-draft': '/chair/presentation',
  gsl: '/chair/speakers',
  'unmod-motion': '/chair/unmoderated',
  unmod: '/chair/unmoderated',
  'continue-debate': '/chair/speakers',
  'close-debate': '/chair/motions',
  voting: '/chair/resolutions',
  result: '/chair/resolutions',
};

export function sessionChecklist(state: ChairData, committeeId: string): ChecklistStep[] {
  const present = presentIds(state.attendance).length;
  const total = Object.keys(state.names).length;

  return flowFor(committeeId).steps.map((step) => ({
    id: step.id,
    label: step.label,
    // The Roll Call step says where quorum stands, since that is what it waits on.
    hint:
      step.id === 'roll-call' && state.rollCallTakenAt !== null
        ? `${step.hint} ${present} of ${total} present; ${quorumNeeded(total)} needed.`
        : step.hint,
    done: isDone(step.id, state),
    to: ROUTE[step.id],
  }));
}

/** The first step not yet done — where the committee actually is. */
export function currentStepIndex(steps: ChecklistStep[]): number {
  const index = steps.findIndex((step) => !step.done);
  return index === -1 ? steps.length - 1 : index;
}

/* ── What to do now ──────────────────────────────────────────────────────── */

const UNMOD_MOTION: GuidedAction = {
  label: 'Motion for an Unmoderated Caucus',
  emphasis: 'primary',
  icon: 'coffee',
  command: 'unmod-motion',
};

export function guidedStage(state: ChairData, committeeId: string): GuidedStage {
  const present = presentIds(state.attendance);
  const total = Object.keys(state.names).length;
  const quorum = hasQuorum(present.length, total);
  const onFloor = state.motions.filter((motion) => motion.status === 'floor');

  /* Whatever is happening right now outranks the order of business. */

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

  if (state.presentation.active) {
    const presenter = state.presentation.presenterId
      ? (state.names[state.presentation.presenterId] ?? 'The Main Submitter')
      : 'The Main Submitter';
    if (state.presentation.phase === 'questions') {
      return {
        stage: 'Question-and-Answer Period',
        headline: presenter,
        hint: 'Delegates put questions to the presenting delegation.',
        timer: { key: 'present', label: 'Questions' },
        actions: [
          {
            label: 'End the question-and-answer period',
            emphasis: 'primary',
            icon: 'stop',
            command: 'present-end',
          },
        ],
      };
    }
    return {
      stage: 'Presentation of the Draft Resolution',
      headline: presenter,
      hint: 'The Main Submitter presents the draft resolution to the committee.',
      timer: { key: 'present', label: 'Presentation time' },
      actions: [
        {
          label: `Open questions (${formatClock(PRESENTATION.qaSec * 1000)})`,
          emphasis: 'primary',
          icon: 'question',
          command: 'present-questions',
        },
        {
          label: 'Skip questions and finish',
          emphasis: 'secondary',
          icon: 'skip',
          command: 'present-end',
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
        { label: 'Close the Caucus', emphasis: 'primary', icon: 'stop', command: 'unmod-end' },
        {
          label: `Extend the Caucus by ${formatClock(DEFAULTS.extensionSec * 1000)}`,
          emphasis: 'secondary',
          icon: 'plus',
          command: 'unmod-extend',
        },
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

  /* Otherwise, the next step in this committee's order of business. */
  const steps = sessionChecklist(state, committeeId);
  const step = steps[currentStepIndex(steps)];
  const current = state.gsl.queue.find((entry) => entry.id === state.gsl.currentId) ?? null;

  switch (step?.id) {
    case 'agenda':
      return {
        stage: 'Setting the Agenda',
        headline: 'Setting the Agenda',
        hint: 'Entertain a Motion to Open / Set the Agenda from the floor.',
        timer: null,
        actions: [
          {
            label: 'Entertain a Motion to Set the Agenda',
            emphasis: 'primary',
            icon: 'gavel',
            to: '/chair/motions',
            motion: 'set-agenda',
          },
        ],
      };

    case 'present-draft':
      return {
        stage: 'Presentation of the Draft Resolution',
        headline: 'Presentation of the Draft Resolution',
        hint: 'The Main Submitter presents the draft resolution, then an optional question-and-answer period.',
        timer: null,
        actions: [
          {
            label: 'Start the presentation',
            emphasis: 'primary',
            icon: 'mic',
            to: '/chair/presentation',
          },
        ],
      };

    case 'unmod':
      return {
        stage: 'Unmoderated Caucus',
        headline: 'The Motion for an Unmoderated Caucus has passed',
        hint: 'Open the caucus to start its clock.',
        timer: null,
        actions: [
          {
            label: 'Open the Unmoderated Caucus',
            emphasis: 'primary',
            icon: 'coffee',
            to: '/chair/unmoderated',
          },
        ],
      };

    case 'close-debate':
      return {
        stage: 'Close Debate',
        headline: 'Close Debate',
        hint: 'Entertain a Motion to Close Debate once the committee is ready to vote.',
        timer: null,
        actions: [
          {
            label: 'Entertain a Motion to Close Debate',
            emphasis: 'primary',
            icon: 'gavel',
            to: '/chair/motions',
            motion: 'close-debate',
          },
        ],
      };

    case 'voting':
      return {
        stage: 'Voting Procedure',
        headline: 'Voting Procedure',
        hint: 'Vote on any Unfriendly Amendments, then on the Draft Resolution itself.',
        timer: null,
        actions: [
          { label: 'Open Voting Procedure', emphasis: 'primary', icon: 'vote', to: '/chair/resolutions' },
        ],
      };

    case 'result': {
      const last = [...state.resolutions]
        .filter((r) => r.status === 'passed' || r.status === 'failed')
        .pop();
      return {
        stage: 'Result',
        headline: last
          ? `${last.number} ${last.status === 'passed' ? 'passed' : 'failed'}`
          : 'Result',
        hint: 'Announce the result to the committee.',
        timer: null,
        actions: [
          { label: 'See the full result', emphasis: 'primary', icon: 'file', to: '/chair/resolutions' },
          {
            label: 'Entertain a Motion to Adjourn the Meeting',
            emphasis: 'secondary',
            icon: 'gavel',
            to: '/chair/motions',
            motion: 'adjourn-meeting',
          },
        ],
      };
    }

    default:
      break;
  }

  /*
   * The General Speakers' List and Unmoderated Caucuses in between: the heart
   * of debate. A Motion for an Unmoderated Caucus is what delegates raise most,
   * so it is always one tap away here.
   */
  const closeDebate: GuidedAction = {
    label: 'Entertain a Motion to Close Debate',
    emphasis: 'secondary',
    icon: 'gavel',
    to: '/chair/motions',
    motion: 'close-debate',
  };
  const debateStarted = step?.id === 'continue-debate';

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
        UNMOD_MOTION,
        {
          label: 'Manage the Speakers’ List',
          emphasis: 'secondary',
          icon: 'list',
          to: '/chair/speakers',
        },
        ...(debateStarted ? [closeDebate] : []),
      ],
    };
  }

  return {
    stage: 'General Speakers’ List',
    headline: debateStarted ? 'Back to the General Speakers’ List' : 'General Speakers’ List',
    hint:
      state.gsl.queue.length > 0
        ? `${state.gsl.queue.length} on the General Speakers’ List. Recognise the first speaker, or entertain a Motion for an Unmoderated Caucus.`
        : 'Open the General Speakers’ List, or entertain a Motion for an Unmoderated Caucus.',
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
      UNMOD_MOTION,
      ...(debateStarted ? [closeDebate] : []),
    ],
  };
}
