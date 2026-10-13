import { conferenceStatus, isEmergency, overrideFor, type FocusMode, type ReleaseMode } from '@/config/emergency';
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
  ResActionResult,
  ResMe,
  SessionsReset,
  TestingSeat,
  TestOptions,
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

/* ── The owner testing as a delegate, the demo way ─────────────────────────
 * The same as the server (functions/api/_lib/testing.ts): the seat's delegate,
 * under the owner's name marked "(test)", kept in this browser.
 */

const DEMO_TEST_KEY = 'tismun.demo.test';

function seatHolder(seat: TestingSeat): User | null {
  if (isEmergency(seat.committeeId)) {
    const holders = users.filter(
      (u) => u.emergency?.role === 'DELEGATE' && sameCountry(u.emergency.country ?? '', seat.country),
    );
    return holders.find((u) => u.role === 'DELEGATE') ?? holders[0] ?? null;
  }
  return (
    users.find(
      (u) => u.role === 'DELEGATE' && u.committeeId === seat.committeeId && sameCountry(u.country ?? '', seat.country),
    ) ?? null
  );
}

/** Who the demo answers to: the signed-in account, or the seat its owner is testing. */
function asSeen(user: User | null): User | null {
  if (!user || !DEMO_OWNERS.has(user.email)) return user;
  const seat = readJson<TestingSeat | null>(DEMO_TEST_KEY, null);
  if (!seat) return user;
  const at = user.email.lastIndexOf('@');
  const who = {
    email: `${user.email.slice(0, at)}+test${user.email.slice(at)}`,
    fullName: `${user.fullName.split(/\s+/)[0] ?? user.fullName} (test)`,
    title: null,
  };
  if (seat.role === 'chair') {
    const emergency = isEmergency(seat.committeeId);
    return {
      ...user,
      ...who,
      role: 'CHAIR',
      committeeId: emergency ? null : seat.committeeId,
      country: null,
      countryCode: null,
      emergency: emergency ? { role: 'CHAIR', country: null, countryCode: null } : null,
      testing: { role: 'chair', committeeId: seat.committeeId, country: '', day2: seat.day2 || emergency },
    };
  }
  const holder = seatHolder(seat);
  if (!holder) return user;
  // A delegate's view only: no Day 1 chair or Secretariat role comes with it.
  const day1 =
    holder.role === 'DELEGATE' ? {} : { role: 'DELEGATE' as const, committeeId: null, country: null, countryCode: null };
  return {
    ...holder,
    ...day1,
    ...who,
    testing: {
      role: 'delegate',
      committeeId: seat.committeeId,
      country: isEmergency(seat.committeeId) ? (holder.emergency?.country ?? seat.country) : (holder.country ?? seat.country),
      day2: seat.day2,
    },
  };
}

/** The signed-in account itself, never a test seat. */
const realMe = (): User | null => byEmail.get(readJson<string>(DEMO_EMAIL_KEY, '')) ?? null;
const me = (): User | null => asSeen(realMe());

/** The conference as this account sees it: a test seat "on Day 2" sees Day 2, topic out. */
const seenStatus = () => {
  const now = status();
  return me()?.testing?.day2 ? { ...now, day2: true, released: true } : now;
};

/** The same stripping the server does before release. */
function visible(row: CommitteeRow): Committee {
  const committee = rowToCommittee(row);
  if (!isEmergency(committee.id) || seenStatus().released) return committee;
  return { ...committee, topics: ['', ''], description: '', backgroundPaperUrl: '', locked: true };
}

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
/** The owner testing works in each committee's practice copy, as on the server. */
const PRACTICE = '~test';
const resKey = (committeeId: string): string => DEMO_RES_PREFIX + committeeId + (me()?.testing ? PRACTICE : '');

interface DemoRes {
  state: CommitteeResState;
  copies: Copy[];
}

const readRes = (committeeId: string): DemoRes => {
  const stored = readJson<Partial<DemoRes> | null>(resKey(committeeId), null);
  return { state: normaliseCommitteeState(stored?.state), copies: stored?.copies ?? [] };
};
const writeRes = (committeeId: string, data: DemoRes) => writeJson(resKey(committeeId), data);

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

