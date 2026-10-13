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
  /**
   * Optional. School Workspace domain, e.g. "tashkentis.uz". When set, only
   * accounts on that domain may sign in. When left out, access is decided by
   * the Users sheet alone — whoever's email is on it gets in, whatever account
   * type it is.
   */
  SCHOOL_DOMAIN?: string;
  /**
   * Optional. Comma-separated emails of the site's owners. They keep their own
   * role from the Users sheet (a chair stays a chair) and also get Secretariat
   * oversight and the sign-in log, which nobody else can see. Kept out of the
   * code so no address is ever committed.
   */
  OWNER_EMAILS?: string;
  /** The Google Sheet's ID, taken from its URL. */
  SHEET_ID: string;
  /** Service account address, e.g. tismun-sheets@project.iam.gserviceaccount.com */
  GOOGLE_SA_EMAIL: string;
  /** Service account PEM private key. SECRET — encrypt this one. */
  GOOGLE_SA_PRIVATE_KEY: string;
  /** 64+ random characters for signing session cookies. SECRET — encrypt this one. */
  SESSION_SECRET: string;
  /**
   * D1 database for live session sync, bound in the Cloudflare dashboard under
   * Settings → Functions → D1 database bindings, with the variable name DB.
   *
   * Optional on purpose: with no binding the site still works completely, the
   * Secretariat dashboard just falls back to whatever this browser knows
   * instead of seeing other people's devices.
   */
  DB?: D1Database;
}

/**
 * True once the Google Sheet and session signing are configured — i.e. the
 * deployment is running for real rather than on demo data.
 *
 * Demo deployments have no identity at all (anyone can pick any account on the
 * login page), so there is nothing to authorise against. Live deployments get
 * the full checks. This is why a demo deployment must be treated as public.
 */
export const isLiveMode = (env: Env): boolean => Boolean(env.SESSION_SECRET && env.SHEET_ID);

export function requireEnv(env: Env, keys: (keyof Env)[]): string | null {
  const missing = keys.filter((key) => !env[key]);
  return missing.length ? `Server is not configured: missing ${missing.join(', ')}.` : null;
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const all = new Headers(headers);
  all.set('Content-Type', 'application/json; charset=utf-8');
  // Per-delegate data must never be held by a shared cache.
  all.set('Cache-Control', 'private, no-store');
  return new Response(JSON.stringify(body), { status, headers: all });
}

export const fail = (message: string, status: number): Response => json({ error: message }, status);
