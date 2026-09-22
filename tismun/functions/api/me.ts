import { fail, json, requireEnv, type Env } from './_lib/env';
import { currentUser } from './_lib/session';

/**
 * GET /api/me — the signed-in user's own row.
 *
 * A delegate can never ask for anyone else's record: there is no parameter to
 * change. Identity comes from the signed cookie alone.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  return json(user);
};
