/**
 * The crypto this API needs, built on Web Crypto so it runs on Workers where
 * Node's `crypto` module and the googleapis SDK are unavailable.
 */

export const b64urlEncode = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const encoder = new TextEncoder();

/** Convert a PEM private key into a signing key. Accepts real or escaped newlines. */
export async function importServiceAccountKey(pem: string): Promise<CryptoKey> {
  const normalised = pem.replace(/\\n/g, '\n').trim();
  const body = normalised
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  return crypto.subtle.importKey(
    'pkcs8',
    b64urlDecode(body.replace(/\+/g, '-').replace(/\//g, '_')).buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Sign a service-account assertion (RS256) for the Google token endpoint. */
export async function signServiceAccountJwt(
  key: CryptoKey,
  claims: Record<string, unknown>,
): Promise<string> {
  const header = b64urlEncode(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = b64urlEncode(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput),
  );
  return `${signingInput}.${b64urlEncode(signature)}`;
}

/* ── Session cookie signing (HMAC-SHA256) ─────────────────────────────────── */

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signPayload(secret: string, payload: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return b64urlEncode(signature);
}

/** Constant-time compare via Web Crypto's own verify, avoiding a timing leak. */
export async function verifyPayload(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      b64urlDecode(signature).buffer as ArrayBuffer,
      encoder.encode(payload),
    );
  } catch {
    return false;
  }
}
