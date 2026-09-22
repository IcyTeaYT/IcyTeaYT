import { AlertTriangle, Check, Minus, Plus, X } from 'lucide-react';
import { useMemo } from 'react';
import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { MAJORITY_LABEL, VOTING } from '@/config/rules';
import { cn } from '@/lib/cn';
import { resolveVote } from '@/lib/majority';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import { presentAndVotingIds, presentIds } from '../store';
import type { RollCallChoice } from '../types';

const CHOICES: { value: RollCallChoice; label: string; on: string }[] = [
  { value: 'yes', label: 'Yes', on: 'bg-success text-white border-transparent' },
  { value: 'no', label: 'No', on: 'bg-danger text-white border-transparent' },
  { value: 'abstain', label: 'Abstain', on: 'bg-ink-600 text-white border-transparent' },
  { value: 'pass', label: 'Pass', on: 'bg-warning text-white border-transparent' },
];

/**
 * The vote itself, rendered wherever the thing being voted on lives.
 *
 * There is no separate voting screen: a chair who has just introduced a Draft
 * Resolution should be able to put it to a vote without leaving it and
 * re-selecting it somewhere else. This panel assumes the subject is already
 * decided by where it is mounted.
 */
export function VotePanel() {
  const { roster } = useChairContext();
  const { nameOf, codeOf } = useDelegationLookup();

  const vote = useChair((state) => state.vote);
  const attendance = useChair((state) => state.attendance);
  const setMode = useChair((state) => state.setVoteMode);
  const adjustPlacard = useChair((state) => state.adjustPlacard);
  const cast = useChair((state) => state.castRollCallVote);
  const beginSecondRound = useChair((state) => state.beginSecondRound);
  const closeVote = useChair((state) => state.closeVote);
  const cancelVote = useChair((state) => state.cancelVote);

  const present = useMemo(() => presentIds(attendance), [attendance]);
  const presentAndVoting = useMemo(() => presentAndVotingIds(attendance), [attendance]);
  const eligible = useMemo(
    () =>
      roster
        .filter((delegation) => present.includes(delegation.id))
        .sort((a, b) => a.country.localeCompare(b.country)),
    [roster, present],
  );

  if (!vote) return null;

  const tally =
    vote.mode === 'placard'
      ? vote.placard
      : Object.values(vote.rollCall).reduce(
          (total, choice) => ({
            for: total.for + (choice === 'yes' ? 1 : 0),
            against: total.against + (choice === 'no' ? 1 : 0),
            abstain: total.abstain + (choice === 'abstain' ? 1 : 0),
          }),
          { for: 0, against: 0, abstain: 0 },
        );

  const majorityKind = vote.subjectKind === 'resolution' ? VOTING.resolution : VOTING.amendment;
  const outcome = resolveVote(tally, majorityKind, VOTING.abstentionsCountTowardMajority);

  const ids = eligible.map((delegation) => delegation.id);
  const unanswered = ids.filter((id) => !vote.rollCall[id]);
  const passedIds = ids.filter((id) => vote.rollCall[id] === 'pass');
  const visibleIds = vote.secondRound ? vote.secondRoundIds : ids;
  const currentId = vote.secondRound
    ? vote.secondRoundIds.find((id) => vote.rollCall[id] === 'pass')
    : unanswered[0];

  const maxAbstentions = present.length - presentAndVoting.length;
  const totalCast = tally.for + tally.against + tally.abstain;
  const tooMany = vote.mode === 'placard' && totalCast > present.length;
  const tooManyAbstentions = vote.mode === 'placard' && tally.abstain > maxAbstentions;

  return (
    <div className="rounded-card border border-teal-200 bg-teal-50/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200 px-5 py-3.5">
        <div className="min-w-0">
          <p className="label-micro text-teal-700">Voting Procedure</p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink-900">{vote.subjectLabel}</p>
        </div>
        <Segmented
          name="Voting method"
          value={vote.mode}
          onChange={setMode}
          size="sm"
          options={[
            { value: 'placard', label: 'Placard' },
            { value: 'roll-call', label: 'Roll Call' },
          ]}
        />
      </div>

      {tooMany || tooManyAbstentions ? (
        <p className="flex items-start gap-2 border-b border-warning-border bg-warning-soft px-5 py-2.5 text-xs text-warning">
          <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {tooMany
            ? `${totalCast} votes recorded but only ${present.length} delegations are present.`
            : `${tally.abstain} abstentions, but only ${maxAbstentions} may abstain — ${presentAndVoting.length} answered Present and Voting.`}
        </p>
      ) : null}

      {vote.mode === 'placard' ? (
        <div className="grid gap-4 px-5 py-6 sm:grid-cols-3">
          {(['for', 'against', 'abstain'] as const).map((field) => {
            // Three buttons all reading "Add" are indistinguishable to a screen
            // reader, so each carries the count it changes.
            const name = field === 'for' ? 'For' : field === 'against' ? 'Against' : 'Abstaining';
            return (
            <div key={field} className="text-center">
              <p className="label-micro">{name}</p>
              <p
                className={cn(
                  'tabular mt-2 text-[40px] font-semibold leading-none',
                  field === 'for' && 'text-success',
                  field === 'against' && 'text-danger',
                  field === 'abstain' && 'text-ink-500',
                )}
              >
                {vote.placard[field]}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Button
                  variant="quiet"
                  size="sm"
                  iconOnly
                  onClick={() => adjustPlacard(field, -1)}
                  aria-label={`One fewer ${name}`}
                >
                  <Minus size={14} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => adjustPlacard(field, 1)}
                  aria-label={`One more ${name}`}
                >
                  <Plus size={14} strokeWidth={1.5} />
                  Add
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <>
          {vote.secondRound ? (
            <p className="border-b border-warning-border bg-warning-soft px-5 py-2.5 text-xs text-warning">
              Second round — the {vote.secondRoundIds.length}{' '}
              {vote.secondRoundIds.length === 1 ? 'delegation' : 'delegations'} that passed are
              called again and must now vote.
            </p>
          ) : null}
          <ul className="max-h-[420px] divide-y divide-hairline overflow-y-auto bg-surface">
            {visibleIds.map((id) => {
              const choice = vote.rollCall[id] ?? null;
              const mustVote = presentAndVoting.includes(id);
              return (
                <li
                  key={id}
                  className={cn(
                    'flex flex-col gap-2.5 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                    id === currentId && 'bg-teal-50',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Flag code={codeOf(id)} country={nameOf(id)} size="sm" />
                    <span className="truncate text-sm text-ink-900">{nameOf(id)}</span>
                    {mustVote ? (
                      <span className="shrink-0 text-[11px] uppercase tracking-label text-muted">
                        P&amp;V
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {CHOICES.map((option) => {
                      const disabled =
                        (option.value === 'abstain' && mustVote) ||
                        (option.value === 'pass' && vote.secondRound);
                      const on = choice === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => cast(id, on ? null : option.value)}
                          title={
                            disabled && option.value === 'abstain'
                              ? 'Present and Voting delegations cannot abstain'
                              : undefined
                          }
                          className={cn(
                            'rounded-control border px-2.5 py-1.5 text-xs font-medium transition-colors duration-200',
                            'disabled:cursor-not-allowed disabled:opacity-35',
                            on ? option.on : 'border-hairline bg-surface text-ink-600 hover:bg-ink-50',
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          {!vote.secondRound && unanswered.length === 0 && passedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface px-5 py-3">
              <p className="text-sm text-ink-700">
                {passedIds.length} {passedIds.length === 1 ? 'delegation' : 'delegations'} passed.
              </p>
              <Button variant="primary" size="sm" onClick={beginSecondRound}>
                Begin second round
              </Button>
            </div>
          ) : null}
        </>
      )}

      {/* Live tally and the close button, always in view. */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-teal-200 px-5 py-3.5">
        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted">For</dt>
            <dd className="tabular font-semibold text-success">{tally.for}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted">Against</dt>
            <dd className="tabular font-semibold text-danger">{tally.against}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted">Abstaining</dt>
            <dd className="tabular font-semibold text-ink-700">{tally.abstain}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted">{MAJORITY_LABEL[majorityKind]}</dt>
            <dd className="tabular font-semibold text-ink-900">{outcome.required}</dd>
            <dd className="text-muted">of {outcome.base} cast</dd>
          </div>
        </dl>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              outcome.decided && outcome.passed
                ? 'bg-success-soft text-success'
                : outcome.decided
                  ? 'bg-danger-soft text-danger'
                  : 'bg-ink-50 text-muted',
            )}
          >
            {outcome.decided ? (
              outcome.passed ? (
                <Check size={12} strokeWidth={2} />
              ) : (
                <X size={12} strokeWidth={2} />
              )
            ) : null}
            {outcome.decided ? (outcome.passed ? 'Would pass' : 'Would fail') : 'No votes yet'}
          </span>
          <Button variant="ghost" size="sm" onClick={cancelVote}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={closeVote}>
            Close vote
          </Button>
        </div>
      </div>
    </div>
  );
}
