import { noteServerNow } from './serverClock';
import type {
  ControlClaim,
  ControlStatus,
  ControlHolder,
  LiveDetail,
  LiveOverview,
  LivePush,
} from './types';

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

export type PushResult =
  | { kind: 'ok' }
  /** Another device holds the committee now; this one must stand down. */
  | { kind: 'locked'; holder: ControlHolder | null }
  | { kind: 'unavailable' };

/** Report this committee's session. */
export async function pushLive(committeeId: string, push: LivePush): Promise<PushResult> {
  if (shouldSkip()) return { kind: 'unavailable' };
  try {
    const response = await fetch(`/api/live/${encodeURIComponent(committeeId)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(push),
    });
    // Not an outage: the server is answering, it is just not this device's turn.
    if (response.status === 409) {
      const body = (await response.json()) as { serverNow: number; holder?: ControlHolder | null };
      noteServerNow(body.serverNow);
      reachable = true;
      return { kind: 'locked', holder: body.holder ?? null };
    }
    if (response.status === 401 || response.status === 403) {
      reachable = true;
      return { kind: 'unavailable' };
    }
    if (!response.ok) {
      markUnreachable();
      return { kind: 'unavailable' };
    }
    const body = (await response.json()) as { configured: boolean; serverNow: number };
    noteServerNow(body.serverNow);
    reachable = body.configured;
    return body.configured ? { kind: 'ok' } : { kind: 'unavailable' };
  } catch {
    markUnreachable();
    return { kind: 'unavailable' };
  }
}

/** Claim a committee for this device. `force` is Take over. */
export const claimControl = (
  committeeId: string,
  deviceId: string,
  force: boolean,
): Promise<ControlClaim | null> =>
  call<ControlClaim>(`/api/control/${encodeURIComponent(committeeId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, force }),
  });

/** Who holds a committee, and what it looks like — for a watching device. */
export const fetchControl = (committeeId: string, deviceId: string): Promise<ControlStatus | null> =>
  call<ControlStatus>(
    `/api/control/${encodeURIComponent(committeeId)}?device=${encodeURIComponent(deviceId)}`,
  );

export const fetchOverview = (): Promise<LiveOverview | null> => call<LiveOverview>('/api/live');

export const fetchDetail = (committeeId: string): Promise<LiveDetail | null> =>
  call<LiveDetail>(`/api/live/${encodeURIComponent(committeeId)}`);
