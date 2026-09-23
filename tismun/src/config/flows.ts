/**
 * The order of business each committee follows in Guided Mode.
 *
 * Flows are per committee: the Day 1 committees debate a draft resolution that
 * exists before the session starts, so their flow opens with its presentation.
 * Edit a flow here — reorder it, rename a step, change what an Unmoderated
 * Caucus is for by default — and Guided Mode follows.
 *
 * Every step id is one Guided Mode knows how to recognise as done by reading
 * the session itself (see src/features/chair/guide.ts), so the checklist can
 * never disagree with what actually happened in the room.
 */

import { emergencySession } from './emergency';

export type FlowStepId =
  | 'roll-call'
  | 'agenda'
  | 'crisis-briefing'
  | 'present-draft'
  | 'gsl'
  | 'unmod-motion'
  | 'unmod'
  | 'continue-debate'
  | 'continue-writing'
  | 'register-draft'
  | 'debate-amendments'
  | 'close-debate'
  | 'voting'
  | 'result';

export interface FlowStep {
  id: FlowStepId;
  /** The official name of this stage of the session. */
  label: string;
  hint: string;
}

export interface CommitteeFlow {
  steps: FlowStep[];
  /** What an Unmoderated Caucus is for, unless the delegate who moves it says otherwise. */
  unmoderatedPurpose: string;
}

export const DAY_ONE_FLOW: CommitteeFlow = {
  unmoderatedPurpose: 'Editing the draft resolution',
  steps: [
    {
      id: 'roll-call',
      label: 'Roll Call',
      hint: 'Record every delegation as Present, Present and Voting, or Absent. Debate opens once quorum is met.',
    },
    {
      id: 'agenda',
      label: 'Setting the Agenda',
      hint: 'Entertain a Motion to Open / Set the Agenda.',
    },
    {
      id: 'present-draft',
      label: 'Presentation of the Draft Resolution',
      hint: 'The Main Submitter presents the draft resolution, then an optional question-and-answer period.',
    },
    {
      id: 'gsl',
      label: 'General Speakers’ List',
      hint: 'Recognise speakers in turn. Delegates may raise Motions between speeches.',
    },
    {
      id: 'unmod-motion',
      label: 'Motion for an Unmoderated Caucus',
      hint: 'A delegation moves an Unmoderated Caucus to edit the draft resolution. Vote on it.',
    },
    {
      id: 'unmod',
      label: 'Unmoderated Caucus',
      hint: 'Formal debate is suspended while delegates work on the draft resolution.',
    },
    {
      id: 'continue-debate',
      label: 'General Speakers’ List or another Unmoderated Caucus',
      hint: 'Return to the General Speakers’ List, or entertain another Motion for an Unmoderated Caucus.',
    },
    {
      id: 'close-debate',
      label: 'Close Debate',
      hint: 'Entertain a Motion to Close Debate once the committee is ready to vote.',
    },
    {
      id: 'voting',
      label: 'Voting Procedure',
      hint: 'Vote on any Unfriendly Amendments, then on the Draft Resolution itself.',
    },
    {
      id: 'result',
      label: 'Result',
      hint: 'Announce whether the Draft Resolution passed or failed.',
    },
  ],
};

/**
 * The Emergency Session has no draft resolution before it sits: the chairs
 * brief the committee on the crisis, and delegates write the resolution
 * themselves during the session.
 */
export const EMERGENCY_FLOW: CommitteeFlow = {
  unmoderatedPurpose: emergencySession.unmoderatedPurpose,
  steps: [
    {
      id: 'roll-call',
      label: 'Roll Call',
      hint: 'Record every delegation as Present, Present and Voting, or Absent. Debate opens once quorum is met.',
    },
    {
      id: 'crisis-briefing',
      label: 'Crisis Briefing',
      hint: 'The chairs present the topic to the committee.',
    },
    {
      id: 'gsl',
      label: 'General Speakers’ List',
      hint: 'Recognise speakers in turn. Delegates may raise Motions between speeches.',
    },
    {
      id: 'unmod-motion',
      label: 'Motion for an Unmoderated Caucus',
      hint: 'A delegation moves an Unmoderated Caucus to write the draft resolution. Vote on it.',
    },
    {
      id: 'continue-writing',
      label: 'General Speakers’ List or another Unmoderated Caucus',
      hint: 'Return to the General Speakers’ List, or entertain another Unmoderated Caucus, until a draft resolution is submitted.',
    },
    {
      id: 'register-draft',
      label: 'Register the Draft Resolution',
      hint: 'Once delegates submit a draft resolution, record its title, Main Submitter and co-submitters, and a link to the document.',
    },
    {
      id: 'present-draft',
      label: 'Presentation of the Draft Resolution',
      hint: 'The Main Submitter presents the draft resolution, then an optional question-and-answer period.',
    },
    {
      id: 'debate-amendments',
      label: 'Debate and Amendments',
      hint: 'The General Speakers’ List, further Unmoderated Caucuses, and Amendments to the draft resolution.',
    },
    {
      id: 'close-debate',
      label: 'Close Debate',
      hint: 'Entertain a Motion to Close Debate once the committee is ready to vote.',
    },
    {
      id: 'voting',
      label: 'Voting Procedure',
      hint: 'Vote on any Unfriendly Amendments, then on the Draft Resolution itself.',
    },
    {
      id: 'result',
      label: 'Result',
      hint: 'Announce whether the Draft Resolution passed or failed.',
    },
  ],
};

/** Committees that do not follow the Day 1 flow, by committee id. */
const FLOWS: Record<string, CommitteeFlow> = {
  [emergencySession.committeeId]: EMERGENCY_FLOW,
};

export const flowFor = (committeeId: string): CommitteeFlow => FLOWS[committeeId] ?? DAY_ONE_FLOW;
