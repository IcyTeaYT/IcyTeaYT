import { rowToCommittee, rowToUser } from './normalise';
import type { Committee, CommitteeRow, DataSource, Delegation, User, UserRow } from './types';

/**
 * Phase 2 data source. Every call hits a Cloudflare Pages Function in
 * /functions/api, which reads the Google Sheet with a service account and
 * scopes the response to what the session cookie is allowed to see.
 *
 * The browser never learns the sheet ID or the service-account key, and it
 * never asks for another delegate's record — the server decides what comes
 * back from the signed session cookie alone.
 */

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    // The session cookie is HttpOnly, so it must ride along explicitly.
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 401) throw new ApiError('Not signed in', 401);
  if (response.status === 403) throw new ApiError('Not allowed', 403);
  if (!response.ok) throw new ApiError(`Request failed: ${path}`, response.status);

  return (await response.json()) as T;
}

export const liveSource: DataSource = {
  /**
   * The email argument is ignored on purpose: identity comes from the signed
   * session cookie, never from something the browser can choose.
   */
  async getMe(): Promise<User | null> {
    const row = await api<UserRow | null>('/api/me');
    return row ? rowToUser(row) : null;
  },

  async getCommittees(): Promise<Committee[]> {
    const rows = await api<CommitteeRow[]>('/api/committees');
    return rows.map(rowToCommittee);
  },

  async getCommittee(id: string): Promise<Committee | null> {
    const row = await api<CommitteeRow | null>(`/api/committees/${encodeURIComponent(id)}`);
    return row ? rowToCommittee(row) : null;
  },

  /** 403s unless the session belongs to a chair of exactly this committee. */
  async getRoster(committeeId: string): Promise<Delegation[]> {
    const rows = await api<UserRow[]>(`/api/roster/${encodeURIComponent(committeeId)}`);
    return rows
      .map(rowToUser)
      .filter((u) => u.countryCode)
      .map<Delegation>((u) => ({
        id: `${committeeId}:${u.countryCode}`,
        country: u.country ?? '',
        countryCode: u.countryCode ?? '',
        delegateName: u.fullName,
        email: u.email,
      }))
      .sort((a, b) => a.country.localeCompare(b.country));
  },

  // listDemoUsers is deliberately absent: enumerating users is a demo-only
  // affordance and must never be reachable in live mode.
};
