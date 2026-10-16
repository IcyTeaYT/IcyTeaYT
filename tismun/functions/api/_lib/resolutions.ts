import {
  emptyCommitteeState,
  normaliseCommitteeState,
  ResolutionError,
  type CommitteeResState,
  type Copy,
  type TopicNo,
} from '../../../src/lib/resolution';

/**
 * Where resolutions, copies and amendments live: two tables, created on first
 * use like the others, so there is no migration to run.
 *
 *   res_committee — one row per committee: its amendments, drafts, where each
 *                   topic's vote stands, and what is on the floor.
 *   res_copy      — one row per country per topic: that country's copy.
 *
 * Each row is a JSON document with a version number. A change reads the row,
 * applies the shared rules from src/lib/resolution.ts, and writes it back only
 * if nobody else wrote in between — otherwise it reads again and retries. Two
 * delegates typing in the same copy therefore never lose each other's work.
 */

let ensured = false;

export async function ensureResTables(db: D1Database): Promise<void> {
  if (ensured) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS res_committee (
         committee_id TEXT PRIMARY KEY,
         version      INTEGER NOT NULL,
         data         TEXT NOT NULL,
         updated_at   INTEGER NOT NULL
       )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS res_copy (
         id           TEXT PRIMARY KEY,
         committee_id TEXT NOT NULL,
         topic        INTEGER NOT NULL,
         owner_key    TEXT NOT NULL,
         version      INTEGER NOT NULL,
         data         TEXT NOT NULL,
         updated_at   INTEGER NOT NULL
       )`,
    ),
    db.prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_res_copy_owner ON res_copy (committee_id, topic, owner_key)',
    ),
  ]);
  ensured = true;
}

const ownerKey = (country: string): string => country.trim().toLowerCase();

const ATTEMPTS = 6;

export async function readCommitteeState(
  db: D1Database,
  committeeId: string,
): Promise<{ state: CommitteeResState; version: number }> {
  const row = await db
    .prepare('SELECT version, data FROM res_committee WHERE committee_id = ?1')
    .bind(committeeId)
    .first<{ version: number; data: string }>();
  if (!row) return { state: emptyCommitteeState(), version: 0 };
  return { state: normaliseCommitteeState(JSON.parse(row.data)), version: row.version };
}

/** Read, change and write back the committee's document, retrying if someone wrote in between. */
export async function mutateCommitteeState<T>(
  db: D1Database,
  committeeId: string,
  change: (state: CommitteeResState) => { state: CommitteeResState; result: T },
): Promise<{ state: CommitteeResState; result: T }> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const { state, version } = await readCommitteeState(db, committeeId);
    const next = change(state);
    const now = Date.now();
    const data = JSON.stringify(next.state);
    const written =
      version === 0
        ? await db
            .prepare(
              `INSERT INTO res_committee (committee_id, version, data, updated_at) VALUES (?1, 1, ?2, ?3)
               ON CONFLICT(committee_id) DO NOTHING`,
            )
            .bind(committeeId, data, now)
            .run()
        : await db
            .prepare(
              'UPDATE res_committee SET version = version + 1, data = ?2, updated_at = ?3 WHERE committee_id = ?1 AND version = ?4',
            )
            .bind(committeeId, data, now, version)
            .run();
    if (written.meta.changes) return next;
  }
  throw new ResolutionError('Too many people saved at once. Try again.', 503);
}

const parseCopy = (data: string, version: number): Copy => ({ ...(JSON.parse(data) as Copy), version });

/** Every copy of one topic in a committee. A committee has a few dozen at most. */
export async function readCopies(db: D1Database, committeeId: string, topic: TopicNo): Promise<Copy[]> {
  const rows = await db
    .prepare('SELECT version, data FROM res_copy WHERE committee_id = ?1 AND topic = ?2')
    .bind(committeeId, topic)
    .all<{ version: number; data: string }>();
  return (rows.results ?? []).map((row) => parseCopy(row.data, row.version));
}

export async function readCopy(db: D1Database, copyId: string): Promise<{ copy: Copy; committeeId: string } | null> {
  const row = await db
    .prepare('SELECT committee_id, version, data FROM res_copy WHERE id = ?1')
    .bind(copyId)
    .first<{ committee_id: string; version: number; data: string }>();
  return row ? { copy: parseCopy(row.data, row.version), committeeId: row.committee_id } : null;
}

/** The copy a draft's writers change it in: one per draft, whoever is typing. */
export const draftCopyKey = (draftId: string): string => `draft:${draftId}`;

/** The copy a country writes a new draft in, once the chairs have chosen one. */
export const newDraftKey = (country: string): string => `new:${ownerKey(country)}`;

export async function readOwnCopy(
  db: D1Database,
  committeeId: string,
  topic: TopicNo,
  key: string,
): Promise<Copy | null> {
  const row = await db
    .prepare('SELECT version, data FROM res_copy WHERE committee_id = ?1 AND topic = ?2 AND owner_key = ?3')
    .bind(committeeId, topic, key)
    .first<{ version: number; data: string }>();
  return row ? parseCopy(row.data, row.version) : null;
}

/**
 * Change a copy, retrying if someone else saved it in between. With no copy
 * id, it is the caller's own country's copy — or, with a key, the copy that
 * key names (a draft's) — created on its first edit.
 */
export async function mutateCopy<T>(
  db: D1Database,
  where: { committeeId: string; topic: TopicNo; copyId: string | null; country: string; key?: string },
  create: () => Copy,
  change: (copy: Copy) => { copy: Copy; result: T },
): Promise<{ copy: Copy; result: T }> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const found = where.copyId
      ? await readCopy(db, where.copyId)
      : await readOwnCopy(db, where.committeeId, where.topic, where.key ?? ownerKey(where.country)).then((copy) =>
          copy ? { copy, committeeId: where.committeeId } : null,
        );
    if (where.copyId && (!found || found.committeeId !== where.committeeId)) {
      throw new ResolutionError('That copy no longer exists.', 404);
    }
    const existing = found?.copy ?? null;
    const base = existing ?? create();
    const next = change(base);
    const now = Date.now();
    const data = JSON.stringify(next.copy);
    const written = existing
      ? await db
          .prepare('UPDATE res_copy SET version = version + 1, data = ?2, updated_at = ?3 WHERE id = ?1 AND version = ?4')
          .bind(base.id, data, now, existing.version)
          .run()
      : await db
          .prepare(
            `INSERT INTO res_copy (id, committee_id, topic, owner_key, version, data, updated_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)
             ON CONFLICT DO NOTHING`,
          )
          .bind(base.id, where.committeeId, where.topic, where.key ?? ownerKey(base.owner), data, now)
          .run();
    if (written.meta.changes) return { copy: { ...next.copy, version: (existing?.version ?? 0) + 1 }, result: next.result };
  }
  throw new ResolutionError('Too many people saved at once. Try again.', 503);
}

/** The Secretariat's reset: every amendment, draft and copy goes. */
export async function resetResolutions(db: D1Database): Promise<void> {
  await ensureResTables(db);
  await db.batch([db.prepare('DELETE FROM res_committee'), db.prepare('DELETE FROM res_copy')]);
}
