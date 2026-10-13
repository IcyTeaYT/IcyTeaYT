/**
 * Draft resolutions, delegates' working copies, and amendments.
 *
 * Everything here is plain data and pure functions, so the server and the
 * demo data source run exactly the same rules: what a copy may change, which
 * amendments a copy turns into, and what the resolution reads once some of
 * them have passed. (Read by the browser and by the Pages Functions, so no
 * "@/" imports and nothing browser-only.)
 *
 * The model, in short:
 *
 *   • A resolution is its base text — pre-written, or for the Emergency
 *     Session the draft the chairs adopted — plus every amendment that has
 *     PASSED, applied in the order they passed. Nothing else changes it.
 *   • Each country has a copy for each topic. A copy stores only its edits
 *     (clause changed, removed or added), so every clause it has not touched
 *     always shows the resolution as it currently stands.
 *   • A copy can be shared with other countries. Everyone it is shared with
 *     edits it live; whoever is typing in a clause holds it for a few seconds
 *     so nobody overwrites anybody.
 *   • Submitting a copy turns each changed clause into its own amendment,
 *     numbered in the order received, and clears the copy.
 */

import { countryCodeFor } from './countryCodes';

export type ClauseKind = 'preamble' | 'operative';

export interface Clause {
  /** Stable: p1…/o1… for pre-written clauses, generated for added ones. */
  id: string;
  kind: ClauseKind;
  /**
   * The clause, with any sub-clauses as further lines: "a. …", and one level
   * down "    i. …" (indented).
   */
  text: string;
}

export interface ResolutionText {
  language: 'en' | 'ru';
  topic: string;
  freezeDate?: string;
  mainSubmitters: string[];
  coSubmitters: string[];
  /**
   * Set when none of the paper's Main Submitters sits in this committee and a
   * co-submitter has taken their place: who the paper originally named.
   */
  replacedMainSubmitters?: string[];
  clauses: Clause[];
}

export type TopicNo = 1 | 2;

export interface Votes {
  for: number;
  against: number;
  abstain: number;
}

export type AmendmentKind = 'change' | 'add' | 'remove';
export type AmendmentStatus = 'pending' | 'passed' | 'failed' | 'withdrawn';

export interface Amendment {
  id: string;
  /** 1, 2, 3… within the topic, in the order submitted — also the debate order. */
  number: number;
  topic: TopicNo;
  kind: AmendmentKind;
  /** The clause changed or removed; for an added clause, the new clause's id. */
  clauseId: string;
  clauseKind: ClauseKind;
  /** An added clause goes after this one (null: first of its kind). */
  afterId: string | null;
  /** The clause as it stood when the amendment was submitted. */
  oldText: string | null;
  newText: string | null;
  /** What the delegates called it when they submitted it, e.g. "Operative clause 3". */
  label: string;
  /** Countries, the copy's owner first. */
  submitters: string[];
  submittedAt: number;
  status: AmendmentStatus;
  votes: Votes | null;
  decidedAt: number | null;
}

export interface TopicState {
  status: 'open' | 'passed' | 'failed';
  votes: Votes | null;
  decidedAt: number | null;
  /**
   * The Emergency Session only: the draft the chairs adopted for debate. Its
   * adoption time is the topic's epoch — copies written before it are cleared.
   */
  base: ResolutionText | null;
  epoch: number;
}

/** What the chair has the committee doing, for the banner on delegates' screens. */
export interface Floor {
  topic: TopicNo;
  amendmentId: string | null;
  /** e.g. "Speeches against", "Voting Procedure", "Reading Time". */
  stage: string;
  at: number;
}

/** The Emergency Session: a copy submitted as a whole draft resolution. */
export interface Draft {
  id: string;
  number: number;
  submitters: string[];
  text: ResolutionText;
  submittedAt: number;
  status: 'submitted' | 'adopted' | 'withdrawn';
}

export interface CommitteeResState {
  topics: Record<TopicNo, TopicState>;
  amendments: Amendment[];
  floor: Floor | null;
  drafts: Draft[];
}

