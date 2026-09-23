/**
 * The shape of the conference data, and the single interface every page reads
 * through. Swapping mock JSON for the live Google Sheet means swapping the
 * implementation in ./index.ts — no component touches a JSON file directly.
 */

/** Roles come from the "Role" column of the sheet. Add new ones here. */
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
}
