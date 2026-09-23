import { fail, json, type Env } from '../_lib/env';
import {
  CONTROL_TTL_MS,
  ensureControlTable,
  holderOf,
  readControl,
  validDeviceId,
} from '../_lib/control';
import { describeDbError, guardWrite } from '../_lib/live';

/**
 * GET  /api/control/:committeeId?device=… — who is running the committee, and
 *      what it looks like right now, for a chair's device that is watching.
 * POST /api/control/:committeeId — claim the committee for this device.
 *      `{ deviceId, force }`: without force the claim only succeeds when nobody
 *      holds it, the claim has lapsed, or this device already holds it. With
 *      force it always succeeds — that is Take over.
 *
 * Only the committee's own chairs may ask either question.
 */

const paramOf = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

export const onRequestGet: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const serverNow = Date.now();
  const committeeId = paramOf(params.committeeId);
  if (!env.DB) return json({ configured: false, serverNow });

  const guard = await guardWrite(request, env, committeeId);
  if (!guard.ok) return fail(guard.error, guard.status);

  const deviceId = new URL(request.url).searchParams.get('device');

  try {
    await ensureControlTable(env.DB);
    const [row, summaryRow] = await Promise.all([
      readControl(env.DB, committeeId),
      env.DB.prepare('SELECT summary FROM committee_state WHERE committee_id = ?1')
        .bind(committeeId)
        .first<{ summary: string }>()
        .catch(() => null),
    ]);
    return json({
      configured: true,
      serverNow,
      holder: holderOf(row, serverNow, guard.user?.Email),
      isYou: Boolean(row && deviceId && row.device_id === deviceId),
      summary: summaryRow ? (JSON.parse(summaryRow.summary) as unknown) : null,
    });
  } catch (error) {
    return json({ configured: false, serverNow, error: describeDbError(error) });
  }
};

export const onRequestPost: PagesFunction<Env, 'committeeId'> = async ({
  request,
  env,
  params,
}) => {
  const serverNow = Date.now();
  const committeeId = paramOf(params.committeeId);
  if (!env.DB) return json({ configured: false, serverNow });

  const guard = await guardWrite(request, env, committeeId);
  if (!guard.ok) return fail(guard.error, guard.status);

  let body: { deviceId?: unknown; force?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('Expected a JSON body.', 400);
  }
  if (!validDeviceId(body.deviceId)) return fail('Missing device id.', 400);
  const deviceId = body.deviceId;
  const force = body.force === true;
  const name = guard.user?.['Full Name']?.trim() || null;
  const email = guard.user?.Email?.trim() || null;

  try {
    await ensureControlTable(env.DB);
    // One statement, so two devices claiming at the same moment cannot both win.
    await env.DB.prepare(
      `INSERT INTO committee_control (committee_id, device_id, holder_name, holder_email, heartbeat_at)
       VALUES (?1, ?2, ?3, ?7, ?4)
       ON CONFLICT(committee_id) DO UPDATE SET
         device_id = excluded.device_id,
         holder_name = excluded.holder_name,
         holder_email = excluded.holder_email,
         heartbeat_at = excluded.heartbeat_at
       WHERE committee_control.device_id = excluded.device_id
          OR committee_control.heartbeat_at < ?5
          OR ?6 = 1`,
    )
      .bind(
        committeeId,
        deviceId,
        name,
        serverNow,
        serverNow - CONTROL_TTL_MS,
        force ? 1 : 0,
        email,
      )
      .run();

    const row = await readControl(env.DB, committeeId);
    const acquired = row?.device_id === deviceId;

    return json({
      configured: true,
      serverNow,
      acquired,
      holder: holderOf(row, serverNow, email),
      // The session to carry on from — only when it was last reported by some
      // other device. If this device reported it, what it has locally is at
      // least as new.
      state:
        acquired && row?.state && row.state_device_id !== deviceId
          ? (JSON.parse(row.state) as unknown)
          : null,
    });
  } catch (error) {
    return json({ configured: false, serverNow, error: describeDbError(error) });
  }
};
