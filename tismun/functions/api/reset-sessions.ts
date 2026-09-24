import { fail, json, requireEnv, type Env } from './_lib/env';
import { lastSessionsReset, readStatus, resetAllSessions } from './_lib/conference';
import { ensureControlTable } from './_lib/control';
import { describeDbError } from './_lib/live';
import { currentUser } from './_lib/session';

/**
 * GET  /api/reset-sessions — when every committee's session was last reset, and by whom.
 * POST /api/reset-sessions — `{ confirm: "RESET" }`: reset every committee's
 *      session — roll call, timers, motions, resolutions, votes, session logs
 *      and awards — on the server and, as they next check in, on every chair's
 *      device.
 *
 * SECRETARIAT accounts only, checked here against the sheet on every request.
 */

async function secretariatOnly(request: Request, env: Env) {
  const user = await currentUser(request, env);
  if (!user) return { error: fail('Not signed in.', 401) };
  const role = (user.Role ?? '').trim().toUpperCase();
  if (role !== 'SECRETARIAT' && role !== 'ADMIN') {
    return { error: fail('Only the Secretariat can reset every session.', 403) };
  }
  return { user };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);
  const check = await secretariatOnly(request, env);
  if (check.error) return check.error;
  if (!env.DB) return json({ available: false, last: null });
  try {
    return json({ available: true, last: await lastSessionsReset(env.DB) });
  } catch (error) {
    return json({ available: false, last: null, error: describeDbError(error) });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);
  const check = await secretariatOnly(request, env);
  if (check.error) return check.error;
  if (!env.DB) return fail('Resetting every session needs the live-sync database (the DB binding).', 503);

  let confirm: unknown;
  try {
    ({ confirm } = (await request.json()) as { confirm?: unknown });
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  // A deliberate second step, so a stray request can never wipe the conference.
  if (confirm !== 'RESET') return fail('Type RESET to confirm.', 400);

  try {
    await ensureControlTable(env.DB);
    await resetAllSessions(env.DB, {
      name: check.user['Full Name']?.trim() || null,
      email: check.user.Email?.trim().toLowerCase() || null,
    });
    return json({ status: await readStatus(env), last: await lastSessionsReset(env.DB) });
  } catch (error) {
    return fail(`The reset did not go through: ${describeDbError(error)}`, 500);
  }
};
