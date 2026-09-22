import { QUORUM, type MajorityKind } from '@/config/rules';

/** floor(n/2) + 1 — more than half. */
export const simpleMajority = (base: number): number => Math.floor(Math.max(0, base) / 2) + 1;

/** ceil(2n/3) — at least two thirds. */
export const twoThirdsMajority = (base: number): number => Math.ceil((2 * Math.max(0, base)) / 3);

/** Votes needed to carry, given the majority kind and the base it's measured against. */
export function requiredVotes(kind: MajorityKind, base: number): number {
  return kind === 'two-thirds' ? twoThirdsMajority(base) : simpleMajority(base);
}

/** Delegations that must be present before debate can open. */
export const quorumNeeded = (total: number): number =>
  Math.ceil(Math.max(0, total) * QUORUM.fraction);

export const hasQuorum = (present: number, total: number): boolean =>
  total > 0 && present >= quorumNeeded(total);

export interface VoteTally {
  for: number;
  against: number;
  abstain: number;
}

export interface VoteOutcome {
  /** What the majority is measured against. */
  base: number;
  required: number;
  passed: boolean;
  /** true once enough votes are in that the result can no longer change. */
  decided: boolean;
}

/**
 * Resolve a tally against a majority rule.
 *
 * `countAbstentions: false` (our default) measures the threshold against votes
 * cast — abstaining is standing aside, not voting against. Set it true and the
 * threshold is measured against every delegation voting, so an abstention has
 * the practical effect of a no.
 */
export function resolveVote(
  tally: VoteTally,
  kind: MajorityKind,
  countAbstentions: boolean,
): VoteOutcome {
  const base = countAbstentions
    ? tally.for + tally.against + tally.abstain
    : tally.for + tally.against;
  const required = requiredVotes(kind, base);
  return {
    base,
    required,
    passed: tally.for >= required && base > 0,
    decided: base > 0,
  };
}
