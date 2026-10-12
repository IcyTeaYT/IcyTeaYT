import type { Env } from './env';
import type { SheetUser } from './sheets';

/**
 * Who has been on the site, for the owners' sign-in log.
 *
 * Two tables, created on first use like the others, so there is no migration:
 *   site_activity — one row per event: a sign-in, a sign-out, a return visit,
 *                   or a sign-in turned away because the email is not on the
 *                   roster. Kept for 30 days.
 *   site_presence — one row per person: when they were last seen, for "online
 *                   now". Refreshed by the page's heartbeat while it is open.
 *
 * Recording is best-effort: a database problem must never stop anyone signing
 * in or loading a page, so every write swallows its own errors.
 */

export type ActivityKind = 'sign-in' | 'sign-out' | 'visit' | 'denied';

export interface ActivityEvent {
  id: string;
  at: number;
  kind: ActivityKind;
  email: string;
  name: string | null;
  role: string | null;
  committeeId: string | null;
  country: string | null;
  device: string | null;
}

export interface Presence {
  email: string;
  name: string | null;
  role: string | null;
  committeeId: string | null;
  country: string | null;
  device: string | null;
  lastSeen: number;
}

/** Someone counts as a new visit after this long away. */
const VISIT_GAP_MS = 15 * 60 * 1000;
/** last_seen is rewritten at most this often per person, to keep writes low. */
const PRESENCE_WRITE_MS = 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

let ensured = false;

async function ensureActivityTables(db: D1Database): Promise<void> {
  if (ensured) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS site_activity (
         id           TEXT PRIMARY KEY,
         at           INTEGER NOT NULL,
         kind         TEXT NOT NULL,
         email        TEXT NOT NULL,
         name         TEXT,
         role         TEXT,
         committee_id TEXT,
         country      TEXT,
         device       TEXT
       )`,
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_site_activity_at ON site_activity (at DESC)'),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS site_presence (
         email        TEXT PRIMARY KEY,
         name         TEXT,
         role         TEXT,
         committee_id TEXT,
         country      TEXT,
         device       TEXT,
         last_seen    INTEGER NOT NULL
       )`,
    ),
  ]);
  ensured = true;
}

/** "iPhone · Safari", "Windows · Chrome" — enough to tell devices apart, nothing more. */
export function deviceOf(request: Request): string | null {
  const ua = request.headers.get('User-Agent') ?? '';
  if (!ua) return null;
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /CrOS/.test(ua)
          ? 'Chromebook'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Windows/.test(ua)
              ? 'Windows'
              : /Linux/.test(ua)
                ? 'Linux'
                : null;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\/|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null;
  return [os, browser].filter(Boolean).join(' · ') || null;
}

const clean = (value: string | undefined | null): string | null => (value ?? '').trim() || null;

interface Who {
  email: string;
  name: string | null;
  role: string | null;
  committeeId: string | null;
  country: string | null;
}

const whoOf = (user: SheetUser): Who => ({
  email: user.Email.trim().toLowerCase(),
  name: clean(user['Full Name']),
  role: clean(user.Role)?.toUpperCase() ?? null,
  committeeId: clean(user['Committee ID']),
  country: clean(user.Country),
});

