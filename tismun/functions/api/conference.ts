import { json, type Env } from './_lib/env';
import { readStatus } from './_lib/conference';

/**
 * GET /api/conference — where the conference stands, on the server's clock:
 * the release and Day 2 times, whether each has happened, and any override.
 *
 * Open pages ask every thirty seconds, so the Emergency Session topic appears
 * without a refresh at 8:30. Nothing secret is in here — only times and yes/no.
 */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => json(await readStatus(env));
