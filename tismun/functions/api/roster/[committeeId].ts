import { fail, json, requireEnv, type Env } from '../_lib/env';
import { currentUser } from '../_lib/session';
import { accessOf } from '../_lib/access';
import { EMERGENCY_ID, emergencyRoster } from '../_lib/emergency';
import { readTab, readUsers, USERS_TAB, type SheetUser } from '../_lib/sheets';

/**
 * GET /api/roster/:committeeId — every delegation in one committee.
 *
 * This is the only endpoint that returns other people's records, so it is the
 * one that has to be strict:
 *
 *   • the caller must hold a valid session;
 *   • the caller must chair the committee asked for — per the sheet and the
 *     server's clock, not a claim from the browser or the cookie: their Day 1
 *     committee on Day 1 (read-only from Day 2), or the Emergency Session on
 *     Day 2 if the sheet makes them its chair.
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

  // A chair's own committee — the one they run now, or from Day 2 the Day 1
  // committee they chaired — worked out from the sheet and the server's clock.
  const access = await accessOf(env, user);
  if (access.chairOf !== committeeId && access.readOnlyChairOf !== committeeId) {
    return fail('You can only view the roster of your own committee.', 403);
  }

  // The Emergency Session's delegations come from the Emergency columns.
  if (committeeId === EMERGENCY_ID) return json(emergencyRoster(await readUsers(env)));

  const rows = (await readTab(env, USERS_TAB)) as unknown as SheetUser[];
  const roster = rows.filter(
    (row) =>
      (row['Committee ID'] ?? '').trim() === committeeId &&
      (row.Role ?? '').trim().toUpperCase() === 'DELEGATE',
  );

  return json(roster);
};
