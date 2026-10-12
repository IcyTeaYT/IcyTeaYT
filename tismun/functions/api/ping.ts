import { json, type Env } from './_lib/env';
import { touch } from './_lib/activity';
import { readSession } from './_lib/session';

/**
 * POST /api/ping — the open page's heartbeat, every couple of minutes while it
 * is visible. It keeps "online now" in the owners' sign-in log honest.
 *
 * Only the signed cookie is checked, never the Google Sheet, so a full room of
 * open tabs costs nothing against the Sheets quota.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!env.SESSION_SECRET) return json({ ok: true });
  const email = await readSession(request, env);
  if (!email) return json({ ok: false }, 401);
  waitUntil(touch(env, email, null, request));
  return json({ ok: true });
};
