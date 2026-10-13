import { AWARDS } from '@/config/awards';
import { flowFor, type FlowStepId } from '@/config/flows';
import { hasQuorum, quorumNeeded } from '@/lib/majority';
import type { Amendment, Draft, TopicNo, TopicState, Votes } from '@/lib/resolution';
import { presentIds, stepKey, type ChairData } from './store';
import type { SpeechPart } from './types';

/**
 * Guided Mode: TISMUN's order of events, and the one thing to do next.
 *
 * Steps mark themselves done by reading the session — what has actually
 * happened in the room, and what the server says about the resolution — so
 * the list never disagrees with reality. Every step can also be skipped, for
 * the day the room does something the order of events did not expect.
 */

/** What the server knows about the resolution being debated. */
export interface ResContext {
  loaded: boolean;
  topic: TopicNo;
  topics: TopicNo[];
  status: TopicState['status'];
  votes: Votes | null;
  /** Amendments still to debate, in order. */
  pending: Amendment[];
  /** The Emergency Session, before the chairs adopt a draft. */
  drafting: boolean;
  drafts: Draft[];
  mainSubmitters: string[];
  coSubmitters: string[];
}

export const emptyResContext = (topic: TopicNo): ResContext => ({
  loaded: false,
  topic,
  topics: [topic],
  status: 'open',
  votes: null,
  pending: [],
  drafting: false,
  drafts: [],
  mainSubmitters: [],
  coSubmitters: [],
});

export const skipKey = (topic: TopicNo, step: FlowStepId): string => `t${topic}:skip:${step}`;
export const closingStartedKey = (topic: TopicNo): string => `t${topic}:closing`;
export const closingDoneKey = (topic: TopicNo): string => `t${topic}:closing:done`;
export const amendmentUnmodKey = (topic: TopicNo): string => `t${topic}:amend-unmod`;
export const writingUnmodKey = (topic: TopicNo): string => `t${topic}:writing-unmod`;

const has = (state: ChairData, key: string): boolean => (state.progress?.[key] ?? 0) > 0;
export const count = (state: ChairData, key: string): number => state.progress?.[key] ?? 0;

/** Where the debate on one amendment stands. */
export type AmendmentPart = SpeechPart | 'vote';

export function amendmentPart(state: ChairData, amendment: Amendment): AmendmentPart {
  const key = (part: SpeechPart) => stepKey.amendment(amendment.id, part);
  if (!has(state, key('submitter')) && !has(state, stepKey.movedOn(key('submitter')))) return 'submitter';
  if (!has(state, stepKey.movedOn(key('for')))) return 'for';
  if (!has(state, stepKey.movedOn(key('against')))) return 'against';
  return 'vote';
}

/* ── The order of business ────────────────────────────────────────────────── */

export interface ChecklistStep {
  id: FlowStepId;
  label: string;
  hint: string;
  done: boolean;
}

function isDone(id: FlowStepId, state: ChairData, res: ResContext): boolean {
  const topic = res.topic;
  if (has(state, skipKey(topic, id))) return true;
  // The awards come after the vote, so the vote does not settle them.
  if (id === 'awards') return AWARDS.every((award) => state.awards.some((given) => given.type === award.type));
  // Once the committee has voted on the resolution, everything before the
  // vote is behind it: an amendment left undebated cannot pull it back.
  if (res.status !== 'open') return true;
  switch (id) {
    case 'roll-call':
      return (
        state.rollCallTakenAt !== null &&
        hasQuorum(presentIds(state.attendance).length, Object.keys(state.names).length)
      );
    case 'crisis-briefing':
      return state.briefingsHeld > 0;
    case 'unmod-writing':
      return has(state, writingUnmodKey(topic)) || !res.drafting;
    case 'choose-draft':
      return !res.drafting;
    case 'reading':
      return has(state, stepKey.reading(topic));
    case 'present-draft':
      return has(state, stepKey.presented(topic));
    case 'speeches-for':
      return has(state, stepKey.movedOn(stepKey.speeches(topic, 'for', false)));
    case 'speeches-against':
      return has(state, stepKey.movedOn(stepKey.speeches(topic, 'against', false)));
    case 'unmod':
      return has(state, amendmentUnmodKey(topic));
    case 'debate-amendments':
      // Nothing to debate before the caucus where amendments are written.
      return res.pending.length === 0 && (has(state, amendmentUnmodKey(topic)) || has(state, skipKey(topic, 'unmod')));
    case 'more-amendments':
      return has(state, closingStartedKey(topic));
    case 'closing-speeches':
      return has(state, closingDoneKey(topic));
    case 'voting':
    case 'result':
      return res.status !== 'open';
  }
}

