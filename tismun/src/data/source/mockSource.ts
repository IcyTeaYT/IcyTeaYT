import committeeRowsJson from '../mock/committees.json';
import userRowsJson from '../mock/users.json';
import { delegationId, rowToCommittee, rowToUser } from './normalise';
import type { Committee, CommitteeRow, DataSource, Delegation, User, UserRow } from './types';

/**
 * Phase 1 data source. Reads the JSON in ../mock, which is laid out exactly
 * like the planned Google Sheet, so the live source can reuse ./normalise.ts
 * without a second mapping.
 */

const userRows = userRowsJson as unknown as UserRow[];
const committeeRows = committeeRowsJson as unknown as CommitteeRow[];

const users: User[] = userRows.map(rowToUser);
const committees: Committee[] = committeeRows.map(rowToCommittee);

const byEmail = new Map(users.map((u) => [u.email, u]));

export const mockSource: DataSource = {
  async getMe(email) {
    return byEmail.get(email.trim().toLowerCase()) ?? null;
  },

  async getCommittees() {
    return committees;
  },

  async getCommittee(id) {
    return committees.find((c) => c.id === id) ?? null;
  },

  async getRoster(committeeId) {
    return users
      .filter((u) => u.committeeId === committeeId && u.role === 'DELEGATE' && u.country)
      .map<Delegation>((u) => ({
        id: delegationId(committeeId, u.country ?? '', u.countryCode),
        country: u.country ?? '',
        countryCode: u.countryCode ?? '',
        delegateName: u.fullName,
        email: u.email,
      }))
      .sort((a, b) => a.country.localeCompare(b.country));
  },

  async listDemoUsers() {
    // The Secretariat leads, then each committee: chairs, then delegations
    // alphabetically. Unassigned accounts come last.
    const rank = (user: User): string => {
      if (user.role === 'SECRETARIAT') return '0';
      if (user.committeeId) return `1${user.committeeId}`;
      return '2';
    };
    return [...users].sort((a, b) => {
      const group = rank(a).localeCompare(rank(b));
      if (group !== 0) return group;
      if (a.role !== b.role) return a.role === 'CHAIR' ? -1 : 1;
      return (a.country ?? a.fullName).localeCompare(b.country ?? b.fullName);
    });
  },
};