export interface CopyEdit {
  clauseId: string;
  kind: AmendmentKind;
  clauseKind: ClauseKind;
  afterId: string | null;
  /** change/add: the copy's wording. */
  text: string | null;
  /** change/remove: the clause as it stood when the edit began. */
  baseText: string | null;
  byName: string;
  byCountry: string;
  at: number;
}

export interface ClauseLock {
  holder: string;
  name: string;
  country: string;
  until: number;
}

export interface Copy {
  id: string;
  topic: TopicNo;
  owner: string;
  /** The other countries it is shared with. */
  members: string[];
  edits: Record<string, CopyEdit>;
  locks: Record<string, ClauseLock>;
  /** The topic's epoch this copy was written against. */
  epoch: number;
  version: number;
  updatedAt: number;
  /** The amendment (or draft) numbers its last submission became. */
  lastSubmitted: { at: number; numbers: number[]; draft: boolean } | null;
}

/** Who is acting: a person, known to others only by first name and country. */
export interface Actor {
  /** Opaque, stable per person; never an email address. */
  key: string;
  name: string;
  country: string;
}

/** How long typing in a clause holds it against everyone else. */
export const LOCK_MS = 20_000;

export const TOPICS: TopicNo[] = [1, 2];

/* ── Reading the text ────────────────────────────────────────────────────── */

const byKind = (clauses: Clause[]): Clause[] => [
  ...clauses.filter((clause) => clause.kind === 'preamble'),
  ...clauses.filter((clause) => clause.kind === 'operative'),
];

/** Insert a clause after `afterId`, or first of its kind when that is gone or null. */
function insertClause(clauses: Clause[], clause: Clause, afterId: string | null): Clause[] {
  const at = afterId ? clauses.findIndex((entry) => entry.id === afterId) : -1;
  if (at >= 0 && clauses[at]?.kind === clause.kind) {
    return [...clauses.slice(0, at + 1), clause, ...clauses.slice(at + 1)];
  }
  if (afterId && at < 0) {
    // What it followed has since been removed: put it last of its kind.
    return byKind([...clauses, clause]);
  }
  const first = clauses.findIndex((entry) => entry.kind === clause.kind);
  if (first < 0) return byKind([...clauses, clause]);
  return [...clauses.slice(0, first), clause, ...clauses.slice(first)];
}

/** One amendment applied to the text. */
export function applyAmendment(clauses: Clause[], amendment: Amendment): Clause[] {
  switch (amendment.kind) {
    case 'change':
      return clauses.map((clause) =>
        clause.id === amendment.clauseId ? { ...clause, text: amendment.newText ?? clause.text } : clause,
      );
    case 'remove':
      return clauses.filter((clause) => clause.id !== amendment.clauseId);
    case 'add':
      if (clauses.some((clause) => clause.id === amendment.clauseId)) return clauses;
      return insertClause(
        clauses,
        { id: amendment.clauseId, kind: amendment.clauseKind, text: amendment.newText ?? '' },
        amendment.afterId,
      );
  }
}

const decidedOrder = (a: Amendment, b: Amendment): number =>
  (a.decidedAt ?? 0) - (b.decidedAt ?? 0) || a.number - b.number;

/** The resolution as it stands: its base with every passed amendment applied, in the order they passed. */
export function currentText(base: ResolutionText, amendments: Amendment[], topic: TopicNo): ResolutionText {
  const passed = amendments
    .filter((amendment) => amendment.topic === topic && amendment.status === 'passed')
    .sort(decidedOrder);
  return { ...base, clauses: byKind(passed.reduce(applyAmendment, base.clauses)) };
}

/** "Operative clause 3", "Preambulatory clause 2". */
export function clauseLabel(clauses: Clause[], clauseId: string): string {
  const clause = clauses.find((entry) => entry.id === clauseId);
  if (!clause) return 'A clause that has since been removed';
  const position = clauses.filter((entry) => entry.kind === clause.kind).findIndex((entry) => entry.id === clauseId) + 1;
  return `${clause.kind === 'operative' ? 'Operative' : 'Preambulatory'} clause ${position}`;
}

