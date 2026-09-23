import { emergencySession, type ConferenceStatus } from '../../../src/config/emergency';
import { countryCodeFor } from '../../../src/lib/countryCodes';
import type { SheetCommittee, SheetUser } from './sheets';

/**
 * The Emergency Session, server-side. Its topic, description and background
 * paper leave this server only after release — they are stripped here, before
 * the response is built, so there is nothing in the browser to find early.
 */

export const EMERGENCY_ID = emergencySession.committeeId;

/** Where the released paper is served from. The real file's address never leaves the server. */
export const EMERGENCY_PAPER_ROUTE = `/api/papers/${EMERGENCY_ID}`;

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * A committee as it may be shown right now. Before release the Emergency
 * Session keeps its name, room and chairs — everyone may know it exists and
 * where it meets — and loses everything about what it will discuss.
 */
export function publicCommittee(
  row: SheetCommittee,
  status: ConferenceStatus,
): SheetCommittee & { Locked?: string } {
  if (clean(row['Committee ID']) !== EMERGENCY_ID) return row;
  if (!status.released) {
    return {
      ...row,
      'Topic 1': '',
      'Topic 2': '',
      Description: '',
      'Background Paper URL': '',
      Locked: 'yes',
    };
  }
  // Released: the paper is served through the API, which checks release time
  // and session again — the Drive link itself is never handed out.
  return {
    ...row,
    'Background Paper URL': clean(row['Background Paper URL']) ? EMERGENCY_PAPER_ROUTE : '',
  };
}

export type EmergencyRole = 'DELEGATE' | 'CHAIR' | null;

/** The Emergency Role column. A country with no role means a delegate. */
export function emergencyRoleOf(user: SheetUser): EmergencyRole {
  const role = clean(user['Emergency Role']).toUpperCase();
  if (role === 'CHAIR') return 'CHAIR';
  if ((role === 'DELEGATE' || !role) && clean(user['Emergency Country'])) return 'DELEGATE';
  return null;
}

export const emergencyCountryOf = (user: SheetUser): string =>
  emergencyRoleOf(user) === 'DELEGATE' ? clean(user['Emergency Country']) : '';

export interface DelegationMember {
  fullName: string;
  day1CommitteeId: string | null;
  day1Role: 'DELEGATE' | 'CHAIR' | 'SECRETARIAT';
  you: boolean;
}

export interface EmergencyDelegation {
  country: string;
  countryCode: string | null;
  members: DelegationMember[];
}

const sameCountry = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

const day1RoleOf = (user: SheetUser): DelegationMember['day1Role'] => {
  const role = clean(user.Role).toUpperCase();
  return role === 'CHAIR' ? 'CHAIR' : role === 'SECRETARIAT' || role === 'ADMIN' ? 'SECRETARIAT' : 'DELEGATE';
};

/**
 * One country's delegation: names and Day 1 committees, and nothing else —
 * never an email address. `you` marks the person asking, who comes first; the
 * rest are alphabetical.
 */
export function delegationOf(
  users: SheetUser[],
  country: string,
  askerEmail: string | null,
): EmergencyDelegation {
  const asker = (askerEmail ?? '').toLowerCase();
  const members = users
    .filter((user) => emergencyRoleOf(user) === 'DELEGATE' && sameCountry(emergencyCountryOf(user), country))
    .map<DelegationMember>((user) => ({
      fullName: clean(user['Full Name']),
      day1CommitteeId: clean(user['Committee ID']) || null,
      day1Role: day1RoleOf(user),
      you: Boolean(asker) && clean(user.Email).toLowerCase() === asker,
    }))
    .sort((a, b) => Number(b.you) - Number(a.you) || a.fullName.localeCompare(b.fullName));
  return { country, countryCode: countryCodeFor(country), members };
}

/** Every delegation, by country. For the committee's chairs and the Secretariat. */
export function allDelegations(users: SheetUser[]): EmergencyDelegation[] {
  const countries = new Map<string, string>();
  for (const user of users) {
    const country = emergencyCountryOf(user);
    if (country && !countries.has(country.toLowerCase())) countries.set(country.toLowerCase(), country);
  }
  return [...countries.values()]
    .sort((a, b) => a.localeCompare(b))
    .map((country) => delegationOf(users, country, null));
}

/**
 * The Emergency Session roster in the shape the chair dashboard already reads
 * for every other committee: one row per delegate, with the committee and
 * country columns set to their Emergency Session values.
 */
export function emergencyRoster(users: SheetUser[]): SheetUser[] {
  return users
    .filter((user) => emergencyRoleOf(user) === 'DELEGATE')
    .map((user) => ({ ...user, 'Committee ID': EMERGENCY_ID, Country: emergencyCountryOf(user), 'Country Code': '' }));
}
