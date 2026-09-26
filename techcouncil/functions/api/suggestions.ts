import { CATEGORY_IDS, GRADE_MAX, NAME_MAX, SUGGESTION_MAX, SUGGESTION_MIN, type CategoryId } from '../../src/data/categories';
import { ipHash, json, readJson, sameOrigin, isRateLimited, recordAttempt, type Env } from '../_lib/util';

const RATE_LIMIT = 5; // suggestions per IP…
const RATE_WINDOW = 60 * 60; // …per hour

/** Trims, collapses runs of blank lines and strips control characters. */
function clean(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max + 1);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ ok: false, error: 'Cross-site requests are not allowed.' }, 403);

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: 'Invalid request.' }, 400);

  // Honeypot: real people never see this field. Pretend it worked.
  if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true });

  const text = clean(body.text, SUGGESTION_MAX);
  const category = typeof body.category === 'string' ? body.category : '';
  const name = clean(body.name, NAME_MAX).replace(/\s+/g, ' ');
  const grade = clean(body.grade, GRADE_MAX).replace(/\s+/g, ' ');

  if (text.length < SUGGESTION_MIN) return json({ ok: false, error: `Please write at least ${SUGGESTION_MIN} characters.` }, 400);
  if (text.length > SUGGESTION_MAX) return json({ ok: false, error: `Please keep it under ${SUGGESTION_MAX} characters.` }, 400);
  if (!CATEGORY_IDS.includes(category as CategoryId)) return json({ ok: false, error: 'Please pick a category.' }, 400);
  if (name.length > NAME_MAX) return json({ ok: false, error: 'That name is too long.' }, 400);
  if (grade.length > GRADE_MAX) return json({ ok: false, error: 'That grade is too long.' }, 400);

  try {
    const hash = await ipHash(request, env, 'suggest');
    if (await isRateLimited(env.DB, hash, RATE_LIMIT, RATE_WINDOW)) {
      return json({ ok: false, error: 'You’ve sent a lot of ideas in the last hour. Please try again later.' }, 429, { 'Retry-After': '3600' });
    }
    await env.DB.prepare('INSERT INTO suggestions (text, category, name, grade) VALUES (?1, ?2, ?3, ?4)')
      .bind(text, category, name || null, grade || null)
      .run();
    await recordAttempt(env.DB, hash);
    return json({ ok: true }, 201);
  } catch (err) {
    console.error('suggestion insert failed', err);
    return json({ ok: false, error: 'Something went wrong on our side. Please try again in a minute.' }, 500);
  }
};

export const onRequest: PagesFunction<Env> = async () =>
  json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
