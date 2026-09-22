import { fail, json, requireEnv, type Env } from './_lib/env';
import { verifyGoogleIdToken } from './_lib/google';
import { clearSessionCookie, createSessionCookie } from './_lib/session';
import { findUser } from './_lib/sheets';

/**
 * POST /api/session  — exchange a Google ID token for a signed session cookie.
 * DELETE /api/session — sign out.
 */

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['GOOGLE_CLIENT_ID', 'SCHOOL_DOMAIN', 'SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  let credential: string | undefined;
  try {
    ({ credential } = (await request.json()) as { credential?: string });
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  if (!credential) return fail('No sign-in token was supplied.', 400);

  const result = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID, env.SCHOOL_DOMAIN);
  if (!result.ok) return fail(result.error, result.status);

  // Signing in with a valid school account is not enough: you must also be on
  // the conference roster, which is the sheet's job to say.
  const user = await findUser(env, result.identity.email);
  if (!user) {
    return fail(
      'Your school account is not on the conference roster. Contact the Secretariat.',
      403,
    );
  }

  return json({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env, user.Email) });
};

export const onRequestDelete: PagesFunction<Env> = async () =>
  json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
