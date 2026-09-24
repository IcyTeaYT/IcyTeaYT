import { fail, json, type Env } from '../_lib/env';
import { readStatus } from '../_lib/conference';
import { ensureControlTable, holderOf, readControl, validDeviceId } from '../_lib/control';
import { describeDbError, guardRead, guardWrite, LOG_RETENTION_MS } from '../_lib/live';

/**
 * GET  /api/live/:committeeId — the full read-only view of one committee.
 * POST /api/live/:committeeId — the chair's browser reporting its session.
 *
 * The server stores whatever JSON it is handed and gives it back. It does not
 * know what a quorum is, or which majority a motion needs: those rules live in
 * src/config/rules.ts and are applied in the browser. Keeping the relay dumb
 * means there is no second implementation of the rules of procedure here to
 * fall out of step with the first.
 */

const paramOf = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

export const onRequestGet: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const serverNow = Date.now();
  const committeeId = paramOf(params.committeeId);
  if (!committeeId) return fail('No committee was requested.', 400);

  if (!env.DB) return json({ configured: false, serverNow, snapshot: null });

  const guard = await guardRead(request, env, committeeId);
  if (!guard.ok) return fail(guard.error, guard.status);

  try {
    const row = await env.DB.prepare('SELECT snapshot FROM committee_state WHERE committee_id = ?1')
      .bind(committeeId)
      .first<{ snapshot: string }>();

    return json({
      configured: true,
      serverNow,
      snapshot: row ? (JSON.parse(row.snapshot) as unknown) : null,
    });
  } catch (error) {
    return json({ configured: false, serverNow, snapshot: null, error: describeDbError(error) });
  }
};

interface PushBody {
  /** The reporting device. Only the device holding the committee may report. */
  deviceId?: unknown;
  /** The full session, in server time, so another device can take over. */
  chairState?: unknown;
  /** The last Secretariat reset this device's session has taken in (server time). */
  resetEpoch?: unknown;
  summary?: unknown;
  snapshot?: unknown;
  log?: { id: string; at: number; type: string; summary: string; detail?: string }[];
}

export const onRequestPost: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const serverNow = Date.now();
  const committeeId = paramOf(params.committeeId);
  if (!committeeId) return fail('No committee was given.', 400);

  // Nothing bound to sync to. Tell the chair's browser so it can stop asking.
  if (!env.DB) return json({ configured: false, serverNow });

  const guard = await guardWrite(request, env, committeeId);
  if (!guard.ok) return fail(guard.error, guard.status);

  let body: PushBody;
  try {
    body = (await request.json()) as PushBody;
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  if (!body.summary || !body.snapshot) return fail('Missing summary or snapshot.', 400);
  if (!validDeviceId(body.deviceId)) return fail('Missing device id — reload the page.', 400);
  const deviceId = body.deviceId;

  // The Secretariat has reset every session since this device last heard: it
  // must wipe its copy first, so the old session cannot come back.
  const { sessionsResetAt } = await readStatus(env, serverNow);
  const resetEpoch = typeof body.resetEpoch === 'number' ? body.resetEpoch : 0;
  if (sessionsResetAt !== null && resetEpoch < sessionsResetAt) {
    return json({ configured: true, serverNow, reset: true, sessionsResetAt }, 409);
  }

  // Report only while this device holds the committee. The claim is refreshed
  // and the full session stored in the same statement; if another device has
  // taken over, nothing changes and this one is told to stand down.
  try {
    await ensureControlTable(env.DB);
    const claim = await env.DB.prepare(
      `INSERT INTO committee_control
         (committee_id, device_id, holder_name, holder_email, heartbeat_at, state, state_device_id)
       VALUES (?1, ?2, ?3, ?6, ?4, ?5, ?2)
       ON CONFLICT(committee_id) DO UPDATE SET
         holder_name = excluded.holder_name,
         holder_email = excluded.holder_email,
         heartbeat_at = excluded.heartbeat_at,
         state = COALESCE(excluded.state, committee_control.state),
         state_device_id = CASE WHEN excluded.state IS NULL
           THEN committee_control.state_device_id ELSE excluded.device_id END
       WHERE committee_control.device_id = excluded.device_id`,
    )
      .bind(
        committeeId,
        deviceId,
        guard.user?.['Full Name']?.trim() || null,
        serverNow,
        body.chairState ? JSON.stringify(body.chairState) : null,
        guard.user?.Email?.trim() || null,
      )
      .run();

    if (!claim.meta.changes) {
      const row = await readControl(env.DB, committeeId);
      return json(
        {
          configured: true,
          serverNow,
          locked: true,
          holder: holderOf(row, serverNow, guard.user?.Email),
        },
        409,
      );
    }
  } catch (error) {
    return json({ configured: false, serverNow, error: describeDbError(error) });
  }

  const summary = body.summary as { updatedAt?: number };
  const statements = [
    env.DB.prepare(
      `INSERT INTO committee_state (committee_id, updated_at, received_at, summary, snapshot)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(committee_id) DO UPDATE SET
         updated_at = excluded.updated_at,
         received_at = excluded.received_at,
         summary = excluded.summary,
         snapshot = excluded.snapshot`,
    ).bind(
      committeeId,
      typeof summary.updatedAt === 'number' ? summary.updatedAt : serverNow,
      serverNow,
      JSON.stringify(body.summary),
      JSON.stringify(body.snapshot),
    ),
  ];

  // Log entries carry their own ids, so re-sending the same window is a no-op
  // rather than a duplicate — which makes the push safe to retry.
  for (const entry of body.log ?? []) {
    if (!entry?.id) continue;
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO session_log (id, committee_id, at, type, summary, detail)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      ).bind(entry.id, committeeId, entry.at, entry.type, entry.summary, entry.detail ?? null),
    );
  }

  try {
    await env.DB.batch(statements);

    // Occasional housekeeping rather than a cron: one push in fifty clears out
    // anything older than the retention window.
    if (Math.random() < 0.02) {
      await env.DB.prepare('DELETE FROM session_log WHERE at < ?1')
        .bind(serverNow - LOG_RETENTION_MS)
        .run();
    }
  } catch (error) {
    // A chair mid-session must never lose their committee to a database
    // problem: the dashboard keeps working on local state either way.
    return json({ configured: false, serverNow, error: describeDbError(error) });
  }

  return json({ configured: true, serverNow });
};