function demoWho(committeeId: string): { me: ResMe; actor: Actor | null } {
  const user = me();
  if (!user) throw new ResolutionError('Not signed in.', 401);
  const day = seenStatus();
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
  const first = user.fullName.split(/\s+/)[0] ?? user.fullName;
  const name = user.testing ? `${first} (test)` : first;
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

export const mockSource: DataSource = {
  async getMe(email) {
    const user = asSeen(byEmail.get(email.trim().toLowerCase()) ?? null);
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
        (user.testing?.day2 ?? false) || status().day2,
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
    // Testing a seat: "you" is the seat's delegate.
    const you = user.testing ? (seatHolder({ ...user.testing, role: 'delegate' })?.email ?? null) : user.email;
    return delegationFor(user.emergency.country, you);
  },

  async getTestOptions(): Promise<TestOptions> {
    const user = realMe();
    if (!user || !DEMO_OWNERS.has(user.email)) throw new ResolutionError('Only the site owner can test the site.', 403);
    const seats = new Map<string, Set<string>>();
    const add = (committeeId: string | null, country: string | null) => {
      if (!committeeId || !country) return;
      seats.set(committeeId, (seats.get(committeeId) ?? new Set()).add(country));
    };
    for (const u of users) {
      if (u.role === 'DELEGATE') add(u.committeeId, u.country);
      if (u.emergency?.role === 'DELEGATE') add(committeeRows.find((row) => isEmergency(row['Committee ID']))?.['Committee ID'] ?? null, u.emergency.country);
    }
    return {
      seat: readJson<TestingSeat | null>(DEMO_TEST_KEY, null),
      options: committeeRows
        .map((row) => ({
          committeeId: row['Committee ID'],
          name: row.Name,
          abbreviation: row.Abbreviation,
          countries: [...(seats.get(row['Committee ID']) ?? [])].sort((a, b) => a.localeCompare(b)),
        }))
        .sort((a, b) => Number(isEmergency(a.committeeId)) - Number(isEmergency(b.committeeId))),
    };
  },

  async startTest(seat) {
    const user = realMe();
    if (!user || !DEMO_OWNERS.has(user.email)) throw new ResolutionError('Only the site owner can test the site.', 403);
    if (seat.role === 'chair') {
      // The Emergency Session sits on Day 2: its chair is only ever seen then.
      writeJson(DEMO_TEST_KEY, { ...seat, country: '', day2: seat.day2 || isEmergency(seat.committeeId) });
      return;
    }
    if (!seatHolder(seat)) throw new ResolutionError('Nobody sits in that seat.');
    writeJson(DEMO_TEST_KEY, seat);
  },

  async stopTest() {
    removeKey(DEMO_TEST_KEY);
  },

  async clearPractice() {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith(DEMO_RES_PREFIX) && key.endsWith(PRACTICE)) removeKey(key);
      }
    } catch {
      // Storage blocked: nothing was kept to clear.
    }
  },

  async getAllDelegations() {
    const countries = [
      ...new Set(users.map((u) => u.emergency?.country).filter((c): c is string => Boolean(c))),
    ].sort((a, b) => a.localeCompare(b));
    return countries.map((country) => delegationFor(country, null));
  },

  async getConferenceStatus() {
    return seenStatus();
  },

  async getEmergencyAdmin(): Promise<EmergencyAdmin> {
    return { status: status(), overridesAvailable: true, events: readDemo().events };
  },

  async setEmergencyOverride(action) {
    const demo = readDemo();
    const override = overrideFor(action, Date.now());
    const patch: Partial<DemoEmergency> =
      override.target === 'release' ? { release: override.value } : { focus: override.value };
    const label = override.label;
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

  async getResolutions(committeeId, topic, withCountries) {
    const now = Date.now();
    if (!hasResolutions(committeeId)) throw new ResolutionError('This committee has no resolutions on the site.', 404);
    const who = demoWho(committeeId);
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

  async resolutionAction(committeeId, action): Promise<ResActionResult> {
    const now = Date.now();
    const who = demoWho(committeeId);
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
