import { fail, json, requireEnv, type Env } from './_lib/env';
import { EMERGENCY_ID } from './_lib/emergency';
import { isOwner } from './_lib/owners';
import { realUser } from './_lib/session';
import { readCommittees, readUsers } from './_lib/sheets';
import { clearTestCookie, PRACTICE_SUFFIX, readTestSeat, seatsOf, testCookie, testUserFor } from './_lib/testing';

/**
 * Owners only: see the site exactly as a delegate or a chair does.
 *
 * GET    /api/test-as — the seat being tested, and every seat there is to test.
 * POST   /api/test-as { role, committeeId, country, day2 } — start (or switch)
 *        testing, as a delegate (with a country) or as a chair.
 * POST   /api/test-as { action: 'clear-practice' } — empty every committee's
 *        practice copy: what was done while testing.
 * DELETE /api/test-as — stop, and be yourself again.
 *
 * While testing, every committee's session and resolution are a practice
 * copy (see storeIdFor), so nothing done in a test reaches the real ones.
 *
 * Checked against the signed-in person's own row, never the seat they are
 * testing, so an owner can always switch seats or stop.
 */

async function ownerOnly(request: Request, env: Env) {
  const user = await realUser(request, env);
  if (!user) return { error: fail('Not signed in.', 401) };
  if (!isOwner(env, user.Email)) return { error: fail('Only the site owner can test the site.', 403) };
  return { user };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);
  const check = await ownerOnly(request, env);
  if (check.error) return check.error;

  const [committees, users] = await Promise.all([readCommittees(env), readUsers(env)]);
  const seats = seatsOf(users);
  const options = committees
    .map((row) => ({
      committeeId: (row['Committee ID'] ?? '').trim(),
      name: (row.Name ?? '').trim(),
      abbreviation: (row.Abbreviation ?? '').trim(),
    }))
    .filter((committee) => committee.committeeId)
    .map((committee) => ({ ...committee, countries: seats.get(committee.committeeId) ?? [] }))
    // The Emergency Session last, as on the programme.
    .sort((a, b) => Number(a.committeeId === EMERGENCY_ID) - Number(b.committeeId === EMERGENCY_ID));
  return json({ seat: readTestSeat(request), options });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const missing = requireEnv(env, ['SESSION_SECRET', 'SHEET_ID']);
  if (missing) return fail(missing, 503);
  const check = await ownerOnly(request, env);
  if (check.error) return check.error;

  let body: { action?: unknown; role?: unknown; committeeId?: unknown; country?: unknown; day2?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Expected a JSON body.', 400);
  }

  if (body.action === 'clear-practice') {
    if (!env.DB) return json({ ok: true });
    await clearPractice(env.DB);
    return json({ ok: true });
  }

  const role = body.role === 'chair' ? 'chair' : 'delegate';
  const committeeId = typeof body.committeeId === 'string' ? body.committeeId.trim() : '';
  const country = role === 'chair' ? '' : typeof body.country === 'string' ? body.country.trim() : '';
  if (!committeeId || (role === 'delegate' && !country)) return fail('Pick a committee and a country.', 400);
  const known = (await readCommittees(env)).some((row) => (row['Committee ID'] ?? '').trim() === committeeId);
  if (!known) return fail('No such committee.', 400);

  // The Emergency Session sits on Day 2: its chair is only ever seen then.
  const day2 = body.day2 === true || (role === 'chair' && committeeId === EMERGENCY_ID);
  const seat = { committeeId, country, day2, role } as const;
  if (!(await testUserFor(env, check.user, seat))) return fail('Nobody sits in that seat on the sheet.', 400);
  return json({ ok: true }, 200, { 'Set-Cookie': testCookie(seat) });
};

/** Every practice copy, gone. Tables not created yet hold nothing to clear. */
async function clearPractice(db: D1Database): Promise<void> {
  const like = `%${PRACTICE_SUFFIX}`;
  for (const table of ['committee_state', 'session_log', 'committee_control', 'res_committee', 'res_copy']) {
    try {
      await db.prepare(`DELETE FROM ${table} WHERE committee_id LIKE ?1`).bind(like).run();
    } catch (error) {
      if (!/no such table/i.test(String(error))) throw error;
    }
  }
}

export const onRequestDelete: PagesFunction<Env> = async () =>
  json({ ok: true }, 200, { 'Set-Cookie': clearTestCookie() });
