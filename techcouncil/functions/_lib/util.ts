export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  /** Secret mixed into IP hashes so they can't be reversed by brute force. */
  IP_SALT?: string;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Salted hash of the client IP. The raw IP is never stored. */
export async function ipHash(request: Request, env: Env, scope: string) {
  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown';
  return sha256Hex(`${scope}:${env.IP_SALT ?? 'tis-tech-council'}:${ip}`);
}

/** Constant-time comparison of two strings via their SHA-256 digests. */
export async function safeEqual(a: string, b: string) {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

/** Rejects cross-site form posts. Same-origin fetches and non-browser clients pass. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Reads a small JSON body, refusing anything suspiciously large. */
export async function readJson(request: Request, maxBytes = 8192): Promise<Record<string, unknown> | null> {
  const len = Number(request.headers.get('Content-Length') ?? '0');
  if (len > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const data: unknown = JSON.parse(text);
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** True when this hash already has `limit` or more attempts in the last `windowSec` seconds. */
export async function isRateLimited(db: D1Database, hash: string, limit: number, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE ip_hash = ?1 AND created_at > ?2')
    .bind(hash, now - windowSec)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= limit;
}

/** Records one attempt and prunes entries older than a day. */
export async function recordAttempt(db: D1Database, hash: string) {
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare('INSERT INTO rate_limits (ip_hash, created_at) VALUES (?1, ?2)').bind(hash, now),
    db.prepare('DELETE FROM rate_limits WHERE created_at < ?1').bind(now - 86400),
  ]);
}
