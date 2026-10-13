import { canRun, canView } from '../../../src/lib/access';
import { countryCodeFor } from '../../../src/lib/countryCodes';
import { blankResolution, hasResolutions, preWrittenResolution, topicsOf, writesOwnResolution } from '../../../src/config/resolutions';
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
  ResolutionError,
  setFloor,
  withdrawAmendment,
  type Actor,
  type AmendmentStatus,
  type CommitteeResState,
  type CopyOp,
  type Floor,
  type ResolutionText,
  type TopicNo,
  type TopicState,
  type Votes,
} from '../../../src/lib/resolution';
import { accessOf } from '../_lib/access';
import { readStatus } from '../_lib/conference';
import { statusSeenBy } from '../_lib/testing';
import { EMERGENCY_ID, emergencyCountryOf } from '../_lib/emergency';
import { fail, isLiveMode, json, type Env } from '../_lib/env';
import { describeDbError } from '../_lib/live';
import {
  ensureResTables,
  mutateCommitteeState,
  mutateCopy,
  readCommitteeState,
  readCopies,
  readCopy,
} from '../_lib/resolutions';
import { currentUser } from '../_lib/session';
import { readUsers, type SheetUser } from '../_lib/sheets';

/**
 * GET  /api/res/:committeeId?topic=1[&countries=1]
 *      The committee's amendments and votes, and — for a delegate — every copy
 *      of the topic they may edit: their country's own and any shared with it.
 * POST /api/res/:committeeId  { action, … }
 *      Delegates: edit a copy, share it, submit it, withdraw an amendment.
 *      Chairs of the committee: record votes, say what is on the floor, and in
 *      the Emergency Session adopt a draft.
 *
 * Who someone is comes from the sheet and the server's clock on every request:
 * a delegate's country is their Country column in their own committee, or
 * their Emergency Country in the Emergency Session once its topic is out.
 */

type Role = 'delegate' | 'chair' | 'viewer';

interface Who {
  role: Role;
  country: string | null;
  actor: Actor | null;
}

const paramOf = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

async function keyFor(email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`tismun-res:${email.trim().toLowerCase()}`));
  return [...new Uint8Array(digest)]
    .slice(0, 9)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const firstName = (user: SheetUser): string => (user['Full Name'] ?? '').trim().split(/\s+/)[0] || 'A delegate';

async function identify(
  request: Request,
  env: Env,
  committeeId: string,
): Promise<{ who: Who; key: string; name: string } | Response> {
  const user = await currentUser(request, env);
  if (!user) return fail('Not signed in.', 401);
  const access = await accessOf(env, user);
  const key = await keyFor(user.Email);
  // An owner testing a seat shows as "Yassir (test)" to anyone sharing the copy.
  const name = user['Test Seat'] ? `${firstName(user)} (test)` : firstName(user);

  let country: string | null = null;
  if (committeeId === EMERGENCY_ID) {
    // The Emergency Session's delegates may only start writing once its topic is out.
    const status = statusSeenBy(await readStatus(env), user);
    if (status.released) country = emergencyCountryOf(user) || null;
  } else if (
    (user.Role ?? '').trim().toUpperCase() === 'DELEGATE' &&
    (user['Committee ID'] ?? '').trim() === committeeId
  ) {
    country = (user.Country ?? '').trim() || null;
  }

  if (canRun(access, committeeId)) return { who: { role: 'chair', country: null, actor: null }, key, name };
  if (country) return { who: { role: 'delegate', country, actor: { key, name, country } }, key, name };
  if (canView(access, committeeId)) return { who: { role: 'viewer', country: null, actor: null }, key, name };
  return fail('Only this committee’s delegates and chairs can open its resolutions.', 403);
}

/** The resolution's starting text: pre-written, or the Emergency Session's adopted draft. */
const baseOf = (committeeId: string, topic: TopicNo, state: CommitteeResState): ResolutionText =>
  (writesOwnResolution(committeeId) ? state.topics[topic].base : preWrittenResolution(committeeId, topic)) ??
  blankResolution('');

