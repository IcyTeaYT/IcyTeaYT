import { conferenceStatus, isEmergency, type FocusMode, type ReleaseMode } from '@/config/emergency';
import { blankResolution, hasResolutions, preWrittenResolution, topicsOf, writesOwnResolution } from '@/config/resolutions';
import { accessFor, canRun, canView } from '@/lib/access';
import { countryCodeFor } from '@/lib/countryCodes';
import {
  addAmendments,
  addDraft,
  adoptDraft,
  amendmentsFromCopy,
  applyCopyOps,
  canEditCopy,
  currentText,
  decideAmendment,
  decideResolution,
  draftFromCopy,
  freshCopy,
  newCopy,
  normaliseCommitteeState,
  ResolutionError,
  sameCountry,
  setFloor,
  withdrawAmendment,
  type Actor,
  type CommitteeResState,
  type Copy,
  type ResolutionText,
  type TopicNo,
} from '@/lib/resolution';
import { withChairsFromUsers } from '@/lib/chairs';
import { readJson, removeKey, writeJson } from '@/lib/storage';
import committeeRowsJson from '../mock/committees.json';
import userRowsJson from '../mock/users.json';
import { delegationId, mergeDelegations, rowToCommittee, rowToUser } from './normalise';
import type {
  ActivityEvent,
  ActivityLog,
  Committee,
  CommitteeRow,
  ConferenceEvent,
  DataSource,
  Delegation,
  DelegationMember,
  EmergencyAdmin,
  EmergencyDelegation,
  OverrideAction,
  ResActionResult,
  ResMe,
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
// Chairs come from the users, exactly as the server does it.
const committeeRows = withChairsFromUsers(committeeRowsJson as unknown as CommitteeRow[], userRows);

const users: User[] = userRows.map(rowToUser);
const byEmail = new Map(users.map((u) => [u.email, u]));

/** Must match the key the auth store remembers the demo account under. */
const DEMO_EMAIL_KEY = 'tismun.demo-email';
const DEMO_EMERGENCY_KEY = 'tismun.demo.emergency';
const DEMO_ACTIVITY_KEY = 'tismun.demo.activity';

/**
 * Demo stand-in for OWNER_EMAILS: the demo GA 2 chair gets Secretariat access
 * and the sign-in log on top of chairing, the way the live owner does.
 */
const DEMO_OWNERS = new Set(['yassir.ga2@demo.tis']);

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


/* ── Resolutions, the demo way ──────────────────────────────────────────────
 * The same rules as the server (src/lib/resolution.ts), kept in this browser.
 * Switching accounts on the login page is how a demo shares a copy between
 * two countries; another tab sees changes on its next refresh.
 */

const DEMO_RES_PREFIX = 'tismun.demo.res.';

interface DemoRes {
  state: CommitteeResState;
  copies: Copy[];
}

const readRes = (committeeId: string): DemoRes => {
  const stored = readJson<Partial<DemoRes> | null>(DEMO_RES_PREFIX + committeeId, null);
  return { state: normaliseCommitteeState(stored?.state), copies: stored?.copies ?? [] };
};
const writeRes = (committeeId: string, data: DemoRes) => writeJson(DEMO_RES_PREFIX + committeeId, data);

let demoIds = 0;
const demoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `demo-${Date.now().toString(36)}-${(demoIds += 1)}`;

/** A stand-in for the server's per-person key: stable, and not the email itself. */
const demoKey = (email: string): string => {
  let hash = 7;
  for (const char of email) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `p${hash.toString(36)}`;
};

function demoWho(committeeId: string, actAs?: string | null): { me: ResMe; actor: Actor | null } {
  const user = me();
  if (!user) throw new ResolutionError('Not signed in.', 401);
  // The demo owner, testing as one of the committee's countries.
  if (actAs && DEMO_OWNERS.has(user.email)) {
    const match = demoCountries(committeeId).find((entry) => sameCountry(entry.name, actAs));
    if (!match) throw new ResolutionError('That country is not in this committee.');
    const key = demoKey(`${user.email}#${match.name}`);
    const name = `${user.fullName.split(/\s+/)[0] ?? user.fullName} (test)`;
    return { me: { role: 'delegate', country: match.name, key, name }, actor: { key, name, country: match.name } };
  }
  const day = status();
  const access = accessFor(
    {
      role: user.role,
      committeeId: user.committeeId,
      emergencyRole: user.emergency?.role ?? null,
      owner: DEMO_OWNERS.has(user.email),
    },
    day.day2,
  );
  const key = demoKey(user.email);
  const name = user.fullName.split(/\s+/)[0] ?? user.fullName;
  const country = isEmergency(committeeId)
    ? day.released && user.emergency?.role === 'DELEGATE'
      ? user.emergency.country
      : null
    : user.role === 'DELEGATE' && user.committeeId === committeeId
      ? user.country
      : null;
  if (canRun(access, committeeId)) return { me: { role: 'chair', country: null, key, name }, actor: null };
  if (country) return { me: { role: 'delegate', country, key, name }, actor: { key, name, country } };
  if (canView(access, committeeId)) return { me: { role: 'viewer', country: null, key, name }, actor: null };
  throw new ResolutionError('Only this committee’s delegates and chairs can open its resolutions.', 403);
}

const demoBase = (committeeId: string, topic: TopicNo, state: CommitteeResState): ResolutionText =>
  (writesOwnResolution(committeeId) ? state.topics[topic].base : preWrittenResolution(committeeId, topic)) ??
  blankResolution('');

function demoCountries(committeeId: string) {
  const names = new Map<string, string>();
  for (const user of users) {
    const country = isEmergency(committeeId)
      ? user.emergency?.role === 'DELEGATE'
        ? user.emergency.country
        : null
      : user.role === 'DELEGATE' && user.committeeId === committeeId
        ? user.country
        : null;
    if (country && !names.has(country.toLowerCase())) names.set(country.toLowerCase(), country);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b)).map((name) => ({ name, code: countryCodeFor(name) }));
}

