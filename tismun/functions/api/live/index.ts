import { fail, json, type Env } from '../_lib/env';
import { guardRead } from '../_lib/live';

/**
 * GET /api/live — every committee's current state, plus the combined log.
 *
 * This is what the Secretariat dashboard polls. It returns summaries only; the
 * full per-committee view is a separate request, so watching six committees at
 * once stays a couple of kilobytes rather than a couple of megabytes.
 */

/** How many combined log entries the overview carries. */
const LOG_LIMIT = 120;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const serverNow = Date.now();

  // No database bound: say so plainly and let the client fall back to the
  // session state it can see in this browser. This is not an error.
  if (!env.DB) {
    return json({ configured: false, serverNow, committees: [], log: [] });
  }

  const guard = await guardRead(request, env);
  if (!guard.ok) return fail(guard.error, guard.status);

  const [states, log] = await Promise.all([
    env.DB.prepare('SELECT summary FROM committee_state ORDER BY committee_id').all<{
      summary: string;
    }>(),
    env.DB.prepare(
      'SELECT id, committee_id, at, type, summary, detail FROM session_log ORDER BY at DESC LIMIT ?1',
    )
      .bind(LOG_LIMIT)
      .all<{
        id: string;
        committee_id: string;
        at: number;
        type: string;
        summary: string;
        detail: string | null;
      }>(),
  ]);

  return json({
    configured: true,
    serverNow,
    committees: (states.results ?? []).map((row) => JSON.parse(row.summary) as unknown),
    log: (log.results ?? []).map((row) => ({
      id: row.id,
      committeeId: row.committee_id,
      at: row.at,
      type: row.type,
      summary: row.summary,
      ...(row.detail ? { detail: row.detail } : {}),
    })),
  });
};
