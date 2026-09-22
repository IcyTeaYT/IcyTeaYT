import { AlertTriangle, Check, Gavel, Minus, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { MAJORITY_LABEL, VOTING } from '@/config/rules';
import { resolveVote } from '@/lib/majority';
import { cn } from '@/lib/cn';
import { Pane, Stat } from '../components/Pane';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import { presentAndVotingIds, presentIds } from '../store';
import { RESOLUTION_LABEL, type RollCallChoice } from '../types';

const CHOICES: { value: RollCallChoice; label: string; tone: string }[] = [
  { value: 'yes', label: 'Yes', tone: 'data-[on=true]:bg-success data-[on=true]:text-white' },
  { value: 'no', label: 'No', tone: 'data-[on=true]:bg-danger data-[on=true]:text-white' },
  { value: 'abstain', label: 'Abstain', tone: 'data-[on=true]:bg-ink-600 data-[on=true]:text-white' },
  { value: 'pass', label: 'Pass', tone: 'data-[on=true]:bg-warning data-[on=true]:text-white' },
];

export function Voting() {
  const { roster } = useChairContext();
  const { nameOf, codeOf } = useDelegationLookup();

  const vote = useChair((state) => state.vote);
  const resolutions = useChair((state) => state.resolutions);
  const amendments = useChair((state) => state.amendments);
  const attendance = useChair((state) => state.attendance);
  const startVote = useChair((state) => state.startVote);
  const setMode = useChair((state) => state.setVoteMode);
  const adjustPlacard = useChair((state) => state.adjustPlacard);
  const cast = useChair((state) => state.castRollCallVote);
  const beginSecondRound = useChair((state) => state.beginSecondRound);
  const closeVote = useChair((state) => state.closeVote);
  const cancelVote = useChair((state) => state.cancelVote);

  const [subjectValue, setSubjectValue] = useState('');
  const [mode, setStartMode] = useState<'placard' | 'roll-call'>('placard');

  const subjects = useMemo(() => {
    const items: { value: string; label: string; kind: 'resolution' | 'amendment'; id: string }[] = [];
    for (const resolution of resolutions) {
      if (resolution.status === 'passed' || resolution.status === 'failed') continue;
      items.push({
        value: `resolution:${resolution.id}`,
        label: `${resolution.number} — ${resolution.title} (${RESOLUTION_LABEL[resolution.status]})`,
        kind: 'resolution',
        id: resolution.id,
      });
    }
    for (const amendment of amendments) {
      if (amendment.friendly || amendment.status !== 'pending') continue;
      const parent = resolutions.find((resolution) => resolution.id === amendment.resolutionId);
      items.push({
        value: `amendment:${amendment.id}`,
        label: `Amendment to ${parent?.number ?? 'a resolution'} — ${amendment.clause}`,
        kind: 'amendment',
        id: amendment.id,
      });
    }
    return items;
  }, [resolutions, amendments]);

  const present = useMemo(() => presentIds(attendance), [attendance]);
  const presentAndVoting = useMemo(() => presentAndVotingIds(attendance), [attendance]);

  const eligible = useMemo(
    () =>
      roster
        .filter((delegation) => present.includes(delegation.id))
        .sort((a, b) => a.country.localeCompare(b.country)),
    [roster, present],
  );

  /* ── Setup ──────────────────────────────────────────────────────────────── */

  if (!vote) {
    return (
      <Pane
        title="Voting Procedure"
        description="Choose what the committee is voting on, then take the vote by placard or by roll call."
      >
        <Card className="max-w-2xl">
          <CardHeader label="Open a vote" title="Subject" />
          <CardBody className="space-y-5 py-5">
            {subjects.length === 0 ? (
              <EmptyState
                icon={Gavel}
                title="Nothing to vote on"
                body="Create a draft resolution, or submit an unfriendly amendment, before opening voting procedure."
                className="px-0 py-4"
              />
            ) : (
              <>
                <Field label="Voting on" htmlFor="vote-subject">
                  <Select
                    id="vote-subject"
                    value={subjectValue}
                    onChange={(event) => setSubjectValue(event.target.value)}
                  >
                    <option value="">Choose a resolution or amendment</option>
                    {subjects.map((subject) => (
                      <option key={subject.value} value={subject.value}>
                        {subject.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="space-y-1.5">
                  <span className="label-micro block">Method</span>
                  <Segmented
                    name="Voting method"
                    value={mode}
                    onChange={setStartMode}
                    options={[
                      { value: 'placard', label: 'Placard vote' },
                      { value: 'roll-call', label: 'Roll call vote' },
                    ]}
                  />
                </div>

                <dl className="divide-y divide-hairline rounded-control border border-hairline bg-canvas px-4">
                  <Stat label="Delegations present" value={present.length} />
                  <Stat label="Present and voting" value={presentAndVoting.length} hint="cannot abstain" />
                </dl>

                <Button
                  variant="primary"
                  disabled={!subjectValue || present.length === 0}
                  onClick={() => {
                    const subject = subjects.find((entry) => entry.value === subjectValue);
                    if (!subject) return;
                    startVote({
                      subjectKind: subject.kind,
                      subjectId: subject.id,
                      subjectLabel: subject.label.replace(/\s*\([^)]*\)\s*$/, ''),
                      mode,
                      eligible: eligible.map((delegation) => delegation.id),
                    });
                    setSubjectValue('');
                  }}
                >
                  Open voting
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </Pane>
    );
  }

  /* ── In progress ────────────────────────────────────────────────────────── */

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

  const rollCallIds = eligible.map((delegation) => delegation.id);
  const passedIds = rollCallIds.filter((id) => vote.rollCall[id] === 'pass');
  const unanswered = rollCallIds.filter((id) => !vote.rollCall[id]);
  const visibleIds = vote.secondRound ? vote.secondRoundIds : rollCallIds;
  const currentId = vote.secondRound
    ? vote.secondRoundIds.find((id) => vote.rollCall[id] === 'pass')
    : unanswered[0];

  const maxAbstentions = present.length - presentAndVoting.length;
  const tooManyAbstentions = vote.mode === 'placard' && tally.abstain > maxAbstentions;
  const totalCast = tally.for + tally.against + tally.abstain;
  const tooManyVotes = vote.mode === 'placard' && totalCast > present.length;

  return (
    <Pane
      title="Voting Procedure"
      description={vote.subjectLabel}
      actions={
        <>
          <Button variant="ghost" onClick={cancelVote}>
            Cancel vote
          </Button>
          <Button variant="primary" onClick={closeVote}>
            Close vote and record result
          </Button>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {tooManyVotes || tooManyAbstentions ? (
            <div className="flex items-start gap-3 rounded-card border border-warning-border bg-warning-soft px-4 py-3.5">
              <AlertTriangle size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-sm text-warning">
                {tooManyVotes
                  ? `${totalCast} votes recorded but only ${present.length} delegations are present.`
                  : `${tally.abstain} abstentions recorded, but only ${maxAbstentions} ${
                      maxAbstentions === 1 ? 'delegation is' : 'delegations are'
                    } entitled to abstain — ${presentAndVoting.length} answered “Present and Voting”.`}
              </p>
            </div>
          ) : null}

          <Card>
            <CardHeader
              label="Method"
              action={
                <Segmented
                  name="Voting method"
                  value={vote.mode}
                  onChange={setMode}
                  size="sm"
                  options={[
                    { value: 'placard', label: 'Placard' },
                    { value: 'roll-call', label: 'Roll call' },
                  ]}
                />
              }
            />

            {vote.mode === 'placard' ? (
              <CardBody className="py-7">
                <div className="grid gap-5 sm:grid-cols-3">
                  {(['for', 'against', 'abstain'] as const).map((field) => (
                    <div key={field} className="text-center">
                      <p className="label-micro">{field === 'for' ? 'For' : field === 'against' ? 'Against' : 'Abstaining'}</p>
                      <p
                        className={cn(
                          'tabular mt-3 text-[52px] font-semibold leading-none',
                          field === 'for' && 'text-success',
                          field === 'against' && 'text-danger',
                          field === 'abstain' && 'text-ink-500',
                        )}
                      >
                        {vote.placard[field]}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button
                          variant="quiet"
                          size="sm"
                          iconOnly
                          onClick={() => adjustPlacard(field, -1)}
                          aria-label={`One fewer ${field}`}
                        >
                          <Minus size={14} strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => adjustPlacard(field, 1)}
                          aria-label={`One more ${field}`}
                        >
                          <Plus size={14} strokeWidth={1.5} />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            ) : (
              <>
                {vote.secondRound ? (
                  <div className="border-b border-hairline bg-warning-soft px-5 py-2.5">
                    <p className="text-sm text-warning">
                      Second round — the {vote.secondRoundIds.length}{' '}
                      {vote.secondRoundIds.length === 1 ? 'delegation' : 'delegations'} that passed
                      are called again and must now vote.
                    </p>
                  </div>
                ) : null}
                <ul className="divide-y divide-hairline">
                  {visibleIds.map((id) => {
                    const delegation = eligible.find((entry) => entry.id === id);
                    const choice = vote.rollCall[id] ?? null;
                    const mustVote = presentAndVoting.includes(id);
                    const isCurrent = id === currentId;

                    return (
                      <li
                        key={id}
                        className={cn(
                          'flex flex-col gap-3 px-5 py-3 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between',
                          isCurrent && 'bg-teal-50/60',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Flag code={codeOf(id)} country={nameOf(id)} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-900">{nameOf(id)}</p>
                            {mustVote ? (
                              <p className="text-xs text-muted">Present and voting</p>
                            ) : (
                              <p className="truncate text-xs text-muted">{delegation?.delegateName}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {CHOICES.map((option) => {
                            // "Present and Voting" forfeits the right to abstain;
                            // the second round is the last call, so Pass is gone.
                            const disabled =
                              (option.value === 'abstain' && mustVote) ||
                              (option.value === 'pass' && vote.secondRound);
                            const on = choice === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                data-on={on}
                                disabled={disabled}
                                onClick={() => cast(id, on ? null : option.value)}
                                title={
                                  disabled && option.value === 'abstain'
                                    ? 'Present and Voting delegations cannot abstain'
                                    : undefined
                                }
                                className={cn(
                                  'rounded-control border border-hairline px-2.5 py-1.5 text-xs font-medium transition-colors duration-200',
                                  'disabled:cursor-not-allowed disabled:opacity-35',
                                  on ? 'border-transparent' : 'bg-surface text-ink-600 hover:bg-ink-50',
                                  option.tone,
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
                  <CardBody className="border-t border-hairline bg-canvas py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-ink-700">
                        {passedIds.length}{' '}
                        {passedIds.length === 1 ? 'delegation passed' : 'delegations passed'}. They are
                        called again before the vote closes.
                      </p>
                      <Button variant="primary" size="sm" onClick={beginSecondRound}>
                        Begin second round
                      </Button>
                    </div>
                  </CardBody>
                ) : null}
              </>
            )}
          </Card>
        </div>

        {/* Live tally */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader label="Tally" title={outcome.passed ? 'Passing' : 'Not passing'} />
            <CardBody className="py-2">
              <dl className="divide-y divide-hairline">
                <Stat label="For" value={tally.for} tone="success" />
                <Stat label="Against" value={tally.against} tone="danger" />
                <Stat label="Abstaining" value={tally.abstain} />
                <Stat label="Votes cast" value={outcome.base} hint={`of ${present.length} present`} />
                <Stat label={MAJORITY_LABEL[majorityKind]} value={outcome.required} hint="needed" />
              </dl>
            </CardBody>
            <div
              className={cn(
                'flex items-center gap-2 border-t px-5 py-3.5',
                outcome.passed
                  ? 'border-success-border bg-success-soft text-success'
                  : 'border-hairline bg-canvas text-ink-600',
              )}
            >
              {outcome.passed ? (
                <Check size={16} strokeWidth={2} />
              ) : (
                <X size={16} strokeWidth={2} />
              )}
              <p className="text-sm font-semibold">
                {outcome.decided
                  ? outcome.passed
                    ? 'Would pass on these numbers'
                    : 'Would fail on these numbers'
                  : 'No votes recorded yet'}
              </p>
            </div>
          </Card>

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
            {VOTING.abstentionsCountTowardMajority
              ? 'Abstentions count toward the majority.'
              : 'Abstentions do not count toward the majority — the threshold is measured against votes cast.'}
          </p>
        </div>
      </div>
    </Pane>
  );
}