const asDelegate = (who: { me: ResMe; actor: Actor | null }) => {
  if (who.me.role !== 'delegate' || !who.actor || !who.me.country) {
    throw new ResolutionError('Only this committee’s delegates can do that.', 403);
  }
  return { actor: who.actor, country: who.me.country };
};
const asChair = (who: { me: ResMe }) => {
  if (who.me.role !== 'chair') throw new ResolutionError('Only this committee’s chairs can do that.', 403);
};

const checkTopic = (committeeId: string, topic: number): TopicNo => {
  if ((topic === 1 || topic === 2) && topicsOf(committeeId).includes(topic)) return topic;
  throw new ResolutionError('No such topic.');
};

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
        {
          role: user.role,
          committeeId: user.committeeId,
          emergencyRole: user.emergency?.role ?? null,
          owner: DEMO_OWNERS.has(user.email),
        },
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
        if (key.startsWith('tismun.chair.') || key.startsWith(DEMO_RES_PREFIX)) removeKey(key);
      }
    } catch {
      // Storage blocked: the chair dashboard still wipes itself from the status.
    }
    return { available: true, last };
  },

  async getActivity(): Promise<ActivityLog> {
    // A demo has no server, so the log holds the sign-ins made in this browser.
    const events = readJson<ActivityEvent[]>(DEMO_ACTIVITY_KEY, []);
    const current = me();
    const now = Date.now();
    return {
      available: true,
      now,
      events,
      presence: current
        ? [
            {
              email: current.email,
              name: current.fullName,
              role: current.role,
              committeeId: current.committeeId,
              country: current.country,
              device: 'This browser',
              lastSeen: now,
            },
          ]
        : [],
    };
  },

  recordDemoActivity(kind, email) {
    const user = byEmail.get(email.trim().toLowerCase());
    if (!user) return;
    const event: ActivityEvent = {
      id: `demo-${kind}-${Date.now()}`,
      at: Date.now(),
      kind,
      email: user.email,
      name: user.fullName,
      role: user.role,
      committeeId: user.committeeId,
      country: user.country,
      device: 'This browser',
    };
    writeJson(DEMO_ACTIVITY_KEY, [event, ...readJson<ActivityEvent[]>(DEMO_ACTIVITY_KEY, [])].slice(0, 200));
  },

  async getResolutions(committeeId, topic, withCountries, actAs) {
    const now = Date.now();
    if (!hasResolutions(committeeId)) throw new ResolutionError('This committee has no resolutions on the site.', 404);
    const who = demoWho(committeeId, actAs);
    const { state, copies } = readRes(committeeId);
    const epoch = state.topics[topic].epoch;
    const country = who.me.country;
    return {
      available: true,
      serverNow: now,
      me: who.me,
      state,
      copies:
        who.me.role === 'delegate' && country
          ? copies
              .filter((copy) => copy.topic === topic && canEditCopy(copy, country))
              .map((copy) => freshCopy(copy, epoch))
          : [],
      ...(withCountries ? { countries: demoCountries(committeeId) } : {}),
    };
  },

  async resolutionAction(committeeId, action, actAs): Promise<ResActionResult> {
    const now = Date.now();
    const who = demoWho(committeeId, actAs);
    const data = readRes(committeeId);
    const save = (next: Partial<DemoRes>) => writeRes(committeeId, { ...data, ...next });

    switch (action.action) {
      case 'edit': {
        const delegate = asDelegate(who);
        const topic = checkTopic(committeeId, action.topic);
        const topicState = data.state.topics[topic];
        if (topicState.status !== 'open') throw new ResolutionError('The committee has already voted on this resolution.', 409);
        const current = currentText(demoBase(committeeId, topic, data.state), data.state.amendments, topic);
        const found = action.copyId
          ? data.copies.find((copy) => copy.id === action.copyId)
          : data.copies.find((copy) => copy.topic === topic && sameCountry(copy.owner, delegate.country));
        if (action.copyId && !found) throw new ResolutionError('That copy no longer exists.', 404);
        const copy = found ?? newCopy(demoId(), topic, delegate.country, topicState.epoch, now);
        if (!canEditCopy(copy, delegate.country)) throw new ResolutionError('This copy has not been shared with you.', 403);
        const applied = applyCopyOps(
          freshCopy(copy, topicState.epoch),
          action.ops,
          delegate.actor,
          now,
          (clauseId) => current.clauses.find((clause) => clause.id === clauseId) ?? null,
        );
        save({ copies: [...data.copies.filter((entry) => entry.id !== applied.copy.id), applied.copy] });
        return { serverNow: now, copy: applied.copy, refused: applied.refused };
      }

      case 'submit': {
        const delegate = asDelegate(who);
        const topic = checkTopic(committeeId, action.topic);
        const found = data.copies.find((copy) => copy.id === action.copyId);
        if (!found) throw new ResolutionError('That copy no longer exists.', 404);
        if (!canEditCopy(found, delegate.country)) throw new ResolutionError('This copy has not been shared with you.', 403);
        const epoch = data.state.topics[topic].epoch;
        const copy = freshCopy(found, epoch);
        const submitters = [copy.owner, ...copy.members];
        const current = currentText(demoBase(committeeId, topic, data.state), data.state.amendments, topic);
        const drafting = writesOwnResolution(committeeId) && !data.state.topics[topic].base;
        let state: CommitteeResState;
        let numbers: number[];
        if (drafting) {
          const added = addDraft(data.state, draftFromCopy(copy, current), submitters, now, demoId());
          state = added.state;
          numbers = [added.number];
        } else {
          const drafts = amendmentsFromCopy(copy, current);
          if (drafts.length === 0) throw new ResolutionError('This copy has no changes to submit yet.');
          const added = addAmendments(data.state, topic, drafts, submitters, now, demoId);
          state = added.state;
          numbers = added.numbers;
        }
        const cleared: Copy = {
          ...copy,
          edits: {},
          locks: {},
          version: copy.version + 1,
          updatedAt: now,
          lastSubmitted: { at: now, numbers, draft: drafting },
        };
        save({ state, copies: [...data.copies.filter((entry) => entry.id !== copy.id), cleared] });
        return { serverNow: now, state, copy: cleared, numbers };
      }

      case 'withdraw': {
        const delegate = asDelegate(who);
        const state = withdrawAmendment(data.state, action.amendmentId, delegate.country, now);
        save({ state });
        return { serverNow: now, state };
      }

      case 'decide': {
        asChair(who);
        const state = decideAmendment(data.state, action.amendmentId, action.status, action.votes, now);
        save({ state });
        return { serverNow: now, state };
      }

      case 'resolution': {
        asChair(who);
        const state = decideResolution(data.state, checkTopic(committeeId, action.topic), action.status, action.votes, now);
        save({ state });
        return { serverNow: now, state };
      }

      case 'floor': {
        asChair(who);
        const state = setFloor(data.state, action.floor ? { ...action.floor, at: now } : null);
        save({ state });
        return { serverNow: now, state };
      }

      case 'adopt': {
        asChair(who);
        const state = adoptDraft(data.state, action.draftId, now);
        save({ state });
        return { serverNow: now, state };
      }
    }
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
