import { fail, json, requireEnv, type Env } from './_lib/env';
import { applyOverride, isOverrideAction, readStatus, recentEvents } from './_lib/conference';
import { describeDbError } from './_lib/live';
import { currentUser } from './_lib/session';

/**
 * GET  /api/emergency — the Emergency Session's release and Day 2 status, and
 *      the record of every override: what, when and by whom.
 * POST /api/emergency — `{ action }`: a backup override.
 *      release-now · unrelease · release-auto · day2-now · day2-hold · day2-auto
 *
 * SECRETARIAT accounts only, checked here against the sheet on every request.
 * The normal path needs none of this: the topic releases on its own at the
 * scheduled time.
 */

async function secretariatOnly(request: Request, env: Env) {
  const user = await currentUser(request, env);
  if (!user) return { error: fail('Not signed in.', 401) };
  const role = (user.Role ?? '').trim().toUpperCase();
  if (role !== 'SECRETARIAT' && role !== 'ADMIN') {
    return { error: fail('Only the Secretariat can change the Emergency Session release.', 403) };
  }
  return { user };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);
  const check = await secretariatOnly(request, env);
  if (check.error) return check.error;

  const status = await readStatus(env);
  if (!env.DB) return json({ status, overridesAvailable: false, events: [] });
  try {
    return json({ status, overridesAvailable: true, events: await recentEvents(env.DB) });
  } catch (error) {
    return json({ status, overridesAvailable: false, events: [], error: describeDbError(error) });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);
  const check = await secretariatOnly(request, env);
  if (check.error) return check.error;
  if (!env.DB) {
    return fail('Overrides need the live-sync database (the DB binding). The schedule still applies.', 503);
  }

  let action: unknown;
  try {
    ({ action } = (await request.json()) as { action?: unknown });
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  if (!isOverrideAction(action)) return fail('Unknown action.', 400);

  await applyOverride(env.DB, action, {
    name: check.user['Full Name']?.trim() || null,
    email: check.user.Email?.trim().toLowerCase() || null,
  });
  return json({ status: await readStatus(env), events: await recentEvents(env.DB) });
};