async function countriesOf(env: Env, committeeId: string): Promise<{ name: string; code: string | null }[]> {
  const users = await readUsers(env);
  const names = new Map<string, string>();
  for (const user of users) {
    const country =
      committeeId === EMERGENCY_ID
        ? emergencyCountryOf(user)
        : (user.Role ?? '').trim().toUpperCase() === 'DELEGATE' && (user['Committee ID'] ?? '').trim() === committeeId
          ? (user.Country ?? '').trim()
          : '';
    if (country && !names.has(country.toLowerCase())) names.set(country.toLowerCase(), country);
  }
  return [...names.values()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, code: countryCodeFor(name) }));
}

const topicOf = (value: unknown, committeeId: string): TopicNo | null => {
  const topic = Number(value);
  return topic === 1 || topic === 2 ? (topicsOf(committeeId).includes(topic) ? topic : null) : null;
};

const votesOf = (value: unknown): Votes | null => {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(999, Math.round(n))) : 0);
  return { for: count(v.for), against: count(v.against), abstain: count(v.abstain) };
};

function errorResponse(error: unknown): Response {
  if (error instanceof ResolutionError) return fail(error.message, error.status);
  return fail(`The resolution could not be saved: ${describeDbError(error)}`, 500);
}

export const onRequestGet: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const serverNow = Date.now();
  const committeeId = paramOf(params.committeeId);
  if (!hasResolutions(committeeId)) return fail('This committee has no resolutions on the site.', 404);
  if (!isLiveMode(env)) return fail('Resolutions need the live site.', 503);
  if (!env.DB) return json({ available: false, serverNow, error: 'Resolutions need the database (the DB binding).' });

  const identity = await identify(request, env, committeeId);
  if (identity instanceof Response) return identity;
  const { who, key, name } = identity;

  const url = new URL(request.url);
  const topic = topicOf(url.searchParams.get('topic') ?? '1', committeeId) ?? 1;

  try {
    await ensureResTables(env.DB);
    const { state } = await readCommitteeState(env.DB, committeeId);
    const epoch = state.topics[topic].epoch;
    const copies =
      who.role === 'delegate' && who.country
        ? (await readCopies(env.DB, committeeId, topic))
            .filter((copy) => canEditCopy(copy, who.country ?? ''))
            .map((copy) => freshCopy(copy, epoch))
        : [];
    return json({
      available: true,
      serverNow,
      me: { role: who.role, country: who.country, key, name },
      state,
      copies,
      ...(url.searchParams.get('countries') ? { countries: await countriesOf(env, committeeId) } : {}),
    });
  } catch (error) {
    return json({ available: false, serverNow, error: describeDbError(error) });
  }
};

interface Body {
  action?: unknown;
  topic?: unknown;
  copyId?: unknown;
  ops?: unknown;
  amendmentId?: unknown;
  draftId?: unknown;
  status?: unknown;
  votes?: unknown;
  floor?: unknown;
}

const OP_NAMES = new Set(['set', 'add', 'remove', 'revert', 'rebase', 'lock', 'unlock', 'share']);

/** Only well-formed operations get as far as the rules. */
function opsOf(value: unknown): CopyOp[] {
  if (!Array.isArray(value)) return [];
  const ops: CopyOp[] = [];
  for (const raw of value.slice(0, 50)) {
    if (!raw || typeof raw !== 'object') continue;
    const op = raw as Record<string, unknown>;
    if (typeof op.op !== 'string' || !OP_NAMES.has(op.op)) continue;
    if (op.op === 'share') {
      if (Array.isArray(op.members)) {
        ops.push({ op: 'share', members: op.members.filter((m): m is string => typeof m === 'string').map((m) => m.slice(0, 80)) });
      }
      continue;
    }
    if (typeof op.clauseId !== 'string' || !op.clauseId) continue;
    const clauseId = op.clauseId.slice(0, 64);
    switch (op.op) {
      case 'set':
        if (typeof op.text === 'string') ops.push({ op: 'set', clauseId, text: op.text });
        break;
      case 'add':
        if (op.clauseKind === 'preamble' || op.clauseKind === 'operative') {
          ops.push({
            op: 'add',
            clauseId,
            clauseKind: op.clauseKind,
            afterId: typeof op.afterId === 'string' ? op.afterId.slice(0, 64) : null,
            text: typeof op.text === 'string' ? op.text : '',
          });
        }
        break;
      case 'remove':
      case 'revert':
      case 'rebase':
      case 'lock':
      case 'unlock':
        ops.push({ op: op.op, clauseId });
        break;
    }
  }
  return ops;
}

