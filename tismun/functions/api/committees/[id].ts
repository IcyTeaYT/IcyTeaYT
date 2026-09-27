import { fail, json, requireEnv, type Env } from '../_lib/env';
import { currentUser } from '../_lib/session';
import { readStatus } from '../_lib/conference';
import { publicCommittee } from '../_lib/emergency';
import { readCommittees, readUsers } from '../_lib/sheets';
import { withChairsFromUsers } from '../../../src/lib/chairs';

/** GET /api/committees/:id — one committee's public information. */
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [committees, users] = await Promise.all([readCommittees(env), readUsers(env)]);
  const committee = withChairsFromUsers(committees, users).find((entry) => entry['Committee ID'] === id);
  if (!committee) return fail('No such committee.', 404);

  return json(publicCommittee(committee, await readStatus(env)));
};
