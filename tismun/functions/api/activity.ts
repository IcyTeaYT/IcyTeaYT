import { fail, json, requireEnv, type Env } from './_lib/env';
import { readActivity } from './_lib/activity';
import { describeDbError } from './_lib/live';
import { isOwner } from './_lib/owners';
import { currentUser } from './_lib/session';

/**
 * GET /api/activity — the sign-in log: who is online now, and every sign-in,
 * sign-out, return visit and turned-away sign-in of the last 30 days.
 *
 * Owners only (OWNER_EMAILS). Not even the Secretariat role can read it.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);
  if (!isOwner(env, user.Email)) return fail('The sign-in log is only for the site owner.', 403);

  if (!env.DB) return json({ available: false, presence: [], events: [], now: Date.now() });
  try {
    const { presence, events } = await readActivity(env.DB);
    return json({ available: true, presence, events, now: Date.now() });
  } catch (error) {
    return json({ available: false, presence: [], events: [], now: Date.now(), error: describeDbError(error) });
  }
};
