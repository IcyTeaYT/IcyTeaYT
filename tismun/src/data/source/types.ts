/**
 * The shape of the conference data, and the single interface every page reads
 * through. Swapping mock JSON for the live Google Sheet means swapping the
 * implementation in ./index.ts — no component touches a JSON file directly.
 */

/** Roles come from the "Role" column of the sheet. Add new ones here. */
import type { ConferenceStatus } from '@/config/emergency';
import type { Access } from '@/lib/access';

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

export type OverrideAction =
  | 'release-now'
  | 'unrelease'
  | 'release-auto'
  | 'day2-now'
  | 'day2-hold'
  | 'day2-auto';

export interface ConferenceEvent {
  id: string;
  at: number;
  action: OverrideAction | string;
  detail: string | null;
  byName: string | null;
}

export interface EmergencyAdmin {
  status: ConferenceStatus;
  /** false without the live-sync database: the schedule applies, with no overrides. */
  overridesAvailable: boolean;
  events: ConferenceEvent[];
  error?: string;
}
