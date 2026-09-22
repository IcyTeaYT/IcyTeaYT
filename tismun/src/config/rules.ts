/**
 * TISMUN rules of procedure.
 *
 * This is the ONE file the Secretariat edits to match how our conference runs.
 * Change a majority, reorder disruptiveness, add or remove a motion type here
 * and the whole Chair Dashboard follows: the motion form, the required-majority
 * badge, the pass/fail maths and the order motions sit on the floor.
 */

export type MajorityKind = 'simple' | 'two-thirds';

export type MotionTypeId =
  | 'speaking-time'
  | 'moderated-caucus'
  | 'unmoderated-caucus'
  | 'set-agenda'
  | 'introduce-resolution'
  | 'introduce-amendment'
  | 'divide-question'
  | 'close-debate'
  | 'voting-procedure'
  | 'table-topic'
  | 'suspend-meeting'
  | 'adjourn-meeting';

/** A parameter the chair fills in when the motion is raised. */
export interface MotionField {
  key: string;
  label: string;
  /** 'duration' renders an mm:ss stepper; 'text' renders a single-line input. */
  kind: 'duration' | 'text';
  defaultValue: number | string;
  required?: boolean;
  placeholder?: string;
}

export interface MotionRule {
  id: MotionTypeId;
  label: string;
  /** Required majority of delegations present (abstentions never count). */
  majority: MajorityKind;
  /**
   * Order of disruptiveness. HIGHER sits higher on the floor and is voted on
   * first. Ties between two caucuses break on the longer total time.
   */
  disruptiveness: number;
  /** Parameters collected when raising this motion. */
  fields: MotionField[];
  /** If set, a passed motion offers a one-click handoff to that caucus tool. */
  startsCaucus?: 'moderated' | 'unmoderated';
  /** One line shown under the motion type in the form. */
  hint: string;
}

export const DEFAULTS = {
  /** General Speakers' List speaking time. */
  speakingTimeSec: 90,
  moderatedTotalSec: 10 * 60,
  moderatedSpeakerSec: 60,
  unmoderatedSec: 10 * 60,
  suspendSec: 15 * 60,
  /** Chair can extend a caucus by this much with one click. */
  extensionSec: 5 * 60,
} as const;

export const QUORUM = {
  /**
   * Fraction of the committee that must be present for debate to open.
   * One third is the UN default; set to 0.5 for a simple-majority quorum.
   */
  fraction: 1 / 3,
  label: 'one third',
} as const;

export const VOTING = {
  /** Majority required to pass a draft resolution. */
  resolution: 'simple' as MajorityKind,
  /** Majority required to pass an unfriendly amendment. */
  amendment: 'simple' as MajorityKind,
  /**
   * Abstentions are excluded from the majority calculation: the threshold is
   * computed on votes cast (for + against), not on delegations present.
   * Set to true if your rules count abstentions against the motion.
   */
  abstentionsCountTowardMajority: false,
  /**
   * Delegations that answered "Present and Voting" at roll call forfeit the
   * right to abstain on substantive votes. Enforced in the voting tool.
   */
  presentAndVotingCannotAbstain: true,
} as const;

/**
 * Motion types, in the order they appear in the "Raise motion" dropdown.
 * `disruptiveness` — not this array order — decides the order on the floor.
 */