/** Operative clauses are numbered 1, 2, 3…; preambulatory clauses are not. */
export function operativeNumber(clauses: Clause[], clauseId: string): number | null {
  const operative = clauses.filter((entry) => entry.kind === 'operative');
  const index = operative.findIndex((entry) => entry.id === clauseId);
  return index >= 0 ? index + 1 : null;
}

export interface ClauseLine {
  /** 0: the clause itself; 1: a., b.…; 2: i., ii.… */
  level: 0 | 1 | 2;
  marker: string | null;
  text: string;
}

const SUB_MARKER = /^([a-zа-я]{1,4})[.)]\s+(.*)$/i;
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/i;

/** A clause split into its lines, with sub-clause levels worked out for display. */
export function clauseLines(text: string): ClauseLine[] {
  const lines: ClauseLine[] = [];
  let lastLetter: string | null = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const indented = /^\s{2,}/.test(raw);
    const trimmed = raw.trim();
    const match = lines.length > 0 ? SUB_MARKER.exec(trimmed) : null;
    if (!match) {
      lines.push({ level: lines.length === 0 ? 0 : indented ? 2 : 1, marker: null, text: trimmed });
      continue;
    }
    const marker = (match[1] ?? '').toLowerCase();
    const roman =
      ROMAN.test(marker) &&
      (indented || (lastLetter !== null && !(marker === 'i' && lastLetter === 'h')));
    if (!roman) lastLetter = marker;
    lines.push({ level: roman ? 2 : 1, marker, text: match[2] ?? '' });
  }
  return lines;
}

/* ── Comparing wording ───────────────────────────────────────────────────── */

export interface DiffPart {
  type: 'same' | 'added' | 'removed';
  text: string;
}

const tokens = (text: string): string[] => text.match(/\s+|[^\s]+/g) ?? [];

/** Word-level difference between two versions of a clause. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokens(before);
  const b = tokens(after);
  // Longest common subsequence, table of suffix lengths. Clauses are a few
  // hundred tokens at most, so the table stays small.
  const width = b.length + 1;
  const table = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i] ?? '');
      i += 1;
      j += 1;
    } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
      push('removed', a[i] ?? '');
      i += 1;
    } else {
      push('added', b[j] ?? '');
      j += 1;
    }
  }
  while (i < a.length) push('removed', a[i++] ?? '');
  while (j < b.length) push('added', b[j++] ?? '');
  return parts;
}

/** Tidy what a delegate typed: no trailing spaces, no blank lines. */
export const cleanClauseText = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0)
    .join('\n')
    .slice(0, 4000);

/* ── Who submitted it, in this committee ─────────────────────────────────── */

/** The Russian resolutions name their submitters in Russian. */
const RUSSIAN_COUNTRIES: Record<string, string> = {
  'швейцария': 'CH',
  'австралия': 'AU',
  'колумбия': 'CO',
  'нидерланды': 'NL',
  'франция': 'FR',
  'бразилия': 'BR',
  'германия': 'DE',
  'кения': 'KE',
  'кенья': 'KE',
  'великобритания': 'GB',
  'сша': 'US',
  'китай': 'CN',
  'индия': 'IN',
  'япония': 'JP',
  'россия': 'RU',
};

/** A country's ISO code, from English or Russian, or null. */
export const countryCode = (name: string): string | null =>
  countryCodeFor(name) ?? RUSSIAN_COUNTRIES[name.trim().toLowerCase()] ?? null;

/** Two ways of writing the same country: "UK" and "United Kingdom", "USSR" and "Russian Federation", "Франция" and "France". */
export function sameCountryAs(a: string, b: string): boolean {
  if (sameCountry(a, b)) return true;
  const code = countryCode(a);
  return code !== null && code === countryCode(b);
}

