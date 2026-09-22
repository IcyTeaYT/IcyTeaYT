import { isLiveMode, type Env } from './env';
import { currentUser } from './session';

/**
 * Who may read and write live session state.
 *
 * In live mode these are real checks against the role in the sheet. In demo
 * mode there is no identity to check — the login page hands out any account on
 * request — so the endpoints are open, and a demo deployment is public by
 * definition. The README says so in as many words.
 */

export type Guard = { ok: true } | { ok: false; status: number; error: string };

const allow: Guard = { ok: true };

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
  return allow;
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
  if (role === 'SECRETARIAT' || role === 'ADMIN') return allow;

  if (committeeId && role === 'CHAIR' && (user['Committee ID'] ?? '').trim() === committeeId) {
    return allow;
  }
  return { ok: false, status: 403, error: 'Live session state is for the Secretariat.' };
}

/** Entries older than this are pruned so the log cannot grow without bound. */
export const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
