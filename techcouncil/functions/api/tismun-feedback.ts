import { FEEDBACK_COMMENT_MAX, FEEDBACK_NAME_MAX, FEEDBACK_ROLE_IDS, type FeedbackRole } from '../../src/data/feedback';
import { notifyFeedback } from '../_lib/telegram';
import { ipHash, isRateLimited, json, readJson, recordAttempt, sameOrigin, type Env } from '../_lib/util';

const RATE_LIMIT = 5; // feedback per IP…
const RATE_WINDOW = 60 * 60; // …per hour

const TABLE = `CREATE TABLE IF NOT EXISTS tismun_feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  role        TEXT    NOT NULL CHECK (role IN ('delegate', 'chair', 'staff', 'guest')),
  comment     TEXT             CHECK (comment IS NULL OR length(comment) <= 1000),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

function clean(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max + 1);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!sameOrigin(request)) return json({ ok: false, error: 'Cross-site requests are not allowed.' }, 403);
  const body = await readJson(request);
  if (!body) return json({ ok: false, error: 'Invalid request.' }, 400);
  if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true });

  const rating = Number(body.rating);
  const name = clean(body.name, FEEDBACK_NAME_MAX).replace(/\s+/g, ' ');
  const role = typeof body.role === 'string' ? body.role : '';
  const comment = clean(body.comment, FEEDBACK_COMMENT_MAX);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ ok: false, error: 'Please pick a rating from 1 to 5.' }, 400);
  if (!name) return json({ ok: false, error: 'Please add your name.' }, 400);
  if (name.length > FEEDBACK_NAME_MAX) return json({ ok: false, error: 'That name is too long.' }, 400);
  if (!FEEDBACK_ROLE_IDS.includes(role as FeedbackRole)) return json({ ok: false, error: 'Please pick your role.' }, 400);
  if (comment.length > FEEDBACK_COMMENT_MAX) return json({ ok: false, error: `Please keep it under ${FEEDBACK_COMMENT_MAX} characters.` }, 400);

  try {
    const hash = await ipHash(request, env, 'tismun-feedback');
    if (await isRateLimited(env.DB, hash, RATE_LIMIT, RATE_WINDOW)) {
      return json({ ok: false, error: 'You’ve sent a lot of feedback in the last hour. Please try again later.' }, 429, { 'Retry-After': '3600' });
    }
    // Created on first use, so no manual database step is needed.
    await env.DB.prepare(TABLE).run();
    const saved = await env.DB.prepare('INSERT INTO tismun_feedback (rating, name, role, comment) VALUES (?1, ?2, ?3, ?4)')
      .bind(rating, name, role, comment || null)
      .run();
    waitUntil(notifyFeedback(env, { id: saved.meta.last_row_id ?? null, rating, name, role, comment }));
    await recordAttempt(env.DB, hash);
    return json({ ok: true }, 201);
  } catch (err) {
    console.error('tismun feedback insert failed', err);
    return json({ ok: false, error: 'Something went wrong on our side. Please try again in a minute.' }, 500);
  }
};

export const onRequest: PagesFunction<Env> = async () => json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
