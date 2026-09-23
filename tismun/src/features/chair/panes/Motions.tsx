import { Check, Gavel, PlayCircle, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Field';
import { flowFor } from '@/config/flows';
import { DEFAULTS, MAJORITY_LABEL, MOTIONS, MOTION_BY_ID, type MotionTypeId } from '@/config/rules';
import { requiredVotes } from '@/lib/majority';
import { cn } from '@/lib/cn';
import { formatClock, formatTimeOfDay } from '@/lib/time';
import { DelegationPicker } from '../components/DelegationPicker';
import { DurationInput } from '../components/DurationInput';
import { Pane } from '../components/Pane';
import { VoteCounter } from '../components/VoteCounter';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import type { Motion } from '../types';

/**
 * Order of disruptiveness, straight from the rules config: the most disruptive
 * motion is voted on first. Two caucuses of the same kind break the tie on the
 * longer total time, as most rules of procedure require.
 */
function byDisruptiveness(a: Motion, b: Motion): number {
  const rank = MOTION_BY_ID[b.type].disruptiveness - MOTION_BY_ID[a.type].disruptiveness;
  if (rank !== 0) return rank;
  const aTime = Number(a.params.totalTimeSec ?? 0);
  const bTime = Number(b.params.totalTimeSec ?? 0);
  if (aTime !== bTime) return bTime - aTime;
  return a.raisedAt - b.raisedAt;
}

/**
 * The starting values for a motion's fields. An Unmoderated Caucus is for
 * whatever this committee's flow says by default — editing the draft
 * resolution on Day 1 — until the delegate moving it says otherwise.
 */
export function defaultParams(type: MotionTypeId, committeeId: string): Record<string, string | number> {
  const params: Record<string, string | number> = Object.fromEntries(
    MOTION_BY_ID[type].fields.map((field) => [field.key, field.defaultValue]),
  );
  if (type === 'unmoderated-caucus') params.purpose = flowFor(committeeId).unmoderatedPurpose;
  return params;
}

function paramSummary(motion: Motion): string {
  const parts: string[] = [];
  for (const field of MOTION_BY_ID[motion.type].fields) {
    const value = motion.params[field.key];
    if (value === undefined || value === '') continue;
    parts.push(
      field.kind === 'duration'
        ? `${field.label} ${formatClock(Number(value) * 1000)}`
        : String(value),
    );
  }
  return parts.join(' · ');
}

export function Motions() {
  const { roster, committee } = useChairContext();
  const { nameOf, codeOf } = useDelegationLookup();
  const navigate = useNavigate();
  // Guided Mode can open this screen with a motion already chosen, e.g. the
  // Motion to Set the Agenda or to Close Debate.
  const location = useLocation();
  const requested = (location.state as { motion?: MotionTypeId } | null)?.motion;
  const initialType: MotionTypeId =
    requested && requested in MOTION_BY_ID ? requested : 'unmoderated-caucus';

  const motions = useChair((state) => state.motions);
  const attendance = useChair((state) => state.attendance);
  const raiseMotion = useChair((state) => state.raiseMotion);
  const setVotes = useChair((state) => state.setMotionVotes);
  const decide = useChair((state) => state.decideMotion);
  const withdraw = useChair((state) => state.withdrawMotion);
  const markStarted = useChair((state) => state.markMotionStarted);
  const startUnmoderated = useChair((state) => state.unmodStart);

  const [type, setType] = useState<MotionTypeId>(initialType);
  const [proposedBy, setProposedBy] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string | number>>(() =>
    defaultParams(initialType, committee.id),
  );

  const rule = MOTION_BY_ID[type];
  const presentRoster = useMemo(
    () => roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent'),
    [roster, attendance],
  );
  const presentCount = presentRoster.length;

  const onFloor = useMemo(
    () => motions.filter((motion) => motion.status === 'floor').sort(byDisruptiveness),
    [motions],
  );
  const history = useMemo(
    () => motions.filter((motion) => motion.status !== 'floor').sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0)),
    [motions],
  );

  const changeType = (nextType: MotionTypeId) => {
    setType(nextType);
    setParams(defaultParams(nextType, committee.id));
  };

  const missingRequired = rule.fields.some(
    (field) => field.required && String(params[field.key] ?? '').trim() === '',
  );

  // A passed Motion for an Unmoderated Caucus opens the caucus as moved:
  // its duration, its purpose, the delegation that moved it.
  const startCaucus = (motion: Motion) => {
    if (!MOTION_BY_ID[motion.type].startsCaucus) return;
    markStarted(motion.id);
    startUnmoderated({
      purpose: String(motion.params.purpose ?? ''),
      proposedBy: motion.proposedBy,
      durationSec: Number(motion.params.totalTimeSec ?? 0) || DEFAULTS.unmoderatedSec,
    });
    navigate('/chair/unmoderated');
  };

  return (
    <Pane
      title="Motions"
      description="Motions on the floor are ordered by disruptiveness — the most disruptive is voted on first."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* On the floor */}
          <Card>
            <CardHeader
              label="On the floor"
              title={`${onFloor.length} awaiting a vote`}
              action={<Badge tone="neutral">{presentCount} present</Badge>}
            />
            {onFloor.length === 0 ? (
              <EmptyState
                icon={Gavel}
                title="No motions on the floor"
                body="Raise a motion from the panel beside this list."
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {onFloor.map((motion, index) => {
                  const motionRule = MOTION_BY_ID[motion.type];
                  const required = requiredVotes(motionRule.majority, presentCount);
                  const wouldPass = motion.votesFor >= required;
                  const summary = paramSummary(motion);

                  return (
                    <li key={motion.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="tabular text-xs font-semibold text-ink-300">
                              {index + 1}
                            </span>
                            <h3 className="font-medium text-ink-900">{motionRule.label}</h3>
                          </div>
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                            <Flag code={codeOf(motion.proposedBy)} country={nameOf(motion.proposedBy)} size="xs" />
                            {nameOf(motion.proposedBy)}
                            {summary ? <span>· {summary}</span> : null}
                          </p>
                        </div>
                        <Badge tone={motionRule.majority === 'two-thirds' ? 'warning' : 'neutral'}>
                          {MAJORITY_LABEL[motionRule.majority]}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <VoteCounter
                          label="For"
                          value={motion.votesFor}
                          onChange={(value) => setVotes(motion.id, value, motion.votesAgainst)}
                        />
                        <VoteCounter
                          label="Against"
                          value={motion.votesAgainst}
                          onChange={(value) => setVotes(motion.id, motion.votesFor, value)}
                        />

                        <div className="ml-auto flex items-center gap-2">
                          <p className="text-xs text-muted">
                            <span
                              className={cn(
                                'tabular font-semibold',
                                wouldPass ? 'text-success' : 'text-ink-700',
                              )}
                            >
                              {motion.votesFor}
                            </span>{' '}
                            of {required} needed
                          </p>
                          <Button variant="ghost" size="sm" onClick={() => withdraw(motion.id)}>
                            Withdraw
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => decide(motion.id, presentCount)}
                            disabled={presentCount === 0}
                          >
                            Record vote
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* History */}
          <Card>
            <CardHeader label="History" title={`${history.length} decided`} />
            {history.length === 0 ? (
              <EmptyState title="Nothing decided yet" body="Motions appear here once you record the vote." />
            ) : (
              <ul className="divide-y divide-hairline">
                {history.map((motion) => {
                  const motionRule = MOTION_BY_ID[motion.type];
                  return (
                    <li key={motion.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Badge
                        tone={
                          motion.status === 'passed'
                            ? 'success'
                            : motion.status === 'failed'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {motion.status === 'passed' ? (
                          <Check size={11} strokeWidth={2} />
                        ) : motion.status === 'failed' ? (
                          <X size={11} strokeWidth={2} />
                        ) : null}
                        {motion.status}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-800">{motionRule.label}</p>
                        <p className="truncate text-xs text-muted">
                          {nameOf(motion.proposedBy)} · {motion.votesFor} for, {motion.votesAgainst}{' '}
                          against
                          {motion.decidedAt ? ` · ${formatTimeOfDay(motion.decidedAt)}` : ''}
                        </p>
                      </div>
                      {motion.status === 'passed' && motionRule.startsCaucus && !motion.started ? (
                        <Button variant="secondary" size="sm" onClick={() => startCaucus(motion)}>
                          <PlayCircle size={14} strokeWidth={1.5} />
                          Start this caucus
                        </Button>
                      ) : null}
                      {motion.started ? <Badge tone="teal">Started</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Raise a motion */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader label="Raise motion" />
            <CardBody className="space-y-5 py-5">
              <Field label="Motion type" htmlFor="motion-type" hint={rule.hint}>
                <Select
                  id="motion-type"
                  value={type}
                  onChange={(event) => changeType(event.target.value as MotionTypeId)}
                >
                  {MOTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex items-center justify-between rounded-control border border-hairline bg-canvas px-3 py-2.5">
                <span className="text-xs text-muted">Required</span>
                <Badge tone={rule.majority === 'two-thirds' ? 'warning' : 'teal'}>
                  {MAJORITY_LABEL[rule.majority]}
                </Badge>
              </div>

              <div>
                <span className="label-micro mb-1.5 block">Proposed by</span>
                <DelegationPicker
                  delegations={presentRoster}
                  value={proposedBy}
                  onChange={setProposedBy}
                  placeholder="Choose a delegation"
                  emptyLabel="Take roll call first"
                />
              </div>

              {rule.fields.map((field) =>
                field.kind === 'duration' ? (
                  <DurationInput
                    key={field.key}
                    label={field.label}
                    valueSec={Number(params[field.key] ?? field.defaultValue)}
                    onChange={(seconds) => setParams((prev) => ({ ...prev, [field.key]: seconds }))}
                  />
                ) : (
                  <Field key={field.key} label={field.label} htmlFor={`motion-${field.key}`}>
                    <Input
                      id={`motion-${field.key}`}
                      value={String(params[field.key] ?? '')}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        setParams((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                    />
                  </Field>
                ),
              )}

              <Button
                variant="primary"
                className="w-full"
                disabled={!proposedBy || missingRequired}
                onClick={() => {
                  if (!proposedBy) return;
                  raiseMotion({ type, proposedBy, params });
                  setParams(defaultParams(type, committee.id));
                }}
              >
                <Gavel size={15} strokeWidth={1.5} />
                Put on the floor
              </Button>
            </CardBody>
          </Card>

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
            Majorities and the order of disruptiveness are set in{' '}
            <code className="rounded bg-ink-50 px-1 py-0.5 text-[11px] text-ink-700">
              src/config/rules.ts
            </code>
            .
          </p>
        </div>
      </div>
    </Pane>
  );
}
