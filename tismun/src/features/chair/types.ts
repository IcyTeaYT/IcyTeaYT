import type { AwardType } from '@/config/awards';
import type { MotionTypeId } from '@/config/rules';
import type { TimerState } from '@/lib/timer';

export type Attendance = 'present' | 'present-voting' | 'absent';

/** Everything a delegation can answer at roll call, in display order. */
export const ATTENDANCE_OPTIONS: { value: Attendance; label: string; short: string }[] = [
  { value: 'present', label: 'Present', short: 'P' },
  { value: 'present-voting', label: 'Present and Voting', short: 'P&V' },
  { value: 'absent', label: 'Absent', short: 'A' },
];

export interface SpeakerEntry {
  id: string;
  delegationId: string;
  yielded?: { kind: 'chair' | 'delegate' | 'questions'; toDelegationId?: string };
}

export interface GslState {
  speakingTimeSec: number;
  queue: SpeakerEntry[];
  spoken: SpeakerEntry[];
  currentId: string | null;
  timer: TimerState;
}

export interface UnmoderatedState {
  active: boolean;
  purpose: string;
  proposedBy: string | null;
  timer: TimerState;
}

/**
 * A delegation presenting a draft resolution to the committee, followed by an
 * optional question-and-answer period on the same clock.
 */
export interface PresentationState {
  active: boolean;
  /**
   * 'draft': a delegation presents a draft resolution. 'briefing': the chairs
   * present the Emergency Session topic — the crisis briefing.
   */
  kind: 'draft' | 'briefing';
  /** The draft resolution being presented, if it is on file. */
  resolutionId: string | null;
  /** The presenting delegation — normally the Main Submitter. */
  presenterId: string | null;
  phase: 'presenting' | 'questions';
  timer: TimerState;
}

export type MotionStatus = 'floor' | 'passed' | 'failed' | 'withdrawn';

export interface Motion {
  id: string;
  type: MotionTypeId;
  proposedBy: string;
  /** Values for the fields the rule declares, e.g. totalTimeSec, topic. */
  params: Record<string, string | number>;
  status: MotionStatus;
  votesFor: number;
  votesAgainst: number;
  raisedAt: number;
  decidedAt: number | null;
  /** True once a passed caucus motion has been handed to the caucus tool. */
  started: boolean;
}

export type ResolutionStatus =
  | 'draft'
  | 'introduced'
  | 'debate'
  | 'voting'
  | 'passed'
  | 'failed';

export const RESOLUTION_FLOW: ResolutionStatus[] = [
  'draft',
  'introduced',
  'debate',
  'voting',
  'passed',
];

export const RESOLUTION_LABEL: Record<ResolutionStatus, string> = {
  draft: 'Draft',
  introduced: 'Introduced',
  debate: 'In debate',
  voting: 'In voting',
  passed: 'Passed',
  failed: 'Failed',
};

export interface Resolution {
  id: string;
  number: string;
  title: string;
  mainSubmitters: string[];
  signatories: string[];
  link: string;
  status: ResolutionStatus;
  createdAt: number;
}

export type AmendmentStatus = 'pending' | 'accepted' | 'passed' | 'failed' | 'withdrawn';

export interface Amendment {
  id: string;
  resolutionId: string;
  submittedBy: string;
  clause: string;
  text: string;
  /** Friendly amendments are accepted without a vote. */
  friendly: boolean;
  status: AmendmentStatus;
  createdAt: number;
}

export type RollCallChoice = 'yes' | 'no' | 'abstain' | 'pass';

export interface VoteSession {
  id: string;
  subjectKind: 'resolution' | 'amendment';
  subjectId: string;
  subjectLabel: string;
  mode: 'placard' | 'roll-call';
  placard: { for: number; against: number; abstain: number };
  rollCall: Record<string, RollCallChoice | null>;
  /** Delegations that passed in the first round are asked again at the end. */
  secondRound: boolean;
  /**
   * Who the second round is calling, fixed when it opens. Recomputing this from
   * "who is still passing" would make each delegation disappear the moment it
   * voted, leaving the chair unable to see or correct what they just recorded.
   */
  secondRoundIds: string[];
  startedAt: number;
}

export type LogType =
  | 'session'
  | 'roll-call'
  | 'speaker'
  | 'caucus'
  | 'motion'
  | 'resolution'
  | 'vote'
  | 'presentation'
  | 'award';

export const LOG_LABEL: Record<LogType, string> = {
  session: 'Session',
  'roll-call': 'Roll call',
  speaker: 'Speakers',
  caucus: 'Caucus',
  motion: 'Motion',
  resolution: 'Resolution',
  vote: 'Vote',
  presentation: 'Presentation',
  award: 'Award',
};

export interface LogEntry {
  id: string;
  at: number;
  type: LogType;
  summary: string;
  detail?: string;
}

/** What the header and the projector describe the committee as doing. */
export type SessionStatus =
  | 'Not in session'
  | 'In session'
  | 'General Speakers’ List'
  | 'Crisis Briefing'
  | 'Presentation of the Draft Resolution'
  | 'Question-and-Answer Period'
  | 'Unmoderated Caucus'
  | 'Voting Procedure';

/**
 * An award as given. The country and delegate names are copied in at the time,
 * so the record still reads correctly if the roster changes afterwards.
 */
export interface Award {
  type: AwardType;
  delegationId: string;
  country: string;
  countryCode: string | null;
  delegateName: string;
  awardedAt: number;
}
