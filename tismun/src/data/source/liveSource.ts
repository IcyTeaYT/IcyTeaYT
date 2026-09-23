import type { ConferenceStatus } from '@/config/emergency';
import { delegationId, mergeDelegations, rowToCommittee, rowToUser } from './normalise';
import type {
  Committee,
  CommitteeRow,
  DataSource,
  Delegation,
  EmergencyAdmin,
  EmergencyDelegation,
  OverrideAction,
  User,
  UserRow,
} from './types';

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
    return mergeDelegations(
      rows
        .map(rowToUser)
        .filter((u) => u.country)
        .map<Delegation>((u) => ({
          id: delegationId(committeeId, u.country ?? '', u.countryCode),
          country: u.country ?? '',
          countryCode: u.countryCode ?? '',
          delegateName: u.fullName,
          email: u.email,
        })),
    );
  },

  /** Worked out by the server: only the caller's own country, and no emails. */
  async getMyDelegation(): Promise<EmergencyDelegation | null> {
    return api<EmergencyDelegation | null>('/api/delegation');
  },

  /** 403s unless the caller chairs the Emergency Session or is the Secretariat. */
  async getAllDelegations(): Promise<EmergencyDelegation[]> {
    return api<EmergencyDelegation[]>('/api/delegations');
  },

  async getConferenceStatus(): Promise<ConferenceStatus> {
    return api<ConferenceStatus>('/api/conference');
  },

  async getEmergencyAdmin(): Promise<EmergencyAdmin> {
    return api<EmergencyAdmin>('/api/emergency');
  },

  async setEmergencyOverride(action: OverrideAction): Promise<EmergencyAdmin> {
    const response = await fetch('/api/emergency', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(body?.error ?? 'The override could not be saved.', response.status);
    }
    const body = (await response.json()) as { status: ConferenceStatus; events: EmergencyAdmin['events'] };
    return { status: body.status, events: body.events, overridesAvailable: true };
  },

  // listDemoUsers is deliberately absent: enumerating users is a demo-only
  // affordance and must never be reachable in live mode.
};
