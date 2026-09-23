import { countryCodeFor } from '@/lib/countryCodes';
import { ROLES, type Committee, type CommitteeRow, type Role, type User, type UserRow } from './types';

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Anything the sheet doesn't recognise falls back to the least-privileged role. */
export function toRole(raw: unknown): Role {
  const value = clean(raw).toUpperCase();
  return (ROLES as readonly string[]).includes(value) ? (value as Role) : 'DELEGATE';
}

export function rowToUser(row: UserRow): User {
  const country = clean(row.Country);
  // The sheet only needs the country's name. A code typed in the optional
  // Country Code column still wins, for names the table does not recognise.
  const code = clean(row['Country Code']).toUpperCase() || countryCodeFor(country) || '';
  const committeeId = clean(row['Committee ID']);
  const title = clean(row.Title);
  return {
    email: clean(row.Email).toLowerCase(),
    fullName: clean(row['Full Name']),
    role: toRole(row.Role),
    title: title || null,
    committeeId: committeeId || null,
    country: country || null,
    countryCode: code || null,
  };
}

export function rowToCommittee(row: CommitteeRow): Committee {
  return {
    id: clean(row['Committee ID']),
    name: clean(row.Name),
    abbreviation: clean(row.Abbreviation),
    topics: [clean(row['Topic 1']), clean(row['Topic 2'])],
    chairs: clean(row.Chairs)
      .split(';')
      .map((name) => name.trim())
      .filter(Boolean),
    room: clean(row.Room),
    backgroundPaperUrl: clean(row['Background Paper URL']),
    description: clean(row.Description),
  };
}

/** First name only, for the welcome header. */
export function firstNameOf(user: Pick<User, 'fullName' | 'email'>): string {
  const first = user.fullName.trim().split(/\s+/)[0];
  return first || user.email.split('@')[0] || 'Delegate';
}

/**
 * A delegation's stable id within its committee. The ISO code when there is
 * one, so ids survive a country being renamed; otherwise the name itself, so
 * an unrecognised country still appears in the roster instead of vanishing.
 */
export function delegationId(committeeId: string, country: string, countryCode: string | null): string {
  const key =
    countryCode ??
    country
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  return `${committeeId}:${key}`;
}
