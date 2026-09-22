import { ROLES, type Committee, type CommitteeRow, type Role, type User, type UserRow } from './types';

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Anything the sheet doesn't recognise falls back to the least-privileged role. */
export function toRole(raw: unknown): Role {
  const value = clean(raw).toUpperCase();
  return (ROLES as readonly string[]).includes(value) ? (value as Role) : 'DELEGATE';
}

export function rowToUser(row: UserRow): User {
  const country = clean(row.Country);
  const code = clean(row['Country Code']).toUpperCase();
  const committeeId = clean(row['Committee ID']);
  return {
    email: clean(row.Email).toLowerCase(),
    fullName: clean(row['Full Name']),
    role: toRole(row.Role),
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