/**
 * The paper as this committee has it. If none of its Main Submitters sits in
 * the committee, the first co-submitter who does becomes the Main Submitter,
 * so there is always someone here to present it.
 */
export function withSubmittersHere(text: ResolutionText, countries: string[]): ResolutionText {
  if (countries.length === 0) return text;
  const here = (name: string) => countries.some((country) => sameCountryAs(country, name));
  if (text.mainSubmitters.some(here)) return text;
  const promoted = text.coSubmitters.find(here);
  if (!promoted) return text;
  return {
    ...text,
    mainSubmitters: [promoted],
    coSubmitters: text.coSubmitters.filter((name) => name !== promoted),
    replacedMainSubmitters: text.mainSubmitters,
  };
}

/* ── Committee state ─────────────────────────────────────────────────────── */

export const emptyTopic = (): TopicState => ({ status: 'open', votes: null, decidedAt: null, base: null, epoch: 0 });

export const emptyCommitteeState = (): CommitteeResState => ({
  topics: { 1: emptyTopic(), 2: emptyTopic() },
  amendments: [],
  floor: null,
  drafts: [],
});

/** Fill in anything an older stored state is missing. */
export function normaliseCommitteeState(value: unknown): CommitteeResState {
  const state = (value ?? {}) as Partial<CommitteeResState>;
  const empty = emptyCommitteeState();
  return {
    topics: {
      1: { ...empty.topics[1], ...(state.topics?.[1] ?? {}) },
      2: { ...empty.topics[2], ...(state.topics?.[2] ?? {}) },
    },
    amendments: Array.isArray(state.amendments) ? state.amendments : [],
    floor: state.floor ?? null,
    drafts: Array.isArray(state.drafts) ? state.drafts : [],
  };
}

/** The topic being debated: the first one whose resolution has not been voted on. */
export const currentTopic = (state: CommitteeResState, topics: TopicNo[]): TopicNo =>
  topics.find((topic) => state.topics[topic].status === 'open') ?? topics[topics.length - 1] ?? 1;

/** An error a delegate or chair can be shown as it is. */
export class ResolutionError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/* ── Copies ──────────────────────────────────────────────────────────────── */

export const newCopy = (id: string, topic: TopicNo, owner: string, epoch: number, now: number): Copy => ({
  id,
  topic,
  owner,
  members: [],
  edits: {},
  locks: {},
  epoch,
  version: 0,
  updatedAt: now,
  lastSubmitted: null,
});

/** A copy as it should be read now: emptied if the topic has moved to a new base since. */
export function freshCopy(copy: Copy, epoch: number): Copy {
  if (copy.epoch === epoch) return copy;
  return { ...copy, edits: {}, locks: {}, epoch };
}

export const canEditCopy = (copy: Copy, country: string): boolean =>
  sameCountry(copy.owner, country) || copy.members.some((member) => sameCountry(member, country));

export const sameCountry = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

export type CopyOp =
  /** Change a clause, or write an added one. */
  | { op: 'set'; clauseId: string; text: string }
  /** A new clause, after `afterId` (null: first of its kind). */
  | { op: 'add'; clauseId: string; clauseKind: ClauseKind; afterId: string | null; text?: string }
  /** Strike a clause — or drop an added one. */
  | { op: 'remove'; clauseId: string }
  /** Put the clause back as the resolution has it. */
  | { op: 'revert'; clauseId: string }
  /** The resolution changed under an edit: keep the copy's wording against the clause as it now stands. */
  | { op: 'rebase'; clauseId: string }
  | { op: 'lock'; clauseId: string }
  | { op: 'unlock'; clauseId: string }
  | { op: 'share'; members: string[] };

export interface CopyResult {
  copy: Copy;
  /** Clauses someone else was writing in, so this change did not go through. */
  refused: string[];
}

const heldByOther = (copy: Copy, clauseId: string, actor: Actor, now: number): ClauseLock | null => {
  const lock = copy.locks[clauseId];
  return lock && lock.until > now && lock.holder !== actor.key ? lock : null;
};

