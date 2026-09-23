import { fail, json, requireEnv, type Env } from './_lib/env';
import { createSessionCookie } from './_lib/session';
import { isTestRole, testAccount, testLoginsEnabled } from './_lib/testLogins';

/**
 * GET  /api/test-login — whether the test sign-in buttons should show.
 * POST /api/test-login — `{ role }`: sign in as that shared test account.
 *
 * Both only work while TEST_LOGINS=on. See _lib/testLogins.ts.
 */

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({ enabled: testLoginsEnabled(env) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!testLoginsEnabled(env)) return fail('Test sign-in is switched off.', 404);
  const missing = requireEnv(env, ['SESSION_SECRET']);
  if (missing) return fail(missing, 503);

  let role: unknown;
  try {
    ({ role } = (await request.json()) as { role?: unknown });
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  if (!isTestRole(role)) return fail('Unknown test account.', 400);

  const account = testAccount(role);
  return json({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env, account.Email) });
};
