import { SITE_CLOSED } from '../../src/config/closed';
import { fail, json, type Env } from './_lib/env';
import { isOwner } from './_lib/owners';
import { readSession } from './_lib/session';

/**
 * Every /api request runs through here.
 *
 * Setup mistakes — a sheet not shared with the service account, a key pasted
 * without its BEGIN line, the Sheets API left disabled — otherwise surface as
 * a thrown exception, which Cloudflare turns into a 1101 page that says
 * nothing. This catches them and says what to fix, and the login page shows
 * that message to whoever is trying to sign in.
 */

function explain(error: unknown): { message: string; status: number } {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  if (/has not been used in project|SERVICE_DISABLED|is disabled/i.test(text)) {
    return {
      status: 502,
      message:
        'The Google Sheets API is not enabled. In Google Cloud: APIs & Services → Library → Google Sheets API → Enable.',
    };
  }
  if (/not supported for this document/i.test(text)) {
    return {
      status: 502,
      message:
        'SHEET_ID points to an uploaded Excel file, not a Google Sheet. Open it and use File → Save as Google Sheets, then use the new sheet’s ID.',
    };
  }
  const tab = /Unable to parse range:\s*'?([^'"\s]+)/i.exec(text)?.[1];
  if (tab) {
    return {
      status: 502,
      message: `The sheet has no tab called "${tab}". The tabs must be named exactly Users and Committees.`,
    };
  }
  if (/Sheet read failed[^(]*\(403\)/i.test(text)) {
    return {
      status: 502,
      message:
        'The Google Sheet is not shared with the service account. Share it with the GOOGLE_SA_EMAIL address as Viewer.',
    };
  }
  if (/Sheet read failed[^(]*\(404\)/i.test(text)) {
    return {
      status: 502,
      message: 'No Google Sheet found for SHEET_ID. Copy the ID from the sheet’s address — the part between /d/ and /edit.',
    };
  }
  if (/token exchange failed/i.test(text)) {
    return {
      status: 502,
      message:
        'Google rejected the service account key. Check GOOGLE_SA_EMAIL matches client_email in the JSON key file, and that the key has not been deleted.',
    };
  }
  if (/DataError|pkcs8|keyData|asn1|atob|base64|invalid character/i.test(text)) {
    return {
      status: 500,
      message:
        'GOOGLE_SA_PRIVATE_KEY could not be read. Paste the whole private_key value from the JSON key file, including the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines.',
    };
  }
  return { status: 500, message: `The server hit an error: ${text}` };
}

/** Open even while the site is closed: signing in and out, and the health check. */
const OPEN_WHILE_CLOSED = new Set(['/api/session', '/api/ping']);

/**
 * The conference is over (src/config/closed.ts): a signed-in account that is
 * not one of the site's owners gets nothing — not even with a sign-in left
 * open from before. Signed-out requests fall through to each endpoint's own
 * "Not signed in".
 */
async function refuseWhileClosed(request: Request, env: Env): Promise<Response | null> {
  if (!SITE_CLOSED.closed || !env.SESSION_SECRET) return null;
  if (OPEN_WHILE_CLOSED.has(new URL(request.url).pathname)) return null;
  const email = await readSession(request, env);
  if (!email || isOwner(env, email)) return null;
  return json({ error: SITE_CLOSED.refusal, closed: true }, 403);
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  try {
    const refused = await refuseWhileClosed(request, env);
    if (refused) return refused;
    return await next();
  } catch (error) {
    const { message, status } = explain(error);
    return fail(message, status);
  }
};