/**
 * Apply a batch of changes from one person. Each change to a clause someone
 * else is typing in is refused; everything else goes through, and typing in a
 * clause holds it for this person a little longer.
 */
export function applyCopyOps(
  input: Copy,
  ops: CopyOp[],
  actor: Actor,
  now: number,
  /** The clause as the resolution has it now, for edits that begin here. */
  official: (clauseId: string) => Clause | null,
): CopyResult {
  const copy: Copy = { ...input, edits: { ...input.edits }, locks: { ...input.locks } };
  const refused: string[] = [];
  const stamp = { byName: actor.name, byCountry: actor.country, at: now };
  const hold = (clauseId: string) => {
    copy.locks[clauseId] = { holder: actor.key, name: actor.name, country: actor.country, until: now + LOCK_MS };
  };

  for (const op of ops.slice(0, 50)) {
    if (op.op === 'share') {
      if (!sameCountry(copy.owner, actor.country)) continue;
      const members = [...new Set(op.members.map((member) => member.trim()).filter(Boolean))]
        .filter((member) => !sameCountry(member, copy.owner))
        .slice(0, 40);
      copy.members = members;
      continue;
    }

    const clauseId = op.clauseId.slice(0, 64);
    if (heldByOther(copy, clauseId, actor, now)) {
      refused.push(clauseId);
      continue;
    }
    const existing = copy.edits[clauseId];

    switch (op.op) {
      case 'lock':
        hold(clauseId);
        break;
      case 'unlock':
        if (copy.locks[clauseId]?.holder === actor.key) delete copy.locks[clauseId];
        break;
      case 'add':
        if (existing) break;
        copy.edits[clauseId] = {
          clauseId,
          kind: 'add',
          clauseKind: op.clauseKind,
          afterId: op.afterId,
          text: cleanClauseText(op.text ?? ''),
          baseText: null,
          ...stamp,
        };
        hold(clauseId);
        break;
      case 'set': {
        const text = cleanClauseText(op.text);
        if (existing?.kind === 'add') {
          copy.edits[clauseId] = { ...existing, text, ...stamp };
        } else {
          const clause = official(clauseId);
          const base = existing?.baseText ?? clause?.text ?? null;
          if (base === null) break;
          // Back to the resolution's own wording: nothing left to propose.
          if (text === base) delete copy.edits[clauseId];
          else
            copy.edits[clauseId] = {
              clauseId,
              kind: 'change',
              clauseKind: existing?.clauseKind ?? clause?.kind ?? 'operative',
              afterId: null,
              text,
              baseText: base,
              ...stamp,
            };
        }
        hold(clauseId);
        break;
      }
      case 'remove':
        if (existing?.kind === 'add') {
          delete copy.edits[clauseId];
        } else {
          const clause = official(clauseId);
          const base = existing?.baseText ?? clause?.text ?? null;
          if (base === null) break;
          copy.edits[clauseId] = {
            clauseId,
            kind: 'remove',
            clauseKind: existing?.clauseKind ?? clause?.kind ?? 'operative',
            afterId: null,
            text: null,
            baseText: base,
            ...stamp,
          };
        }
        delete copy.locks[clauseId];
        break;
      case 'revert':
        delete copy.edits[clauseId];
        delete copy.locks[clauseId];
        break;
      case 'rebase':
        if (existing && existing.kind !== 'add') {
          const base = official(clauseId)?.text ?? null;
          if (base === null) delete copy.edits[clauseId];
          else if (existing.kind === 'change' && existing.text === base) delete copy.edits[clauseId];
          else copy.edits[clauseId] = { ...existing, baseText: base, ...stamp };
        }
        break;
    }
  }

  // Drop holds that have run out, so the stored copy does not collect them.
  for (const [clauseId, lock] of Object.entries(copy.locks)) {
    if (lock.until <= now) delete copy.locks[clauseId];
  }
  copy.version = input.version + 1;
  copy.updatedAt = now;
  return { copy, refused };
}

