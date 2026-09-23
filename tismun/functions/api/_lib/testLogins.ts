import type { Env } from './env';
import type { SheetUser } from './sheets';

/**
 * Shared test accounts, for letting people try the site before the
 * conference without adding them to the Users sheet.
 *
 * Switched on by setting TEST_LOGINS=on in Cloudflare, and off by deleting it.
 * Off means off everywhere at once: the login buttons disappear, and a test
 * session that is already open stops being recognised on its next request,
 * because these accounts exist only while the setting does.
 *
 * While it is on, anyone with the link can sign in as the Secretariat and see
 * every committee. Switch it off before the conference.
 */

export type TestRole = 'delegate' | 'chair' | 'secretariat';

/** The committee the test delegate sits in and the test chair runs. */
export const TEST_COMMITTEE_ID = 'ga-2';

const TEST_ACCOUNTS: Record<TestRole, SheetUser> = {
  delegate: {
    Email: 'testdelegate@tismun.test',
    'Full Name': 'Test Delegate',
    Role: 'DELEGATE',
    'Committee ID': TEST_COMMITTEE_ID,
    Country: 'Uzbekistan',
  },
  chair: {
    Email: 'testchair@tismun.test',
    'Full Name': 'Test Chair',
    Role: 'CHAIR',
    'Committee ID': TEST_COMMITTEE_ID,
    Country: '',
  },
  secretariat: {
    Email: 'testsecretariat@tismun.test',
    'Full Name': 'Test Secretariat',
    Role: 'SECRETARIAT',
    'Committee ID': '',
    Country: '',
  },
};

export const testLoginsEnabled = (env: Env): boolean =>
  (env.TEST_LOGINS ?? '').trim().toLowerCase() === 'on';

export const isTestRole = (value: unknown): value is TestRole =>
  value === 'delegate' || value === 'chair' || value === 'secretariat';

export const testAccount = (role: TestRole): SheetUser => TEST_ACCOUNTS[role];

/** The test account with this email — only while test logins are switched on. */
export function testAccountByEmail(env: Env, email: string): SheetUser | null {
  if (!testLoginsEnabled(env)) return null;
  const needle = email.trim().toLowerCase();
  return Object.values(TEST_ACCOUNTS).find((account) => account.Email === needle) ?? null;
}