export const MOTIONS: MotionRule[] = [
  {
    id: 'adjourn-meeting',
    label: 'Adjourn the meeting',
    majority: 'simple',
    disruptiveness: 100,
    fields: [],
    hint: 'Ends the committee session for the conference.',
  },
  {
    id: 'suspend-meeting',
    label: 'Suspend the meeting',
    majority: 'simple',
    disruptiveness: 90,
    fields: [
      { key: 'totalTimeSec', label: 'Duration', kind: 'duration', defaultValue: DEFAULTS.suspendSec },
    ],
    hint: 'Pauses committee until the stated time — used for lunch and breaks.',
  },
  {
    id: 'table-topic',
    label: 'Table the topic / Adjourn debate',
    majority: 'two-thirds',
    disruptiveness: 80,
    fields: [],
    hint: 'Sets the current topic aside without voting on it.',
  },
  {
    id: 'close-debate',
    label: 'Close debate',
    majority: 'two-thirds',
    disruptiveness: 70,
    fields: [],
    hint: 'Ends debate on the topic and moves the committee to voting procedure.',
  },
  {
    id: 'voting-procedure',
    label: 'Move into voting procedure',
    majority: 'two-thirds',
    disruptiveness: 65,
    fields: [],
    hint: 'Opens voting on the draft resolutions on the floor.',
  },
  {
    id: 'divide-question',
    label: 'Divide the question',
    majority: 'simple',
    disruptiveness: 60,
    fields: [
      {
        key: 'note',
        label: 'Clauses to separate',
        kind: 'text',
        defaultValue: '',
        required: true,
        placeholder: 'e.g. Operative clauses 4 and 5',
      },
    ],
    hint: 'Votes on operative clauses separately from the rest of the resolution.',
  },
  {
    id: 'unmoderated-caucus',
    label: 'Unmoderated caucus',
    majority: 'simple',
    disruptiveness: 50,
    startsCaucus: 'unmoderated',
    fields: [
      { key: 'totalTimeSec', label: 'Duration', kind: 'duration', defaultValue: DEFAULTS.unmoderatedSec },
      {
        key: 'purpose',
        label: 'Purpose',
        kind: 'text',
        defaultValue: '',
        placeholder: 'e.g. Draft resolution writing',
      },
    ],
    hint: 'Suspends formal debate so delegates can lobby and write freely.',
  },
  {
    id: 'moderated-caucus',
    label: 'Moderated caucus',
    majority: 'simple',
    disruptiveness: 40,
    startsCaucus: 'moderated',
    fields: [
      { key: 'totalTimeSec', label: 'Total time', kind: 'duration', defaultValue: DEFAULTS.moderatedTotalSec },
      { key: 'speakingTimeSec', label: 'Speaking time', kind: 'duration', defaultValue: DEFAULTS.moderatedSpeakerSec },
      {
        key: 'topic',
        label: 'Topic',
        kind: 'text',
        defaultValue: '',
        required: true,
        placeholder: 'e.g. Funding mechanisms for early-warning systems',
      },
    ],
    hint: 'Focused debate on one sub-topic, with the chair recognising speakers.',
  },
  {
    id: 'speaking-time',
    label: 'Set / change speaking time',
    majority: 'simple',
    disruptiveness: 30,
    fields: [
      { key: 'speakingTimeSec', label: 'New speaking time', kind: 'duration', defaultValue: DEFAULTS.speakingTimeSec },
    ],
    hint: 'Changes the time each delegate gets on the General Speakers’ List.',
  },
  {
    id: 'introduce-amendment',
    label: 'Introduce an amendment',
    majority: 'simple',
    disruptiveness: 20,
    fields: [
      {
        key: 'note',
        label: 'Amendment',
        kind: 'text',
        defaultValue: '',
        required: true,
        placeholder: 'e.g. Amendment 1 to DR 1.1',
      },
    ],
    hint: 'Puts an amendment to a draft resolution on the floor.',
  },
  {
    id: 'introduce-resolution',
    label: 'Introduce a draft resolution',
    majority: 'simple',
    disruptiveness: 15,
    fields: [
      {
        key: 'note',
        label: 'Draft resolution',
        kind: 'text',
        defaultValue: '',
        required: true,
        placeholder: 'e.g. DR 1.1',
      },
    ],
    hint: 'Reads a draft resolution into the record for debate.',
  },
  {
    id: 'set-agenda',
    label: 'Open / set the agenda',
    majority: 'simple',
    disruptiveness: 10,
    fields: [
      {
        key: 'note',
        label: 'Proposed order',
        kind: 'text',
        defaultValue: '',
        required: true,
        placeholder: 'e.g. Topic 2 first, then Topic 1',
      },
    ],
    hint: 'Fixes the order in which the committee takes its topics.',
  },
];

export const MOTION_BY_ID: Record<MotionTypeId, MotionRule> = Object.fromEntries(
  MOTIONS.map((m) => [m.id, m]),
) as Record<MotionTypeId, MotionRule>;

export const MAJORITY_LABEL: Record<MajorityKind, string> = {
  simple: 'Simple majority',
  'two-thirds': 'Two-thirds majority',
};