/** One clause of a copy, as its editors see it. */
export interface CopyClause {
  id: string;
  kind: ClauseKind;
  /** The resolution's wording, or null for a clause this copy adds. */
  official: string | null;
  /** The copy's wording, or null where the copy removes the clause. */
  text: string | null;
  status: 'same' | 'changed' | 'removed' | 'added';
  /** The resolution has changed this clause since the copy's edit began. */
  stale: 'changed' | 'gone' | null;
  edit: CopyEdit | null;
}

/** The copy laid over the resolution as it stands, clause by clause, in order. */
export function copyClauses(copy: Copy, current: ResolutionText): CopyClause[] {
  const rows: CopyClause[] = current.clauses.map((clause) => {
    const edit = copy.edits[clause.id] ?? null;
    if (!edit || edit.kind === 'add') {
      return { id: clause.id, kind: clause.kind, official: clause.text, text: clause.text, status: 'same', stale: null, edit: null };
    }
    const stale = edit.baseText !== null && edit.baseText !== clause.text ? 'changed' : null;
    return {
      id: clause.id,
      kind: clause.kind,
      official: clause.text,
      text: edit.kind === 'remove' ? null : edit.text,
      status: edit.kind === 'remove' ? 'removed' : 'changed',
      stale,
      edit,
    };
  });

  // Edits to clauses a passed amendment has since removed.
  for (const edit of Object.values(copy.edits)) {
    if (edit.kind === 'add' || current.clauses.some((clause) => clause.id === edit.clauseId)) continue;
    rows.push({
      id: edit.clauseId,
      kind: edit.clauseKind,
      official: null,
      text: edit.text,
      status: edit.kind === 'remove' ? 'removed' : 'changed',
      stale: 'gone',
      edit,
    });
  }

  // Added clauses, each after the clause it follows (added ones can follow added ones).
  let ordered: CopyClause[] = rows;
  const adds = Object.values(copy.edits)
    .filter((edit) => edit.kind === 'add')
    .sort((a, b) => a.at - b.at || a.clauseId.localeCompare(b.clauseId));
  for (const edit of adds) {
    const row: CopyClause = {
      id: edit.clauseId,
      kind: edit.clauseKind,
      official: null,
      text: edit.text ?? '',
      status: 'added',
      stale: null,
      edit,
    };
    const at = edit.afterId ? ordered.findIndex((entry) => entry.id === edit.afterId) : -1;
    if (at >= 0 && ordered[at]?.kind === edit.clauseKind) {
      ordered = [...ordered.slice(0, at + 1), row, ...ordered.slice(at + 1)];
    } else if (!edit.afterId) {
      const first = ordered.findIndex((entry) => entry.kind === edit.clauseKind);
      ordered = first < 0 ? [...ordered, row] : [...ordered.slice(0, first), row, ...ordered.slice(first)];
    } else {
      ordered = [...ordered, row];
    }
  }
  return [
    ...ordered.filter((entry) => entry.kind === 'preamble'),
    ...ordered.filter((entry) => entry.kind === 'operative'),
  ];
}

/** How many proposals a copy holds right now. */
export const copyChangeCount = (copy: Copy): number =>
  Object.values(copy.edits).filter((edit) => edit.kind !== 'add' || (edit.text ?? '').trim()).length;

/* ── Submitting ──────────────────────────────────────────────────────────── */

export type AmendmentDraft = Omit<Amendment, 'id' | 'number' | 'submittedAt' | 'status' | 'votes' | 'decidedAt' | 'submitters' | 'topic'>;

/**
 * The amendments a copy turns into: one per changed clause, in the order the
 * clauses appear. Refuses while any edit is out of date, so nobody can
 * unknowingly undo an amendment that has already passed.
 */
