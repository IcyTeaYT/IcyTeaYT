import { conferenceStatus, isEmergency, type FocusMode, type ReleaseMode } from '@/config/emergency';
import { accessFor } from '@/lib/access';
import { readJson, removeKey, writeJson } from '@/lib/storage';
import committeeRowsJson from '../mock/committees.json';
import userRowsJson from '../mock/users.json';
import { delegationId, mergeDelegations, rowToCommittee, rowToUser } from './normalise';
import type {
  Committee,
  CommitteeRow,
  ConferenceEvent,
  DataSource,
  Delegation,
  DelegationMember,
  EmergencyAdmin,
  EmergencyDelegation,
  OverrideAction,
  SessionsReset,
  User,
  UserRow,
} from './types';

/**
 * Demo data source. Reads the JSON in ../mock, which is laid out exactly like
 * the Google Sheet, so the live source can reuse ./normalise.ts without a
 * second mapping.
 *
 * The Emergency Session follows the same rules here as on the server — locked
 * until its release time, delegations worked out from the Emergency columns —
 * so it can be tried out in demo mode. Two differences, both because a demo
 * has no server: "the server's clock" is this browser's, and the Secretariat's
 * overrides are kept in this browser. The mock JSON only ever holds a
 * placeholder topic, never the real one, since it ships to every browser.
 */

const userRows = userRowsJson as unknown as UserRow[];
const committeeRows = committeeRowsJson as unknown as CommitteeRow[];

const users: User[] = userRows.map(rowToUser);
const byEmail = new Map(users.map((u) => [u.email, u]));

/** Must match the key the auth store remembers the demo account under. */
const DEMO_EMAIL_KEY = 'tismun.demo-email';
const DEMO_EMERGENCY_KEY = 'tismun.demo.emergency';

interface DemoEmergency {
  release: ReleaseMode;
  focus: FocusMode;
  events: ConferenceEvent[];
  sessionsReset?: ConferenceEvent | null;
}

const readDemo = (): DemoEmergency => {
  const stored = readJson<Partial<DemoEmergency> | null>(DEMO_EMERGENCY_KEY, null);
  return {
    release: stored?.release ?? 'auto',
    focus: stored?.focus ?? 'auto',
    events: stored?.events ?? [],
    sessionsReset: stored?.sessionsReset ?? null,
  };
};

const status = () => {
  const demo = readDemo();
  return conferenceStatus(Date.now(), demo.release, demo.focus, demo.sessionsReset?.at ?? null);
};

/** The same stripping the server does before release. */
function visible(row: CommitteeRow): Committee {
  const committee = rowToCommittee(row);
  if (!isEmergency(committee.id) || status().released) return committee;
  return { ...committee, topics: ['', ''], description: '', backgroundPaperUrl: '', locked: true };
}

const me = (): User | null => byEmail.get(readJson<string>(DEMO_EMAIL_KEY, '')) ?? null;

function delegationFor(country: string, askerEmail: string | null): EmergencyDelegation {
  const members = users
    .filter((u) => u.emergency?.role === 'DELEGATE' && u.emergency.country?.toLowerCase() === country.toLowerCase())
    .map<DelegationMember>((u) => ({
      fullName: u.fullName,
      day1CommitteeId: u.committeeId,
      day1Role: u.role === 'CHAIR' ? 'CHAIR' : u.role === 'DELEGATE' ? 'DELEGATE' : 'SECRETARIAT',
      you: u.email === askerEmail,
    }))
    .sort((a, b) => Number(b.you) - Number(a.you) || a.fullName.localeCompare(b.fullName));
  const code = users.find((u) => u.emergency?.country === country)?.emergency?.countryCode ?? null;
  return { country, countryCode: code, members };
}

