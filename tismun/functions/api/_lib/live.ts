import { isLiveMode, type Env } from './env';
import { currentUser } from './session';
import type { SheetUser } from './sheets';

/**
 * Who may read and write live session state.
 *
 * In live mode these are real checks against the role in the sheet. In demo
 * mode there is no identity to check — the login page hands out any account on
 * request — so the endpoints are open, and a demo deployment is public by
 * definition. The README says so in as many words.
 */

/** On success, `user` is the signed-in account, or null in demo mode. */
export type Guard =
  | { ok: true; user: SheetUser | null }
  | { ok: false; status: number; error: string };

const allow: Guard = { ok: true, user: null };

/** Only a chair may report their OWN committee's session. */
export async function guardWrite(
  request: Request,
  env: Env,
  committeeId: string,
): Promise<Guard> {
  if (!isLiveMode(env)) return allow;

  const user = await currentUser(request, env);
  if (!user) return { ok: false, status: 401, error: 'Not signed in.' };

  if ((user.Role ?? '').trim().toUpperCase() !== 'CHAIR') {
    return { ok: false, status: 403, error: 'Only chairs can report a committee session.' };
  }
  if ((user['Committee ID'] ?? '').trim() !== committeeId) {
    return { ok: false, status: 403, error: 'You can only report your own committee.' };
  }
  return { ok: true, user };
}

/** The Secretariat sees every committee; a chair sees only their own. */
export async function guardRead(
  request: Request,
  env: Env,
  committeeId?: string,
): Promise<Guard> {
  if (!isLiveMode(env)) return allow;

  const user = await currentUser(request, env);
  if (!user) return { ok: false, status: 401, error: 'Not signed in.' };

  const role = (user.Role ?? '').trim().toUpperCase();
  if (role === 'SECRETARIAT' || role === 'ADMIN') return { ok: true, user };

  if (committeeId && role === 'CHAIR' && (user['Committee ID'] ?? '').trim() === committeeId) {
    return { ok: true, user };
  }
  return { ok: false, status: 403, error: 'Live session state is for the Secretariat.' };
}

/** Entries older than this are pruned so the log cannot grow without bound. */
export const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;


/**
 * Describe a D1 failure without taking the endpoint down with it.
 *
 * The most common cause by far is that the migration has not been run against
 * the bound database, so the tables do not exist. Left unhandled that surfaces
 * as a Cloudflare 1101 page, which says nothing useful and breaks the site for
 * everyone rather than just switching the Secretariat back to local data.
 */
export function describeDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/no such table/i.test(message)) {
    return (
      'The live-sync tables do not exist in the bound D1 database. Run: ' +
      'npx wrangler d1 execute <database> --remote --file=./migrations/0001_live_sync.sql'
    );
  }
  return `Live sync is unavailable: ${message}`;
}