export function amendmentsFromCopy(copy: Copy, current: ResolutionText): AmendmentDraft[] {
  const rows = copyClauses(copy, current);
  if (rows.some((row) => row.stale)) {
    throw new ResolutionError(
      'The resolution has changed since some of these edits were made. Check the clauses marked “Changed since you edited it” first.',
      409,
    );
  }

  // Number each added clause where it will sit, so "New operative clause after 3" reads right.
  const drafts: AmendmentDraft[] = [];
  for (const row of rows) {
    const edit = row.edit;
    if (!edit) continue;
    if (edit.kind === 'add') {
      const text = cleanClauseText(edit.text ?? '');
      if (!text) continue;
      const after = edit.afterId ? clauseLabel(current.clauses, edit.afterId) : null;
      drafts.push({
        kind: 'add',
        clauseId: edit.clauseId,
        clauseKind: edit.clauseKind,
        afterId: edit.afterId,
        oldText: null,
        newText: text,
        label: `New ${edit.clauseKind === 'operative' ? 'operative' : 'preambulatory'} clause${
          after ? ` after ${after.toLowerCase().replace(/^(operative|preambulatory) clause /, 'clause ')}` : ' at the start'
        }`,
      });
    } else if (edit.kind === 'remove') {
      drafts.push({
        kind: 'remove',
        clauseId: edit.clauseId,
        clauseKind: row.kind,
        afterId: null,
        oldText: row.official,
        newText: null,
        label: clauseLabel(current.clauses, edit.clauseId),
      });
    } else if (edit.text !== null && edit.text !== row.official) {
      drafts.push({
        kind: 'change',
        clauseId: edit.clauseId,
        clauseKind: row.kind,
        afterId: null,
        oldText: row.official,
        newText: cleanClauseText(edit.text),
        label: clauseLabel(current.clauses, edit.clauseId),
      });
    }
  }
  return drafts;
}

/** Add submitted amendments to the committee's list, numbered in the order received. */
export function addAmendments(
  state: CommitteeResState,
  topic: TopicNo,
  drafts: AmendmentDraft[],
  submitters: string[],
  now: number,
  newId: () => string,
): { state: CommitteeResState; numbers: number[] } {
  if (state.topics[topic].status !== 'open') {
    throw new ResolutionError('The committee has already voted on this resolution.', 409);
  }
  let next = Math.max(0, ...state.amendments.filter((a) => a.topic === topic).map((a) => a.number)) + 1;
  const created: Amendment[] = drafts.map((draft) => ({
    ...draft,
    id: newId(),
    number: next++,
    topic,
    submitters,
    submittedAt: now,
    status: 'pending',
    votes: null,
    decidedAt: null,
  }));
  return {
    state: { ...state, amendments: [...state.amendments, ...created] },
    numbers: created.map((amendment) => amendment.number),
  };
}

/** A whole copy as a draft resolution: the Emergency Session, before any draft is adopted. */
export function draftFromCopy(copy: Copy, current: ResolutionText): ResolutionText {
  const clauses = copyClauses(copy, current)
    .filter((row) => row.text !== null && row.text.trim())
    .map((row) => ({ id: row.id, kind: row.kind, text: cleanClauseText(row.text ?? '') }));
  if (clauses.length === 0) throw new ResolutionError('Write at least one clause first.');
  return {
    ...current,
    mainSubmitters: [copy.owner],
    coSubmitters: copy.members,
    clauses,
  };
}

export function addDraft(
  state: CommitteeResState,
  text: ResolutionText,
  submitters: string[],
  now: number,
  id: string,
): { state: CommitteeResState; number: number } {
  const number = Math.max(0, ...state.drafts.map((draft) => draft.number)) + 1;
  const draft: Draft = { id, number, submitters, text, submittedAt: now, status: 'submitted' };
  return { state: { ...state, drafts: [...state.drafts, draft] }, number };
}

/* ── The chair's decisions ───────────────────────────────────────────────── */