async function insertEvent(db: D1Database, kind: ActivityKind, who: Who, device: string | null, at: number) {
  await db
    .prepare(
      `INSERT INTO site_activity (id, at, kind, email, name, role, committee_id, country, device)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(crypto.randomUUID(), at, kind, who.email, who.name, who.role, who.committeeId, who.country, device)
    .run();
}

async function upsertPresence(db: D1Database, who: Who, device: string | null, at: number) {
  await db
    .prepare(
      `INSERT INTO site_presence (email, name, role, committee_id, country, device, last_seen)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(email) DO UPDATE SET
         name = COALESCE(excluded.name, site_presence.name),
         role = COALESCE(excluded.role, site_presence.role),
         committee_id = COALESCE(excluded.committee_id, site_presence.committee_id),
         country = COALESCE(excluded.country, site_presence.country),
         device = COALESCE(excluded.device, site_presence.device),
         last_seen = excluded.last_seen`,
    )
    .bind(who.email, who.name, who.role, who.committeeId, who.country, device, at)
    .run();
}

/** A successful sign-in. Also prunes events past the retention window. */
export async function recordSignIn(env: Env, user: SheetUser, request: Request): Promise<void> {
  if (!env.DB) return;
  try {
    await ensureActivityTables(env.DB);
    const now = Date.now();
    const device = deviceOf(request);
    const who = whoOf(user);
    await insertEvent(env.DB, 'sign-in', who, device, now);
    await upsertPresence(env.DB, who, device, now);
    await env.DB.prepare('DELETE FROM site_activity WHERE at < ?1').bind(now - RETENTION_MS).run();
  } catch {
    /* best-effort */
  }
}

/** A Google account that is not on the roster tried to sign in. */
export async function recordDenied(env: Env, email: string, name: string | null, request: Request): Promise<void> {
  if (!env.DB) return;
  try {
    await ensureActivityTables(env.DB);
    const who: Who = { email: email.trim().toLowerCase(), name: clean(name), role: null, committeeId: null, country: null };
    await insertEvent(env.DB, 'denied', who, deviceOf(request), Date.now());
  } catch {
    /* best-effort */
  }
}

/** A sign-out. They are no longer online. */
export async function recordSignOut(env: Env, email: string, request: Request): Promise<void> {
  if (!env.DB) return;
  try {
    await ensureActivityTables(env.DB);
    const normalised = email.trim().toLowerCase();
    const row = await env.DB.prepare('SELECT name, role, committee_id, country FROM site_presence WHERE email = ?1')
      .bind(normalised)
      .first<{ name: string | null; role: string | null; committee_id: string | null; country: string | null }>();
    const who: Who = {
      email: normalised,
      name: row?.name ?? null,
      role: row?.role ?? null,
      committeeId: row?.committee_id ?? null,
      country: row?.country ?? null,
    };
    await insertEvent(env.DB, 'sign-out', who, deviceOf(request), Date.now());
    await env.DB.prepare('DELETE FROM site_presence WHERE email = ?1').bind(normalised).run();
  } catch {
    /* best-effort */
  }
}

/**
 * The page is open. Refreshes "last seen", and logs a visit when the person is
 * back after a while away — a session cookie lasts all day, so most people sign
 * in once and simply come back.
 *
 * `user` is the full sheet row when the caller has it; the heartbeat only has
 * the email, and the stored row fills in the rest.
 */
export async function touch(env: Env, email: string, user: SheetUser | null, request: Request): Promise<void> {
  if (!env.DB) return;
  try {
    await ensureActivityTables(env.DB);
    const now = Date.now();
    const normalised = email.trim().toLowerCase();
    const row = await env.DB.prepare(
      'SELECT name, role, committee_id, country, last_seen FROM site_presence WHERE email = ?1',
    )
      .bind(normalised)
      .first<{ name: string | null; role: string | null; committee_id: string | null; country: string | null; last_seen: number }>();
    if (row && now - row.last_seen < PRESENCE_WRITE_MS) return;

    const who: Who = user
      ? whoOf(user)
      : {
          email: normalised,
          name: row?.name ?? null,
          role: row?.role ?? null,
          committeeId: row?.committee_id ?? null,
          country: row?.country ?? null,
        };
    const device = deviceOf(request);
    if (!row || now - row.last_seen >= VISIT_GAP_MS) await insertEvent(env.DB, 'visit', who, device, now);
    await upsertPresence(env.DB, who, device, now);
  } catch {
    /* best-effort */
  }
}

/** The owners' view: who is around, and the latest events. */
export async function readActivity(
  db: D1Database,
  limit = 300,
): Promise<{ presence: Presence[]; events: ActivityEvent[] }> {
  await ensureActivityTables(db);
  const [presence, events] = await Promise.all([
    db
      .prepare(
        `SELECT email, name, role, committee_id, country, device, last_seen
         FROM site_presence ORDER BY last_seen DESC LIMIT 500`,
      )
      .all<{
        email: string;
        name: string | null;
        role: string | null;
        committee_id: string | null;
        country: string | null;
        device: string | null;
        last_seen: number;
      }>(),
    db
      .prepare(
        `SELECT id, at, kind, email, name, role, committee_id, country, device
         FROM site_activity ORDER BY at DESC LIMIT ?1`,
      )
      .bind(limit)
      .all<{
        id: string;
        at: number;
        kind: ActivityKind;
        email: string;
        name: string | null;
        role: string | null;
        committee_id: string | null;
        country: string | null;
        device: string | null;
      }>(),
  ]);
  return {
    presence: (presence.results ?? []).map((row) => ({
      email: row.email,
      name: row.name,
      role: row.role,
      committeeId: row.committee_id,
      country: row.country,
      device: row.device,
      lastSeen: row.last_seen,
    })),
    events: (events.results ?? []).map((row) => ({
      id: row.id,
      at: row.at,
      kind: row.kind,
      email: row.email,
      name: row.name,
      role: row.role,
      committeeId: row.committee_id,
      country: row.country,
      device: row.device,
    })),
  };
}
