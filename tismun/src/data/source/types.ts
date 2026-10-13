/**
 * The shape of the conference data, and the single interface every page reads
 * through. Swapping mock JSON for the live Google Sheet means swapping the
 * implementation in ./index.ts — no component touches a JSON file directly.
 */

/** Roles come from the "Role" column of the sheet. Add new ones here. */
import type { ConferenceStatus, OverrideAction } from '@/config/emergency';
import type { Access } from '@/lib/access';
import type { AmendmentStatus, CommitteeResState, Copy, CopyOp, Floor, TopicNo, TopicState, Votes } from '@/lib/resolution';

export const ROLES = ['DELEGATE', 'CHAIR', 'SECRETARIAT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  email: string;
  fullName: string;
  role: Role;
  /** Optional on-screen post, e.g. "Secretary-General". Usually null. */
  title: string | null;
  /** null when the user has not been assigned to a committee yet. */
  committeeId: string | null;
  /** null for chairs and unassigned users. */
  country: string | null;
  /** ISO 3166-1 alpha-2, uppercase. null when there is no country. */
  countryCode: string | null;
  /**
   * The Emergency Session on Day 2, if this person takes part: as a delegate
   * for a country (known in advance), or as one of its chairs.
   */
  emergency: EmergencyAssignment | null;
  /**
   * What this account may do right now — which committee it may run, which it
   * may read, and whether it oversees the conference. Worked out by the server
   * from the sheet and its own clock; it changes when Day 2 begins.
   */
  access: Access;
  /**
   * Set while the site's owner tests the site as a delegate: the seat this
   * account is being shown as. Everything else on this record is that seat's.
   */
  testing: TestingSeat | null;
}

/** A delegate's seat, as the owner tests it. */
export interface TestingSeat {
  committeeId: string;
  country: string;
  /** Shown as on Day 2, with the Emergency Session topic released — to the owner alone. */
  day2: boolean;
}

/** Every seat the owner can test as, committee by committee. */
export interface TestOptions {
  seat: TestingSeat | null;
  options: { committeeId: string; name: string; abbreviation: string; countries: string[] }[];
}

export interface EmergencyAssignment {
  role: 'DELEGATE' | 'CHAIR';
  /** The country this person represents in the Emergency Session. Delegates only. */
  country: string | null;
  countryCode: string | null;
}

/** One member of an Emergency Session delegation. Never carries an email address. */
export interface DelegationMember {
  fullName: string;
  /** The committee they sit in on Day 1, so teammates can place each other. */
  day1CommitteeId: string | null;
  day1Role: 'DELEGATE' | 'CHAIR' | 'SECRETARIAT';
  you: boolean;
}

/** A country's Emergency Session delegation: the people representing it together. */
export interface EmergencyDelegation {
  country: string;
  countryCode: string | null;
  members: DelegationMember[];
}

export interface Committee {
  id: string;
  name: string;
  abbreviation: string;
  topics: [string, string];
  chairs: string[];
  room: string;
  backgroundPaperUrl: string;
  description: string;
  /**
   * The Emergency Session before release: the server has removed its topic,
   * description and paper, and only its name, room and chairs are known.
   */
  locked: boolean;
}

/** One seat in a committee — what a chair needs to run the room. */
export interface Delegation {
  /** Stable key: the committee-scoped country code. */
  id: string;
  country: string;
  countryCode: string;
  delegateName: string;
  email: string;
}

export interface DataSource {
  /** The signed-in user's own record. */
  getMe(email: string): Promise<User | null>;
  /** Public committee information — safe for every role. */
  getCommittees(): Promise<Committee[]>;
  getCommittee(id: string): Promise<Committee | null>;
  /**
   * Every delegation in a committee. Chairs only, and only for their own
   * committee — enforced server-side in live mode.
   */
  getRoster(committeeId: string): Promise<Delegation[]>;
  /**
   * The signed-in delegate's own Emergency Session delegation — their country
   * and teammates, worked out by the server. null for anyone not representing
   * a country in the Emergency Session.
   */
  getMyDelegation(): Promise<EmergencyDelegation | null>;
  /** Every Emergency Session delegation. Its chairs and the Secretariat only. */
  getAllDelegations(): Promise<EmergencyDelegation[]>;
  /** Where the conference stands on the server's clock: release and Day 2. */
  getConferenceStatus(): Promise<ConferenceStatus>;
  /** Secretariat only: the release status and every override made. */
  getEmergencyAdmin(): Promise<EmergencyAdmin>;
  /** Secretariat only: a backup override of the schedule. */
  setEmergencyOverride(action: OverrideAction): Promise<EmergencyAdmin>;
  /** Secretariat only: when every committee's session was last reset. */
  getSessionsReset(): Promise<SessionsReset>;
  /** Secretariat only: reset every committee's session, logs and awards. */
  resetAllSessions(): Promise<SessionsReset>;
  /** Owners only: who is online now and the sign-in log. */
  getActivity(): Promise<ActivityLog>;
  /** Live mode: the open page's heartbeat, for "online now". */
  ping?(): Promise<void>;
  /** Demo mode: note a demo sign-in or sign-out, so the demo log has something in it. */
  recordDemoActivity?(kind: 'sign-in' | 'sign-out', email: string): void;
  /**
   * A committee's resolution workspace: its amendments and votes, and — for a
   * delegate — every copy of the topic they may edit. Its delegates, chairs
   * and the Secretariat only.
   */
  getResolutions(committeeId: string, topic: TopicNo, withCountries?: boolean): Promise<ResWorkspace>;
  /** Edit or submit a copy, or — chairs — record a decision. */
  resolutionAction(committeeId: string, action: ResAction): Promise<ResActionResult>;
  /** Owners only: the seat being tested, and every seat there is. */
  getTestOptions(): Promise<TestOptions>;
  /** Owners only: see the whole site as this seat's delegate. */
  startTest(seat: TestingSeat): Promise<void>;
  /** Be yourself again. */
  stopTest(): Promise<void>;
  /**
   * Demo mode only: the list the login page's user picker is built from.
   * Undefined in live mode, where you may never enumerate users.
   */
  listDemoUsers?(): Promise<User[]>;
}

