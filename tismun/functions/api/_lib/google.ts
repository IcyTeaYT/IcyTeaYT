import { b64urlDecode } from './jwt';

/**
 * Verify a Google ID token the browser obtained from Google Identity Services.
 *
 * Everything that matters is checked HERE, on the server: the RSA signature
 * against Google's published keys, the audience, the issuer, the expiry, the
 * verified-email flag, and the hosted-domain claim. The browser's copy of the
 * token is treated as a claim to be proved, never as an answer to be believed.
 */

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

let keyCache: { keys: Jwk[]; expiresAt: number } | null = null;

async function fetchKeys(): Promise<Jwk[]> {
  if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.keys;

  const response = await fetch(CERTS_URL);
  if (!response.ok) throw new Error(`Could not fetch Google signing keys (${response.status})`);

  // Honour Google's own cache lifetime; they rotate these regularly.
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control') ?? '')?.[1] ?? 3600);
  const body = (await response.json()) as { keys: Jwk[] };
  keyCache = { keys: body.keys, expiresAt: Date.now() + maxAge * 1000 };
  return body.keys;
}

export interface GoogleIdentity {
  email: string;
  name: string;
  hd?: string;
  emailVerified: boolean;
}

export type VerifyResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; status: number; error: string };

export async function verifyGoogleIdToken(
  token: string,
  clientId: string,
  schoolDomain: string,
): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, status: 400, error: 'Malformed sign-in token.' };
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  let header: { kid?: string; alg?: string };
  let payload: {
    iss?: string;
    aud?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    hd?: string;
  };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(headerPart)));
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadPart)));
  } catch {
    return { ok: false, status: 400, error: 'Malformed sign-in token.' };
  }

  if (header.alg !== 'RS256' || !header.kid) {
    return { ok: false, status: 400, error: 'Unsupported sign-in token.' };
  }

  const jwk = (await fetchKeys()).find((key) => key.kid === header.kid);
  if (!jwk) return { ok: false, status: 401, error: 'Sign-in token could not be verified.' };

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlDecode(signaturePart).buffer as ArrayBuffer,
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!valid) return { ok: false, status: 401, error: 'Sign-in token could not be verified.' };

  if (!payload.iss || !ISSUERS.has(payload.iss)) {
    return { ok: false, status: 401, error: 'Sign-in token has the wrong issuer.' };
  }
  // Without this check any Google app's token would be accepted as ours.
  if (payload.aud !== clientId) {
    return { ok: false, status: 401, error: 'Sign-in token was issued for another application.' };
  }
  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    return { ok: false, status: 401, error: 'Sign-in token has expired. Please try again.' };
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!payload.email || !emailVerified) {
    return { ok: false, status: 403, error: 'That Google account has no verified email address.' };
  }

  // The domain gate. `hd` is only present on Workspace accounts, so a personal
  // gmail.com address fails here rather than on a guessable email suffix.
  if (schoolDomain && payload.hd?.toLowerCase() !== schoolDomain.toLowerCase()) {
    return { ok: false, status: 403, error: 'Please sign in with your school account.' };
  }

  return {
    ok: true,
    identity: {
      email: payload.email.toLowerCase(),
      name: payload.name ?? '',
      ...(payload.hd ? { hd: payload.hd } : {}),
      emailVerified,
    },
  };
}