function floorOf(value: unknown, committeeId: string): Floor | null {
  if (!value || typeof value !== 'object') return null;
  const f = value as Record<string, unknown>;
  const topic = topicOf(f.topic, committeeId);
  if (!topic || typeof f.stage !== 'string') return null;
  return {
    topic,
    amendmentId: typeof f.amendmentId === 'string' ? f.amendmentId.slice(0, 64) : null,
    stage: f.stage.slice(0, 80),
    at: Date.now(),
  };
}

const AMENDMENT_STATUSES = new Set<AmendmentStatus>(['pending', 'passed', 'failed', 'withdrawn']);
const TOPIC_STATUSES = new Set<TopicState['status']>(['open', 'passed', 'failed']);

export const onRequestPost: PagesFunction<Env, 'committeeId'> = async ({ request, env, params }) => {
  const committeeId = paramOf(params.committeeId);
  if (!hasResolutions(committeeId)) return fail('This committee has no resolutions on the site.', 404);
  if (!isLiveMode(env)) return fail('Resolutions need the live site.', 503);
  if (!env.DB) return fail('Resolutions need the database (the DB binding).', 503);
  const db = env.DB;

  const identity = await identify(request, env, committeeId);
  if (identity instanceof Response) return identity;
  const { who } = identity;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail('Expected a JSON body.', 400);
  }

  const asDelegate = (): { actor: Actor; country: string } | Response =>
    who.role === 'delegate' && who.actor && who.country
      ? { actor: who.actor, country: who.country }
      : fail('Only this committee’s delegates can do that.', 403);
  const asChair = (): true | Response => (who.role === 'chair' ? true : fail('Only this committee’s chairs can do that.', 403));

  try {
    await ensureResTables(db);

    switch (body.action) {
      /* ── Delegates ─────────────────────────────────────────────────── */

      case 'edit': {
        const delegate = asDelegate();
        if (delegate instanceof Response) return delegate;
        const topic = topicOf(body.topic, committeeId);
        if (!topic) return fail('No such topic.', 400);
        const ops = opsOf(body.ops);
        const { state } = await readCommitteeState(db, committeeId);
        const topicState = state.topics[topic];
        if (topicState.status !== 'open') return fail('The committee has already voted on this resolution.', 409);
        const current = currentText(baseOf(committeeId, topic, state), state.amendments, topic);
        const copyId = typeof body.copyId === 'string' && body.copyId ? body.copyId : null;
        const now = Date.now();

        const { copy, result } = await mutateCopy(
          db,
          { committeeId, topic, copyId, country: delegate.country },
          () => newCopy(crypto.randomUUID(), topic, delegate.country, topicState.epoch, now),
          (found) => {
            if (!canEditCopy(found, delegate.country)) throw new ResolutionError('This copy has not been shared with you.', 403);
            const applied = applyCopyOps(
              freshCopy(found, topicState.epoch),
              ops,
              delegate.actor,
              now,
              (clauseId) => current.clauses.find((clause) => clause.id === clauseId) ?? null,
            );
            return { copy: applied.copy, result: applied.refused };
          },
        );
        return json({ serverNow: now, copy, refused: result });
      }

      case 'submit': {
        const delegate = asDelegate();
        if (delegate instanceof Response) return delegate;
        const topic = topicOf(body.topic, committeeId);
        if (!topic) return fail('No such topic.', 400);
        if (typeof body.copyId !== 'string') return fail('Which copy?', 400);
        const found = await readCopy(db, body.copyId);
        if (!found || found.committeeId !== committeeId) return fail('That copy no longer exists.', 404);
        if (!canEditCopy(found.copy, delegate.country)) return fail('This copy has not been shared with you.', 403);

        const { state: before } = await readCommitteeState(db, committeeId);
        const epoch = before.topics[topic].epoch;
        const copy = freshCopy(found.copy, epoch);
        const submitters = [copy.owner, ...copy.members];
        const now = Date.now();
        // The Emergency Session before a draft is adopted: the copy is a whole draft.
        const drafting = writesOwnResolution(committeeId) && !before.topics[topic].base;

        const { state, result: numbers } = await mutateCommitteeState(db, committeeId, (state) => {
          const current = currentText(baseOf(committeeId, topic, state), state.amendments, topic);
          if (drafting) {
            const added = addDraft(state, draftFromCopy(copy, current), submitters, now, crypto.randomUUID());
            return { state: added.state, result: [added.number] };
          }
          const drafts = amendmentsFromCopy(copy, current);
          if (drafts.length === 0) throw new ResolutionError('This copy has no changes to submit yet.');
          const added = addAmendments(state, topic, drafts, submitters, now, () => crypto.randomUUID());
          return { state: added.state, result: added.numbers };
        });

        // Submitted: the copy starts again from the resolution as it stands.
        const cleared = await mutateCopy(
          db,
          { committeeId, topic, copyId: copy.id, country: delegate.country },
          () => copy,
          (latest) => ({
            copy: {
              ...latest,
              edits: {},
              locks: {},
              epoch,
              updatedAt: now,
              lastSubmitted: { at: now, numbers, draft: drafting },
            },
            result: null,
          }),
        );
        return json({ serverNow: now, state, copy: cleared.copy, numbers });
      }

      case 'withdraw': {
        const delegate = asDelegate();
        if (delegate instanceof Response) return delegate;
        if (typeof body.amendmentId !== 'string') return fail('Which amendment?', 400);
        const amendmentId = body.amendmentId;
        const { state } = await mutateCommitteeState(db, committeeId, (state) => ({
          state: withdrawAmendment(state, amendmentId, delegate.country, Date.now()),
          result: null,
        }));
        return json({ serverNow: Date.now(), state });
      }

      /* ── Chairs ────────────────────────────────────────────────────── */

      case 'decide': {
        const chair = asChair();
        if (chair instanceof Response) return chair;
        const status = body.status as AmendmentStatus;
        if (typeof body.amendmentId !== 'string' || !AMENDMENT_STATUSES.has(status)) return fail('Bad decision.', 400);
        const amendmentId = body.amendmentId;
        const votes = votesOf(body.votes);
        const { state } = await mutateCommitteeState(db, committeeId, (state) => ({
          state: decideAmendment(state, amendmentId, status, votes, Date.now()),
          result: null,
        }));
        return json({ serverNow: Date.now(), state });
      }

      case 'resolution': {
        const chair = asChair();
        if (chair instanceof Response) return chair;
        const topic = topicOf(body.topic, committeeId);
        const status = body.status as TopicState['status'];
        if (!topic || !TOPIC_STATUSES.has(status)) return fail('Bad decision.', 400);
        const votes = votesOf(body.votes);
        const { state } = await mutateCommitteeState(db, committeeId, (state) => ({
          state: decideResolution(state, topic, status, votes, Date.now()),
          result: null,
        }));
        return json({ serverNow: Date.now(), state });
      }

      case 'floor': {
        const chair = asChair();
        if (chair instanceof Response) return chair;
        const floor = floorOf(body.floor, committeeId);
        const { state } = await mutateCommitteeState(db, committeeId, (state) => ({
          state: setFloor(state, floor),
          result: null,
        }));
        return json({ serverNow: Date.now(), state });
      }

      case 'adopt': {
        const chair = asChair();
        if (chair instanceof Response) return chair;
        if (!writesOwnResolution(committeeId) || typeof body.draftId !== 'string') return fail('Bad request.', 400);
        const draftId = body.draftId;
        const { state } = await mutateCommitteeState(db, committeeId, (state) => ({
          state: adoptDraft(state, draftId, Date.now()),
          result: null,
        }));
        return json({ serverNow: Date.now(), state });
      }

      default:
        return fail('Unknown action.', 400);
    }
  } catch (error) {
    return errorResponse(error);
  }
};
