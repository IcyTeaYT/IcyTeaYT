import { json, type Env } from './_lib/env';
import { readStatus } from './_lib/conference';
import { readSession } from './_lib/session';
import { ownerSeat, readTestSeat } from './_lib/testing';

/**
 * GET /api/conference — where the conference stands, on the server's clock:
 * the release and Day 2 times, whether each has happened, and any override.
 *
 * Open pages ask every thirty seconds, so the Emergency Session topic appears
 * without a refresh at 8:30. Nothing secret is in here — only times and yes/no.
 *
 * An owner testing a seat "on Day 2" is told Day 2 has begun and the topic is
 * out — them alone, checked against the signed session.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const status = await readStatus(env);
  if (!env.SESSION_SECRET || !readTestSeat(request)?.day2) return json(status);
  const seat = ownerSeat(request, env, await readSession(request, env));
  return json(seat?.day2 ? { ...status, day2: true, released: true } : status);
};
