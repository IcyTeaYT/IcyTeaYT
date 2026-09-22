import type { Env } from './env';
import { b64urlDecode, b64urlEncode, signPayload, verifyPayload } from './jwt';
import { findUser, type SheetUser } from './sheets';

/**
 * The session cookie.
 *
 * It carries the signed-in email and nothing else — no role, no committee. Role
 * and assignment are re-read from the sheet on every request, so moving someone
 * from delegate to chair in the spreadsheet takes effect immediately, and a
 * cookie can never assert a privilege its holder no longer has.
 */

const COOKIE_NAME = 'tismun_session';
const MAX_AGE_SECONDS = 12 * 60 * 60; // one conference day

interface SessionPayload {
  email: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function createSessionCookie(env: Env, email: string): Promise<string> {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const encoded = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(env.SESSION_SECRET, encoded);

  return [
    `${COOKIE_NAME}=${encoded}.${signature}`,
    'Path=/',
    // HttpOnly: no script, including any injected into the page, can read it.
    'HttpOnly',
    'Secure',
    // Lax still arrives on the top-level navigation back from Google.
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ].join('; ');
}

export const clearSessionCookie = (): string =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** The signed-in email, or null. Verifies the signature before trusting anything. */
export async function readSession(request: Request, env: Env): Promise<string | null> {
  const raw = readCookie(request, COOKIE_NAME);
  if (!raw) return null;

  const separator = raw.lastIndexOf('.');
  if (separator < 1) return null;

  const encoded = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!(await verifyPayload(env.SESSION_SECRET, encoded, signature))) return null;

  try {
    const payload = JSON.parse(decoder.decode(b64urlDecode(encoded))) as SessionPayload;
    if (!payload.email || payload.exp * 1000 < Date.now()) return null;
    return payload.email;
  } catch {
    return null;
  }
}

/** The signed-in user's sheet row, or null when not signed in or off the roster. */
export async function currentUser(request: Request, env: Env): Promise<SheetUser | null> {
  const email = await readSession(request, env);
  return email ? findUser(env, email) : null;
}
