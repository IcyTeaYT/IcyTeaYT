import { noteServerNow } from './serverClock';
import type { LiveDetail, LiveOverview, LivePush } from './types';

/**
 * Talking to the live-sync API, when there is one.
 *
 * There often isn't: `npm run dev` serves the frontend with no Pages Functions
 * behind it, and a deployment without a D1 binding answers `configured: false`.
 * Neither is an error — the site works either way — so the client probes once,
 * remembers the answer, and stops asking until the backoff expires.
 */

const PROBE_BACKOFF_MS = 60_000;

let reachable: boolean | null = null;
let nextProbeAt = 0;

/** null = not yet known. */
export const isSyncReachable = (): boolean | null => reachable;

function markUnreachable(): void {
  reachable = false;
  nextProbeAt = Date.now() + PROBE_BACKOFF_MS;
}

function shouldSkip(): boolean {
  return reachable === false && Date.now() < nextProbeAt;
}

async function call<T extends { configured: boolean; serverNow: number }>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  if (shouldSkip()) return null;

  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });

    // 401/403 mean the API is there and answering — it just will not answer
    // this caller. That is a permission problem, not an availability one.
    if (response.status === 401 || response.status === 403) {
      reachable = true;
      return null;
    }
    if (!response.ok) {
      markUnreachable();
      return null;
    }

    const body = (await response.json()) as T;
    noteServerNow(body.serverNow);
    reachable = body.configured;
    if (!body.configured) nextProbeAt = Date.now() + PROBE_BACKOFF_MS;
    return body;
  } catch {
    markUnreachable();
    return null;
  }
}

/** Report this committee's session. Returns false when sync is unavailable. */
export async function pushLive(committeeId: string, push: LivePush): Promise<boolean> {
  const result = await call<{ configured: boolean; serverNow: number }>(
    `/api/live/${encodeURIComponent(committeeId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(push),
    },
  );
  return Boolean(result?.configured);
}

export const fetchOverview = (): Promise<LiveOverview | null> => call<LiveOverview>('/api/live');

export const fetchDetail = (committeeId: string): Promise<LiveDetail | null> =>
  call<LiveDetail>(`/api/live/${encodeURIComponent(committeeId)}`);
