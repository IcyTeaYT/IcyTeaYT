import { fail, json, requireEnv, type Env } from './_lib/env';
import { EMERGENCY_ID } from './_lib/emergency';
import { isOwner } from './_lib/owners';
import { realUser } from './_lib/session';
import { readCommittees, readUsers } from './_lib/sheets';
import { clearTestCookie, readTestSeat, seatsOf, testCookie, testUserFor } from './_lib/testing';

/**
 * Owners only: see the site exactly as a delegate does.
 *
 * GET    /api/test-as — the seat being tested, and every seat there is to test.
 * POST   /api/test-as { committeeId, country, day2 } — start (or switch) testing.
 * DELETE /api/test-as — stop, and be yourself again.
 *
 * Checked against the signed-in person's own row, never the seat they are
 * testing, so an owner can always switch seats or stop.
 */

async function ownerOnly(request: Request, env: Env) {
  const user = await realUser(request, env);
  if (!user) return { error: fail('Not signed in.', 401) };
  if (!isOwner(env, user.Email)) return { error: fail('Only the site owner can test as a delegate.', 403) };
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
    .filter((committee) => committee.committeeId && seats.has(committee.committeeId))
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

  let body: { committeeId?: unknown; country?: unknown; day2?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  const committeeId = typeof body.committeeId === 'string' ? body.committeeId.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  if (!committeeId || !country) return fail('Pick a committee and a country.', 400);

  const seat = { committeeId, country, day2: body.day2 === true };
  if (!(await testUserFor(env, check.user, seat))) return fail('Nobody sits in that seat on the sheet.', 400);
  return json({ ok: true }, 200, { 'Set-Cookie': testCookie(seat) });
};

export const onRequestDelete: PagesFunction<Env> = async () =>
  json({ ok: true }, 200, { 'Set-Cookie': clearTestCookie() });
