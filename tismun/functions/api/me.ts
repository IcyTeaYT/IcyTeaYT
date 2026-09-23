import { fail, json, requireEnv, type Env } from './_lib/env';
import { accessOf } from './_lib/access';
import { currentUser } from './_lib/session';

/**
 * GET /api/me — the signed-in user's own row.
 *
 * A delegate can never ask for anyone else's record: there is no parameter to
 * change. Identity comes from the signed cookie alone.
 *
 * `Access` is what this account may do right now — worked out here from the
 * sheet and the server's clock. The browser uses it to decide what to show;
 * every endpoint checks it again for itself.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  return json({ ...user, Access: await accessOf(env, user) });
};
