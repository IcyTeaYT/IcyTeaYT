import { fail, json, requireEnv, type Env } from './_lib/env';
import { currentUser } from './_lib/session';
import { readStatus } from './_lib/conference';
import { publicCommittee } from './_lib/emergency';
import { readCommittees } from './_lib/sheets';

/**
 * GET /api/committees — every committee.
 *
 * Committee information is public to the conference: topics, chairs, rooms and
 * background papers are on the programme. It still requires a session, so the
 * roster is not readable by the open internet.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  // The Emergency Session's topic, description and paper are removed here,
  // server-side, until they are released.
  const [committees, status] = await Promise.all([readCommittees(env), readStatus(env)]);
  return json(committees.map((row) => publicCommittee(row, status)));
};
