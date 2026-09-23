import {
  conferenceStatus,
  type ConferenceStatus,
  type FocusMode,
  type ReleaseMode,
} from '../../../src/config/emergency';
import type { Env } from './env';

/**
 * Where the conference stands: whether the Emergency Session topic is out, and
 * whether Day 2 has begun. Both follow the schedule in src/config/emergency.ts,
 * measured on THIS server's clock — a browser never decides. The Secretariat
 * can override either as a backup, and every override is recorded with who
 * made it.
 */

const RELEASE_KEY = 'emergency.release';
const FOCUS_KEY = 'emergency.focus';

let ensured = false;

/** Created on first use, like the control table, so there is no migration to run. */
export async function ensureConferenceTables(db: D1Database): Promise<void> {
  if (ensured) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS conference_flags (
         key        TEXT PRIMARY KEY,
         value      TEXT NOT NULL,
         updated_at INTEGER NOT NULL,
         updated_by TEXT
       )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS conference_events (
         id       TEXT PRIMARY KEY,
         at       INTEGER NOT NULL,
         action   TEXT NOT NULL,
         detail   TEXT,
         by_name  TEXT,
         by_email TEXT
       )`,
    ),
  ]);
  ensured = true;
}

const asReleaseMode = (value: unknown): ReleaseMode =>
  value === 'released' || value === 'locked' ? value : 'auto';
const asFocusMode = (value: unknown): FocusMode => (value === 'on' || value === 'off' ? value : 'auto');

/**
 * The conference's status right now. Without a database there are no
 * overrides to read, and the schedule alone decides — which is the normal
 * path anyway.
 */
export async function readStatus(env: Env, now = Date.now()): Promise<ConferenceStatus> {
  if (!env.DB) return conferenceStatus(now, 'auto', 'auto');
  try {
    await ensureConferenceTables(env.DB);
    const { results } = await env.DB.prepare(
      'SELECT key, value FROM conference_flags WHERE key IN (?1, ?2)',
    )
      .bind(RELEASE_KEY, FOCUS_KEY)
      .all<{ key: string; value: string }>();
    const flags = new Map((results ?? []).map((row) => [row.key, row.value]));
    return conferenceStatus(now, asReleaseMode(flags.get(RELEASE_KEY)), asFocusMode(flags.get(FOCUS_KEY)));
  } catch {
    // A database problem must never unlock anything early: fall back to the
    // schedule, which is exactly what would happen with no override set.
    return conferenceStatus(now, 'auto', 'auto');
  }
}

export interface ConferenceEvent {
  id: string;
  at: number;
  action: string;
  detail: string | null;
  byName: string | null;
}

export async function recentEvents(db: D1Database, limit = 20): Promise<ConferenceEvent[]> {
  await ensureConferenceTables(db);
  const { results } = await db
    .prepare('SELECT id, at, action, detail, by_name FROM conference_events ORDER BY at DESC LIMIT ?1')
    .bind(limit)
    .all<{ id: string; at: number; action: string; detail: string | null; by_name: string | null }>();
  return (results ?? []).map((row) => ({
    id: row.id,
    at: row.at,
    action: row.action,
    detail: row.detail,
    byName: row.by_name,
  }));
}

export type OverrideAction =
  | 'release-now'
  | 'unrelease'
  | 'release-auto'
  | 'day2-now'
  | 'day2-hold'
  | 'day2-auto';

const OVERRIDES: Record<OverrideAction, { key: string; value: string; label: string }> = {
  'release-now': { key: RELEASE_KEY, value: 'released', label: 'Emergency Session topic released early' },
  unrelease: { key: RELEASE_KEY, value: 'locked', label: 'Emergency Session topic un-released (locked)' },
  'release-auto': { key: RELEASE_KEY, value: 'auto', label: 'Topic release returned to the schedule' },
  'day2-now': { key: FOCUS_KEY, value: 'on', label: 'Switched to Day 2 early' },
  'day2-hold': { key: FOCUS_KEY, value: 'off', label: 'Day 2 held back — Day 1 continues' },
  'day2-auto': { key: FOCUS_KEY, value: 'auto', label: 'Day 2 returned to the schedule' },
};

export const isOverrideAction = (value: unknown): value is OverrideAction =>
  typeof value === 'string' && value in OVERRIDES;

/** Set an override and record who did it, in one transaction. */
export async function applyOverride(
  db: D1Database,
  action: OverrideAction,
  by: { name: string | null; email: string | null },
  now = Date.now(),
): Promise<void> {
  await ensureConferenceTables(db);
  const { key, value, label } = OVERRIDES[action];
  await db.batch([
    db
      .prepare(
        `INSERT INTO conference_flags (key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      )
      .bind(key, value, now, by.email),
    db
      .prepare(
        'INSERT INTO conference_events (id, at, action, detail, by_name, by_email) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
      )
      .bind(crypto.randomUUID(), now, action, label, by.name, by.email),
  ]);
}
