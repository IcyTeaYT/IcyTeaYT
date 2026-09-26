import { CATEGORY_IDS, type CategoryId } from '../../../src/data/categories';
import { ipHash, json, readJson, isRateLimited, recordAttempt, safeEqual, sameOrigin, type Env } from '../../_lib/util';

const MAX_FAILURES = 10; // wrong passwords per IP per 15 minutes
const ATTEMPT_WINDOW = 15 * 60;

/**
 * Lists suggestions, newest first. POST so the password travels in the body,
 * never in a URL or server log.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: 'Cross-site requests are not allowed.' }, 403);
  if (!env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD is not configured on the server.' }, 500);

  const body = await readJson(request);
  const password = typeof body?.password === 'string' ? body.password : '';

  const hash = await ipHash(request, env, 'admin');
  if (await isRateLimited(env.DB, hash, MAX_FAILURES, ATTEMPT_WINDOW)) {
    return json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);
  }
  if (!password || !(await safeEqual(password, env.ADMIN_PASSWORD))) {
    await recordAttempt(env.DB, hash);
    return json({ error: 'Wrong password.' }, 401);
  }

  const category = typeof body?.category === 'string' && CATEGORY_IDS.includes(body.category as CategoryId) ? body.category : null;
  const stmt = category
    ? env.DB.prepare('SELECT id, text, category, name, grade, created_at FROM suggestions WHERE category = ?1 ORDER BY created_at DESC, id DESC LIMIT 5000').bind(category)
    : env.DB.prepare('SELECT id, text, category, name, grade, created_at FROM suggestions ORDER BY created_at DESC, id DESC LIMIT 5000');
  const { results } = await stmt.all();
  return json({ suggestions: results });
};

export const onRequest: PagesFunction<Env> = async () => json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
