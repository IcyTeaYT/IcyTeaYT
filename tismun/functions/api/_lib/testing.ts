import type { ConferenceStatus } from '../../../src/config/emergency';
import { sameCountry } from '../../../src/lib/resolution';
import { EMERGENCY_ID, emergencyCountryOf, emergencyRoleOf } from './emergency';
import type { Env } from './env';
import { isOwner } from './owners';
import { readUsers, type SheetUser } from './sheets';

/**
 * An owner testing the site as a delegate.
 *
 * The owner picks a seat — a committee and a country — and from then on every
 * request from their browser is answered as if that seat's delegate had signed
 * in: the same home page, committee, papers and resolution. Optionally as on
 * Day 2 with the Emergency Session topic out, which only they see.
 *
 * The seat rides in its own cookie, and is honoured only when the signed
 * session belongs to an owner (OWNER_EMAILS), so nobody else can use it.
 */

const TEST_COOKIE = 'tismun_test';
const MAX_AGE_SECONDS = 12 * 60 * 60;

export interface TestSeat {
  committeeId: string;
  country: string;
  /** See it as on Day 2, with the Emergency Session topic released. */
  day2: boolean;
}

/** On a test user's row: the seat, and whose seat it is. Never sent to a browser. */
export interface TestMark extends TestSeat {
  seatEmail: string;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function readTestSeat(request: Request): TestSeat | null {
  const raw = readCookie(request, TEST_COOKIE);
  if (!raw) return null;
  const [committeeId, country, day2] = raw.split('|').map((part) => {
    try {
      return decodeURIComponent(part).trim();
    } catch {
      return '';
    }
  });
  if (!committeeId || !country) return null;
  return { committeeId, country, day2: day2 === '2' };
}

export const testCookie = (seat: TestSeat): string =>
  [
    `${TEST_COOKIE}=${encodeURIComponent(seat.committeeId)}|${encodeURIComponent(seat.country)}|${seat.day2 ? '2' : '1'}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ].join('; ');

export const clearTestCookie = (): string => `${TEST_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Every seat an owner can test as: each committee's countries. */
export function seatsOf(users: SheetUser[]): Map<string, string[]> {
  const seats = new Map<string, Map<string, string>>();
  const add = (committeeId: string, country: string) => {
    if (!committeeId || !country) return;
    const countries = seats.get(committeeId) ?? new Map<string, string>();
    if (!countries.has(country.toLowerCase())) countries.set(country.toLowerCase(), country);
    seats.set(committeeId, countries);
  };
  for (const user of users) {
    if ((user.Role ?? '').trim().toUpperCase() === 'DELEGATE') {
      add((user['Committee ID'] ?? '').trim(), (user.Country ?? '').trim());
    }
    if (emergencyRoleOf(user) === 'DELEGATE') add(EMERGENCY_ID, emergencyCountryOf(user));
  }
  return new Map(
    [...seats].map(([committeeId, countries]) => [
      committeeId,
      [...countries.values()].sort((a, b) => a.localeCompare(b)),
    ]),
  );
}

const isDelegate = (user: SheetUser): boolean => (user.Role ?? '').trim().toUpperCase() === 'DELEGATE';

/**
 * The delegate who holds the seat: their row from the sheet. In the Emergency
 * Session, someone who is a delegate on Day 1 too, if there is one.
 */
function seatHolder(users: SheetUser[], seat: TestSeat): SheetUser | null {
  if (seat.committeeId === EMERGENCY_ID) {
    const holders = users.filter(
      (user) => emergencyRoleOf(user) === 'DELEGATE' && sameCountry(emergencyCountryOf(user), seat.country),
    );
    return holders.find(isDelegate) ?? holders[0] ?? null;
  }
  return (
    users.find(
      (user) =>
        isDelegate(user) &&
        (user['Committee ID'] ?? '').trim() === seat.committeeId &&
        sameCountry(user.Country ?? '', seat.country),
    ) ?? null
  );
}

/** "ana@school.org" → "ana+test@school.org": not an owner, and plainly a test. */
const testEmailOf = (email: string): string => {
  const at = email.lastIndexOf('@');
  return at > 0 ? `${email.slice(0, at)}+test@${email.slice(at + 1)}` : `${email}+test`;
};

/**
 * The row the site answers to while an owner tests a seat: the seat's
 * delegate — their committee, country and Emergency Session assignment — under
 * the owner's name marked "(test)" and an address that is not an owner's.
 */
export async function testUserFor(env: Env, owner: SheetUser, seat: TestSeat): Promise<SheetUser | null> {
  const holder = seatHolder(await readUsers(env), seat);
  if (!holder) return null;
  const first = (owner['Full Name'] ?? '').trim().split(/\s+/)[0] || 'Owner';
  const mark: TestMark = {
    committeeId: seat.committeeId,
    country: seat.committeeId === EMERGENCY_ID ? emergencyCountryOf(holder) : (holder.Country ?? '').trim(),
    day2: seat.day2,
    seatEmail: holder.Email,
  };
  // Testing is a delegate's view and nothing more: an Emergency Session seat
  // held only by a Day 1 chair or Secretariat member brings no Day 1 role.
  const day1 = isDelegate(holder) ? {} : { Role: 'DELEGATE', 'Committee ID': '', Country: '', 'Country Code': '' };
  return {
    ...holder,
    ...day1,
    Email: testEmailOf(owner.Email),
    'Full Name': `${first} (test)`,
    Title: '',
    'Test Seat': mark,
  };
}

/** The conference as this user sees it: a test seat on "Day 2" sees Day 2, topic out. */
export function statusSeenBy(status: ConferenceStatus, user: SheetUser | null): ConferenceStatus {
  if (!user?.['Test Seat']?.day2) return status;
  return { ...status, day2: true, released: true };
}

/** The test seat, if this request comes from an owner testing one. No sheet read. */
export function ownerSeat(request: Request, env: Env, email: string | null): TestSeat | null {
  if (!email || !isOwner(env, email)) return null;
  return readTestSeat(request);
}