const OVERRIDES: Record<OverrideAction, { patch: Partial<DemoEmergency>; label: string }> = {
  'release-now': { patch: { release: 'released' }, label: 'Emergency Session topic released early' },
  unrelease: { patch: { release: 'locked' }, label: 'Emergency Session topic un-released (locked)' },
  'release-auto': { patch: { release: 'auto' }, label: 'Topic release returned to the schedule' },
  'day2-now': { patch: { focus: 'on' }, label: 'Switched to Day 2 early' },
  'day2-hold': { patch: { focus: 'off' }, label: 'Day 2 held back — Day 1 continues' },
  'day2-auto': { patch: { focus: 'auto' }, label: 'Day 2 returned to the schedule' },
};

export const mockSource: DataSource = {
  async getMe(email) {
    const user = byEmail.get(email.trim().toLowerCase());
    if (!user) return null;
    // What the server would say: the same rules, with this browser standing in
    // for the server's clock.
    return {
      ...user,
      access: accessFor(
        { role: user.role, committeeId: user.committeeId, emergencyRole: user.emergency?.role ?? null },
        status().day2,
      ),
    };
  },

  async getCommittees() {
    return committeeRows.map(visible);
  },

  async getCommittee(id) {
    const row = committeeRows.find((entry) => entry['Committee ID'] === id);
    return row ? visible(row) : null;
  },

  async getRoster(committeeId) {
    const seats = isEmergency(committeeId)
      ? users
          .filter((u) => u.emergency?.role === 'DELEGATE' && u.emergency.country)
          .map((u) => ({ u, country: u.emergency?.country ?? '', code: u.emergency?.countryCode ?? null }))
      : users
          .filter((u) => u.committeeId === committeeId && u.role === 'DELEGATE' && u.country)
          .map((u) => ({ u, country: u.country ?? '', code: u.countryCode }));
    return mergeDelegations(
      seats.map<Delegation>(({ u, country, code }) => ({
        id: delegationId(committeeId, country, code),
        country,
        countryCode: code ?? '',
        delegateName: u.fullName,
        email: u.email,
      })),
    );
  },

  async getMyDelegation() {
    const user = me();
    if (user?.emergency?.role !== 'DELEGATE' || !user.emergency.country) return null;
    return delegationFor(user.emergency.country, user.email);
  },

  async getAllDelegations() {
    const countries = [
      ...new Set(users.map((u) => u.emergency?.country).filter((c): c is string => Boolean(c))),
    ].sort((a, b) => a.localeCompare(b));
    return countries.map((country) => delegationFor(country, null));
  },

  async getConferenceStatus() {
    return status();
  },

  async getEmergencyAdmin(): Promise<EmergencyAdmin> {
    return { status: status(), overridesAvailable: true, events: readDemo().events };
  },

  async setEmergencyOverride(action) {
    const demo = readDemo();
    const { patch, label } = OVERRIDES[action];
    const user = me();
    const event: ConferenceEvent = {
      id: `demo-${Date.now()}`,
      at: Date.now(),
      action,
      detail: label,
      byName: user?.fullName ?? null,
    };
    writeJson(DEMO_EMERGENCY_KEY, { ...demo, ...patch, events: [event, ...demo.events].slice(0, 20) });
    return { status: status(), overridesAvailable: true, events: readDemo().events };
  },

  async getSessionsReset(): Promise<SessionsReset> {
    return { available: true, last: readDemo().sessionsReset ?? null };
  },

  async resetAllSessions(): Promise<SessionsReset> {
    const demo = readDemo();
    const last: ConferenceEvent = {
      id: `demo-reset-${Date.now()}`,
      at: Date.now(),
      action: 'sessions-reset',
      detail: 'Every committee session reset — state, session logs and awards',
      byName: me()?.fullName ?? null,
    };
    writeJson(DEMO_EMERGENCY_KEY, { ...demo, sessionsReset: last });
    // In a demo every committee's session lives in this browser: clear it now.
    // A chair dashboard open in another tab wipes its own copy when it next
    // checks the conference status.
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('tismun.chair.')) removeKey(key);
      }
    } catch {
      // Storage blocked: the chair dashboard still wipes itself from the status.
    }
    return { available: true, last };
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
