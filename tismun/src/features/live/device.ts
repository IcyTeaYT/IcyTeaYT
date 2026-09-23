import { readJson, writeJson } from '@/lib/storage';

const KEY = 'tismun.deviceId';

let cached: string | null = null;

/**
 * A random id for this browser, kept across reloads, so the server can tell
 * the device running a committee from every other chair's device — and so a
 * chair who refreshes the page is still recognised as the one in control.
 */
export function deviceId(): string {
  if (cached) return cached;
  const stored = readJson<string | null>(KEY, null);
  if (typeof stored === 'string' && /^[\w-]{8,64}$/.test(stored)) {
    cached = stored;
    return stored;
  }
  const fresh =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  writeJson(KEY, fresh);
  cached = fresh;
  return fresh;
}
