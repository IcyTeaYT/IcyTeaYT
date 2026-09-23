import { fail, json, requireEnv, type Env } from './_lib/env';
import { delegationOf, emergencyCountryOf, emergencyRoleOf } from './_lib/emergency';
import { currentUser } from './_lib/session';
import { readUsers } from './_lib/sheets';
import { withTestAccounts } from './_lib/testLogins';

/**
 * GET /api/delegation — the signed-in delegate's own Emergency Session
 * delegation: their country and the names of their teammates, with the Day 1
 * committee each comes from.
 *
 * Worked out here, from the whole Users tab, and only the caller's own country
 * is sent back — the roster never reaches a browser to be filtered there, and
 * no teammate's email address is ever included. Available as soon as countries
 * are assigned, even while the topic is locked, so teams can find each other.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  if (emergencyRoleOf(user) !== 'DELEGATE') return json(null);
  const users = withTestAccounts(env, await readUsers(env));
  return json(delegationOf(users, emergencyCountryOf(user), user.Email));
};
