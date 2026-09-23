import { fail, requireEnv, type Env } from '../_lib/env';
import { readStatus } from '../_lib/conference';
import { EMERGENCY_ID } from '../_lib/emergency';
import { currentUser } from '../_lib/session';
import { getAccessToken, readCommittees } from '../_lib/sheets';

/**
 * GET /api/papers/:committeeId — the Emergency Session background paper.
 *
 * The file is deliberately NOT in /public, where anyone could fetch it by
 * guessing its address. It lives in Google Drive, shared only with the
 * service account, and this endpoint streams it — after checking that the
 * caller is signed in and that the topic has been released, on this server's
 * clock. Asked for early, it answers 403 and never touches the file.
 *
 * The Day 1 papers are public by design and are served from /papers as before.
 */

const paramOf = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** The file id from any of the ways Drive writes a link, or a bare id. */
function driveFileId(value: string): string | null {
  const trimmed = value.trim();
  const patterns = [/\/file\/d\/([\w-]{10,})/, /[?&]id=([\w-]{10,})/, /\/d\/([\w-]{10,})/];
  for (const pattern of patterns) {
    const match = pattern.exec(trimmed);
    if (match?.[1]) return match[1];
  }
  return /^[\w-]{20,}$/.test(trimmed) ? trimmed : null;
}

export const onRequestGet: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  const committeeId = paramOf(params.committeeId);
  if (committeeId !== EMERGENCY_ID) return fail('No such paper.', 404);

  const status = await readStatus(env);
  if (!status.released) return fail('The Emergency Session background paper has not been released yet.', 403);

  const row = (await readCommittees(env)).find((entry) => entry['Committee ID']?.trim() === EMERGENCY_ID);
  const source = row?.['Background Paper URL']?.trim() ?? '';
  if (!source) return fail('No background paper has been set for the Emergency Session.', 404);

  let upstream: Response;
  const fileId = driveFileId(source);
  if (fileId) {
    const token = await getAccessToken(env);
    upstream = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (upstream.status === 404 || upstream.status === 403) {
      return fail(
        'The background paper could not be read from Google Drive. Share the file with the service account (Viewer) and make sure the Google Drive API is enabled.',
        502,
      );
    }
  } else if (/^https:\/\//i.test(source)) {
    // Any other private address, fetched server-side so it is never revealed.
    upstream = await fetch(source);
  } else {
    return fail('The Emergency Session paper link in the sheet is not a Google Drive link.', 502);
  }

  if (!upstream.ok || !upstream.body) {
    return fail(`The background paper could not be fetched (${upstream.status}).`, 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="TISMUN-Emergency-Session-background-paper.pdf"',
      // Never kept by a shared cache, so un-releasing takes effect at once.
      'Cache-Control': 'private, no-store',
    },
  });
};
