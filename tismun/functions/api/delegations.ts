import { fail, json, requireEnv, type Env } from './_lib/env';
import { allDelegations, emergencyRoleOf } from './_lib/emergency';
import { currentUser } from './_lib/session';
import { readUsers } from './_lib/sheets';
import { withTestAccounts } from './_lib/testLogins';

/**
 * GET /api/delegations — every Emergency Session delegation, by country.
 * For the Emergency Session's chairs and the Secretariat only; a delegate
 * asking gets a 403 and sees nothing beyond their own country.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  const role = (user.Role ?? '').trim().toUpperCase();
  const secretariat = role === 'SECRETARIAT' || role === 'ADMIN';
  if (!secretariat && emergencyRoleOf(user) !== 'CHAIR') {
    return fail('Only the Emergency Session chairs and the Secretariat can see every delegation.', 403);
  }

  return json(allDelegations(withTestAccounts(env, await readUsers(env))));
};
