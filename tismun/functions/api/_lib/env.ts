/**
 * Server-side configuration. None of this is ever prefixed with VITE_, because
 * anything VITE_-prefixed is compiled into the bundle the browser downloads.
 *
 * Set these in the Cloudflare dashboard (Settings → Environment variables), and
 * in .dev.vars for local `wrangler pages dev`. Mark the two secrets below as
 * "Encrypt" in the dashboard.
 */
export interface Env {
  /** OAuth client ID. Must be the SAME value as VITE_GOOGLE_CLIENT_ID. */
  GOOGLE_CLIENT_ID: string;
  /** School Workspace domain, e.g. "tashkentis.uz". Checked against the token's `hd`. */
  SCHOOL_DOMAIN: string;
  /** The Google Sheet's ID, taken from its URL. */
  SHEET_ID: string;
  /** Service account address, e.g. tismun-sheets@project.iam.gserviceaccount.com */
  GOOGLE_SA_EMAIL: string;
  /** Service account PEM private key. SECRET — encrypt this one. */
  GOOGLE_SA_PRIVATE_KEY: string;
  /** 64+ random characters for signing session cookies. SECRET — encrypt this one. */
  SESSION_SECRET: string;
}

export function requireEnv(env: Env, keys: (keyof Env)[]): string | null {
  const missing = keys.filter((key) => !env[key]);
  return missing.length ? `Server is not configured: missing ${missing.join(', ')}.` : null;
}

export const json = (body: unknown, status = 200, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Per-delegate data must never be held by a shared cache.
      'Cache-Control': 'private, no-store',
      ...headers,
    },
  });

export const fail = (message: string, status: number): Response => json({ error: message }, status);
