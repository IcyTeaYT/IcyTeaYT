import { fail, json, requireEnv, type Env } from '../_lib/env';
import { currentUser } from '../_lib/session';
import { readTab, USERS_TAB, type SheetUser } from '../_lib/sheets';

/**
 * GET /api/roster/:committeeId — every delegation in one committee.
 *
 * This is the only endpoint that returns other people's records, so it is the
 * one that has to be strict:
 *
 *   • the caller must hold a valid session;
 *   • the caller's role in the sheet must be CHAIR — not a claim from the
 *     browser, and not something the cookie asserts;
 *   • the committee asked for must be the caller's OWN committee.
 *
 * A delegate who calls this by hand gets a 403. A chair who asks for another
 * committee's roster gets the same 403.
 */
export const onRequestGet: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);

  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);

  const committeeId = Array.isArray(params.committeeId) ? params.committeeId[0] : params.committeeId;
  if (!committeeId) return fail('No committee was requested.', 400);

  if ((user.Role ?? '').trim().toUpperCase() !== 'CHAIR') {
    return fail('Only chairs can view a committee roster.', 403);
  }
  if ((user['Committee ID'] ?? '').trim() !== committeeId) {
    return fail('You can only view the roster of your own committee.', 403);
  }

  const rows = (await readTab(env, USERS_TAB)) as unknown as SheetUser[];
  const roster = rows.filter(
    (row) =>
      (row['Committee ID'] ?? '').trim() === committeeId &&
      (row.Role ?? '').trim().toUpperCase() === 'DELEGATE',
  );

  return json(roster);
};