/* ─── Sheet row shapes ─────────────────────────────────────────────────────
 * These mirror the Google Sheet tabs column-for-column. Both the mock source
 * and the live API return rows in this shape, so exactly one normaliser turns
 * spreadsheet rows into the typed objects above.
 */

export interface UserRow {
  Email: string;
  'Full Name': string;
  Role: string;
  'Committee ID': string;
  Country: string;
  /**
   * Optional. Worked out from Country when blank or absent; only needed to
   * override a name the site does not recognise.
   */
  'Country Code'?: string;
  /** Optional on-screen post, e.g. "Secretary-General". Not needed. */
  Title?: string;
  /** Blank: not in the Emergency Session. DELEGATE or CHAIR otherwise. */
  'Emergency Role'?: string;
  /** The country an Emergency Session delegate represents. */
  'Emergency Country'?: string;
  /** Added by /api/me: what the account may do right now. Not a sheet column. */
  Access?: Access;
  /** Added by /api/me while the owner tests a seat. Not a sheet column. */
  Testing?: TestingSeat | null;
}

export interface CommitteeRow {
  'Committee ID': string;
  Name: string;
  Abbreviation: string;
  'Topic 1': string;
  'Topic 2': string;
  /** Semicolon-separated in the sheet, e.g. "Aziza Karimova; Daniel Whitfield". */
  Chairs: string;
  Room: string;
  'Background Paper URL': string;
  Description: string;
  /** Set by the server on the Emergency Session until its topic is released. */
  Locked?: string;
}

export type { OverrideAction } from '@/config/emergency';

export interface ConferenceEvent {
  id: string;
  at: number;
  action: OverrideAction | string;
  detail: string | null;
  byName: string | null;
}

export interface SessionsReset {
  /** false without the live-sync database: there is nothing on the server to reset. */
  available: boolean;
  last: ConferenceEvent | null;
  error?: string;
}

export interface EmergencyAdmin {
  status: ConferenceStatus;
  /** false without the live-sync database: the schedule applies, with no overrides. */
  overridesAvailable: boolean;
  events: ConferenceEvent[];
  error?: string;
}

export type ActivityKind = 'sign-in' | 'sign-out' | 'visit' | 'denied';

/** One line of the sign-in log. Role, committee and country are as the sheet had them at the time. */
export interface ActivityEvent {
  id: string;
  at: number;
  kind: ActivityKind;
  email: string;
  name: string | null;
  role: string | null;
  committeeId: string | null;
  country: string | null;
  /** "iPhone · Safari" — never anything more identifying. */
  device: string | null;
}

/** When someone was last seen on the site. */
export interface Presence {
  email: string;
  name: string | null;
  role: string | null;
  committeeId: string | null;
  country: string | null;
  device: string | null;
  lastSeen: number;
}

export interface ActivityLog {
  /** false without the live-sync database: nothing is recorded. */
  available: boolean;
  presence: Presence[];
  events: ActivityEvent[];
  /** The server's clock when it answered, so "2 min ago" is measured against it. */
  now: number;
  error?: string;
}

/* ─── Resolutions ─────────────────────────────────────────────────────── */

export interface ResCountry {
  name: string;
  code: string | null;
}

export interface ResMe {
  /** delegate: edits copies. chair: runs the committee. viewer: Secretariat or a Day 1 chair reading back. */
  role: 'delegate' | 'chair' | 'viewer';
  country: string | null;
  /** Matches the holder of a clause this person is typing in. */
  key: string;
  name: string;
}

export interface ResWorkspace {
  /** false without the database: amendments cannot be written. */
  available: boolean;
  serverNow: number;
  me?: ResMe;
  state?: CommitteeResState;
  copies?: Copy[];
  countries?: ResCountry[];
  error?: string;
}

export type ResAction =
  | { action: 'edit'; topic: TopicNo; copyId: string | null; ops: CopyOp[] }
  | { action: 'submit'; topic: TopicNo; copyId: string }
  | { action: 'withdraw'; amendmentId: string }
  | { action: 'decide'; amendmentId: string; status: AmendmentStatus; votes: Votes | null }
  | { action: 'resolution'; topic: TopicNo; status: TopicState['status']; votes: Votes | null }
  | { action: 'floor'; floor: Omit<Floor, 'at'> | null }
  | { action: 'adopt'; draftId: string };

export interface ResActionResult {
  serverNow: number;
  state?: CommitteeResState;
  copy?: Copy;
  /** Clauses someone else was typing in, so the change did not go through. */
  refused?: string[];
  /** What a submission became: amendment numbers, or the draft's number. */
  numbers?: number[];
}