/** The awards close the session: they come after the last topic's resolution only. */
const isLastTopic = (res: ResContext): boolean => res.topics.length === 0 || res.topic >= Math.max(...res.topics);

export function sessionChecklist(state: ChairData, committeeId: string, res: ResContext): ChecklistStep[] {
  const present = presentIds(state.attendance).length;
  const total = Object.keys(state.names).length;
  return flowFor(committeeId)
    .steps.filter((step) => step.id !== 'awards' || isLastTopic(res))
    .map((step) => ({
      id: step.id,
      label: step.label,
      hint:
        step.id === 'roll-call' && state.rollCallTakenAt !== null
          ? `${step.hint} ${present} of ${total} present; ${quorumNeeded(total)} needed.`
          : step.id === 'debate-amendments' && res.pending.length > 0
            ? `${res.pending.length} ${res.pending.length === 1 ? 'amendment' : 'amendments'} to debate. ${step.hint}`
            : step.hint,
      done: isDone(step.id, state, res),
    }));
}

/** The first step not yet done — where the committee actually is. */
export function currentStepIndex(steps: ChecklistStep[]): number {
  const index = steps.findIndex((step) => !step.done);
  return index === -1 ? steps.length - 1 : index;
}

/* ── What to do now ──────────────────────────────────────────────────────── */

/**
 * The screen Guided Mode shows. Whatever is running right now — a vote, a
 * speech, a caucus — outranks the order of business.
 */
export type GuidedScreen =
  | { kind: 'vote' }
  | { kind: 'speech' }
  | { kind: 'reading' }
  | { kind: 'presentation' }
  | { kind: 'unmod' }
  | { kind: 'roll-call' }
  | { kind: 'no-quorum'; present: number; total: number }
  | { kind: 'motions'; count: number }
  | { kind: 'step'; step: FlowStepId; amendment: Amendment | null; part: AmendmentPart | null };

export function guidedScreen(state: ChairData, committeeId: string, res: ResContext): GuidedScreen {
  if (state.vote) return { kind: 'vote' };
  if (state.speech.active) return { kind: 'speech' };
  if (state.reading.active) return { kind: 'reading' };
  if (state.presentation.active) return { kind: 'presentation' };
  if (state.unmoderated.active) return { kind: 'unmod' };
  if (!state.rollCallTakenAt) return { kind: 'roll-call' };

  const present = presentIds(state.attendance).length;
  const total = Object.keys(state.names).length;
  if (!hasQuorum(present, total)) return { kind: 'no-quorum', present, total };

  const onFloor = state.motions.filter((motion) => motion.status === 'floor').length;
  if (onFloor > 0) return { kind: 'motions', count: onFloor };

  const steps = sessionChecklist(state, committeeId, res);
  const step = steps[currentStepIndex(steps)]?.id ?? 'result';
  if (step === 'debate-amendments') {
    const amendment = res.pending[0] ?? null;
    return { kind: 'step', step, amendment, part: amendment ? amendmentPart(state, amendment) : null };
  }
  return { kind: 'step', step, amendment: null, part: null };
}

/**
 * What delegates' screens say the committee is doing, and which amendment —
 * reported to the server whenever it changes.
 */
export function floorOf(
  state: ChairData,
  screen: GuidedScreen,
  res: ResContext,
): { stage: string; amendmentId: string | null } | null {
  switch (screen.kind) {
    case 'vote':
      return {
        stage: 'Voting Procedure',
        amendmentId: state.vote?.subjectKind === 'amendment' ? state.vote.subjectId : null,
      };
    case 'speech': {
      const speech = state.speech;
      const stage =
        speech.phase === 'pois'
          ? 'Points of Information'
          : speech.part === 'submitter'
            ? speech.amendmentId
              ? 'Submitter’s speech'
              : 'Closing remarks'
            : speech.part === 'for'
              ? speech.closing
                ? 'Closing speeches in favour'
                : 'Speeches in favour'
              : speech.closing
                ? 'Closing speeches against'
                : 'Speeches against';
      return { stage, amendmentId: speech.amendmentId };
    }
    case 'reading':
      return { stage: 'Reading Time', amendmentId: null };
    case 'presentation':
      return {
        stage: state.presentation.kind === 'briefing' ? 'Crisis Briefing' : 'Presentation of the Resolution',
        amendmentId: null,
      };
    case 'unmod':
      return {
        stage: res.drafting ? 'Unmoderated Caucus — write your draft' : 'Unmoderated Caucus — write amendments',
        amendmentId: null,
      };
    case 'step':
      if (screen.step === 'debate-amendments' && screen.amendment) {
        return { stage: 'Debate on amendments', amendmentId: screen.amendment.id };
      }
      return null;
    default:
      return null;
  }
}
