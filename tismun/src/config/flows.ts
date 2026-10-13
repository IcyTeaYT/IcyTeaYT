/**
 * The order of business each committee follows in Guided Mode — TISMUN's
 * order of events, step by step. Edit a label or hint here and Guided Mode
 * follows; each step knows for itself when it is done by reading the session
 * (see src/features/chair/guide.ts), so the list can never disagree with what
 * actually happened in the room.
 *
 * Every Day 1 committee debates two pre-written resolutions, Topic 1 then
 * Topic 2, each the same way. Note passing is suspended during any voting.
 */

import { emergencySession } from './emergency';

export type FlowStepId =
  | 'roll-call'
  | 'crisis-briefing'
  | 'unmod-writing'
  | 'choose-draft'
  | 'reading'
  | 'present-draft'
  | 'speeches-for'
  | 'speeches-against'
  | 'unmod'
  | 'debate-amendments'
  | 'more-amendments'
  | 'closing-speeches'
  | 'voting'
  | 'result';

export interface FlowStep {
  id: FlowStepId;
  /** The name of this stage of the session. */
  label: string;
  hint: string;
}

export interface CommitteeFlow {
  steps: FlowStep[];
  /** What an Unmoderated Caucus is for, unless the delegate who moves it says otherwise. */
  unmoderatedPurpose: string;
}

/** Debate on one resolution, from Reading Time to the result. */
const DEBATE_STEPS: FlowStep[] = [
  {
    id: 'reading',
    label: 'Reading Time',
    hint: 'Delegates read the resolution on their phones or on paper.',
  },
  {
    id: 'present-draft',
    label: 'Presentation of the Resolution',
    hint: 'The Main Submitter presents it, then takes Points of Clarification and Points of Information, then yields the floor back to the Chair.',
  },
  {
    id: 'speeches-for',
    label: 'Speeches in Favour',
    hint: 'Delegates speak for the resolution. Points of Information after each speech.',
  },
  {
    id: 'speeches-against',
    label: 'Speeches Against',
    hint: 'Delegates speak against the resolution. Points of Information after each speech.',
  },
  {
    id: 'unmod',
    label: 'Unmoderated Caucus for Amendments',
    hint: 'About 15–20 minutes — usually extended. Delegates write amendments on the site and submit them.',
  },
  {
    id: 'debate-amendments',
    label: 'Debate on Amendments',
    hint: 'For each amendment, in order: its submitter’s speech, speeches for, speeches against — each with Points of Information — then a vote.',
  },
  {
    id: 'more-amendments',
    label: 'More Amendments?',
    hint: 'If needed, another Unmoderated Caucus for more amendments, then debate those too.',
  },
  {
    id: 'closing-speeches',
    label: 'Closing Speeches',
    hint: 'Speeches for or against the resolution as amended. The chairs recommend the Main Submitter makes closing remarks.',
  },
  {
    id: 'voting',
    label: 'Voting Procedure',
    hint: 'Vote on the resolution. Note passing is suspended.',
  },
  {
    id: 'result',
    label: 'Result',
    hint: 'Announce whether the resolution passed.',
  },
];

export const DAY_ONE_FLOW: CommitteeFlow = {
  unmoderatedPurpose: 'Writing amendments',
  steps: [
    {
      id: 'roll-call',
      label: 'Roll Call',
      hint: 'Record every delegation as Present, Present and Voting, or Absent. Debate opens once quorum is met.',
    },
    ...DEBATE_STEPS,
  ],
};

/**
 * The Emergency Session has no resolution before it sits: the chairs brief the
 * committee, delegates write drafts on the site, and the chairs choose one.
 * From there it is debated exactly like the others.
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
      id: 'unmod-writing',
      label: 'Unmoderated Caucus to Write the Resolution',
      hint: 'Delegates write draft resolutions together on the site and submit them.',
    },
    {
      id: 'choose-draft',
      label: 'Choose the Draft Resolution',
      hint: 'Pick the submitted draft the committee will debate.',
    },
    ...DEBATE_STEPS,
  ],
};

/** Committees that do not follow the Day 1 flow, by committee id. */
const FLOWS: Record<string, CommitteeFlow> = {
  [emergencySession.committeeId]: EMERGENCY_FLOW,
};

export const flowFor = (committeeId: string): CommitteeFlow => FLOWS[committeeId] ?? DAY_ONE_FLOW;
