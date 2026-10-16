import { fail, json, requireEnv, type Env } from './_lib/env';
import { verifyGoogleIdToken } from './_lib/google';
import { recordDenied, recordSignIn, recordSignOut } from './_lib/activity';
import { clearSessionCookie, createSessionCookie, readSession } from './_lib/session';
import { SITE_CLOSED } from '../../src/config/closed';
import { isOwner } from './_lib/owners';
import { findUser } from './_lib/sheets';
import { clearTestCookie } from './_lib/testing';

/**
 * POST /api/session  — exchange a Google ID token for a signed session cookie.
 * DELETE /api/session — sign out.
 */

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const missing = requireEnv(env, ['GOOGLE_CLIENT_ID', 'SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  let credential: string | undefined;
  try {
    ({ credential } = (await request.json()) as { credential?: string });
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  if (!credential) return fail('No sign-in token was supplied.', 400);

  const result = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID, env.SCHOOL_DOMAIN ?? '');
  if (!result.ok) return fail(result.error, result.status);

  // The conference is over: only the site's owners can still sign in.
  if (SITE_CLOSED.closed && !isOwner(env, result.identity.email)) {
    waitUntil(recordDenied(env, result.identity.email, result.identity.name ?? null, request));
    return json({ error: SITE_CLOSED.refusal, closed: true }, 403);
  }

  // The Users sheet is the list of who may enter. A genuine Google account is
  // not enough on its own — the email has to be on the roster.
  const user = await findUser(env, result.identity.email);
  if (!user) {
    waitUntil(recordDenied(env, result.identity.email, result.identity.name ?? null, request));
    return fail(
      'That email is not on the conference roster. Sign in with the school Google account you were registered with, or contact the Secretariat.',
      403,
    );
  }

  waitUntil(recordSignIn(env, user, request));
  // A fresh sign-in starts as yourself, never in a test seat left from before.
  return json(
    { ok: true },
    200,
    new Headers([
      ['Set-Cookie', await createSessionCookie(env, user.Email)],
      ['Set-Cookie', clearTestCookie()],
    ]),
  );
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (env.SESSION_SECRET) {
    const email = await readSession(request, env);
    if (email) waitUntil(recordSignOut(env, email, request));
  }
  return json(
    { ok: true },
    200,
    new Headers([
      ['Set-Cookie', clearSessionCookie()],
      ['Set-Cookie', clearTestCookie()],
    ]),
  );
};