export function decideAmendment(
  state: CommitteeResState,
  amendmentId: string,
  status: AmendmentStatus,
  votes: Votes | null,
  now: number,
): CommitteeResState {
  const amendment = state.amendments.find((entry) => entry.id === amendmentId);
  if (!amendment) throw new ResolutionError('That amendment no longer exists.', 404);
  return {
    ...state,
    amendments: state.amendments.map((entry) =>
      entry.id === amendmentId
        ? { ...entry, status, votes: status === 'pending' ? null : votes, decidedAt: status === 'pending' ? null : now }
        : entry,
    ),
  };
}

/** A submitter takes their amendment back, before the committee has voted on it. */
export function withdrawAmendment(state: CommitteeResState, amendmentId: string, country: string, now: number): CommitteeResState {
  const amendment = state.amendments.find((entry) => entry.id === amendmentId);
  if (!amendment) throw new ResolutionError('That amendment no longer exists.', 404);
  if (!amendment.submitters.some((submitter) => sameCountry(submitter, country))) {
    throw new ResolutionError('Only its submitters can withdraw an amendment.', 403);
  }
  if (amendment.status !== 'pending') throw new ResolutionError('The committee has already voted on it.', 409);
  if (state.floor?.amendmentId === amendmentId) {
    throw new ResolutionError('It is being debated now. Ask the chair to withdraw it.', 409);
  }
  return decideAmendment(state, amendmentId, 'withdrawn', null, now);
}

export function decideResolution(
  state: CommitteeResState,
  topic: TopicNo,
  status: TopicState['status'],
  votes: Votes | null,
  now: number,
): CommitteeResState {
  return {
    ...state,
    topics: {
      ...state.topics,
      [topic]: {
        ...state.topics[topic],
        status,
        votes: status === 'open' ? null : votes,
        decidedAt: status === 'open' ? null : now,
      },
    },
  };
}

/** The Emergency Session: the chairs choose the draft the committee will debate. */
export function adoptDraft(state: CommitteeResState, draftId: string, now: number): CommitteeResState {
  const draft = state.drafts.find((entry) => entry.id === draftId);
  if (!draft) throw new ResolutionError('That draft no longer exists.', 404);
  const [owner, ...others] = draft.submitters;
  return {
    ...state,
    drafts: state.drafts.map((entry) =>
      entry.id === draftId
        ? { ...entry, status: 'adopted' }
        : entry.status === 'adopted'
          ? { ...entry, status: 'submitted' }
          : entry,
    ),
    // A new base: amendments to any earlier one no longer apply.
    amendments: state.amendments.filter((amendment) => amendment.topic !== 1),
    topics: {
      ...state.topics,
      1: {
        ...emptyTopic(),
        base: { ...draft.text, mainSubmitters: owner ? [owner] : [], coSubmitters: others },
        epoch: now,
      },
    },
  };
}

export function setFloor(state: CommitteeResState, floor: Floor | null): CommitteeResState {
  return { ...state, floor };
}

/* ── For the screens ─────────────────────────────────────────────────────── */

/** Amendments still to be debated, in order. */
export const pendingAmendments = (state: CommitteeResState, topic: TopicNo): Amendment[] =>
  state.amendments
    .filter((amendment) => amendment.topic === topic && amendment.status === 'pending')
    .sort((a, b) => a.number - b.number);

export const amendmentsFor = (state: CommitteeResState, topic: TopicNo): Amendment[] =>
  state.amendments.filter((amendment) => amendment.topic === topic).sort((a, b) => a.number - b.number);

export const AMENDMENT_KIND_LABEL: Record<AmendmentKind, string> = {
  change: 'Changes',
  add: 'Adds',
  remove: 'Removes',
};

/** "Amendment 3 — changes operative clause 2". */
export const describeAmendment = (amendment: Amendment): string =>
  `Amendment ${amendment.number} — ${
    amendment.kind === 'add'
      ? amendment.label.charAt(0).toLowerCase() + amendment.label.slice(1)
      : `${AMENDMENT_KIND_LABEL[amendment.kind].toLowerCase()} ${amendment.label.toLowerCase()}`
  }`;
