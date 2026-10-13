import { CheckCircle2, RotateCcw, Vote as VoteIcon, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Segmented';
import { AmendmentCard, ResolutionClauses, ResolutionHeader, SubmitterList } from '@/features/resolutions/ResolutionDocument';
import { baseFor } from '@/features/resolutions/useResolutions';
import { amendmentsFor, currentText, type Amendment, type TopicNo } from '@/lib/resolution';
import { Pane } from '../components/Pane';
import { VotePanel } from '../components/VotePanel';
import { useChair, useChairContext } from '../context';
import { useChairRes } from '../resContext';
import { presentIds } from '../store';

/**
 * The committee's resolutions as the server has them: the text as it stands
 * after every passed amendment, and every amendment delegates have submitted
 * from their phones, in order, with its vote. Guided Mode walks through all
 * of this step by step; this page is for looking things up and fixing
 * mistakes.
 */
export function Resolutions() {
  const { committee, roster } = useChairContext();
  const { ws, res, report } = useChairRes();
  const chairTopic = useChair((state) => state.topic);
  const vote = useChair((state) => state.vote);
  const attendance = useChair((state) => state.attendance);
  const startVote = useChair((state) => state.startVote);
  const [viewTopic, setViewTopic] = useState<TopicNo | null>(null);
  const topic = viewTopic ?? chairTopic;

  const state = ws.state;
  const amendments = state ? amendmentsFor(state, topic) : [];
  const topicState = state?.topics[topic];
  const base = baseFor(committee.id, topic, state);
  const current = useMemo(() => (base && state ? currentText(base, state.amendments, topic) : base), [base, state, topic]);
  const marks = useMemo(() => {
    const map = new Map<string, string>();
    for (const amendment of amendments) {
      if (amendment.status === 'passed') {
        map.set(amendment.clauseId, `${amendment.kind === 'add' ? 'Added' : 'Amended'} by Amendment ${amendment.number}`);
      }
    }
    return map;
  }, [amendments]);
  const eligible = useMemo(
    () => roster.filter((d) => presentIds(attendance).includes(d.id)).map((d) => d.id),
    [roster, attendance],
  );

  const voteOn = (amendment: Amendment) =>
    startVote({
      subjectKind: 'amendment',
      subjectId: amendment.id,
      subjectLabel: `Amendment ${amendment.number}`,
      mode: 'placard',
      eligible,
    });

  const votePanel = vote ? (
    <VotePanel
      onClosed={(result) => {
        if (result.vote.subjectKind === 'amendment') {
          report({ action: 'decide', amendmentId: result.vote.subjectId, status: result.passed ? 'passed' : 'failed', votes: result.tally });
        } else if (result.vote.subjectId.startsWith('topic-')) {
          const voted = Number(result.vote.subjectId.slice(6)) === 2 ? 2 : 1;
          report({ action: 'resolution', topic: voted, status: result.passed ? 'passed' : 'failed', votes: result.tally });
        }
      }}
    />
  ) : null;

  return (
    <Pane
      title="Resolutions"
      description="The resolution as it stands, and every amendment delegates submit from their phones."
      actions={
        res.topics.length > 1 ? (
          <Segmented
            name="Topic"
            value={String(topic) as '1' | '2'}
            onChange={(value) => setViewTopic(Number(value) as TopicNo)}
            options={res.topics.map((t) => ({ value: String(t) as '1' | '2', label: `Topic ${t}` }))}
          />
        ) : null
      }
    >
      {ws.error && !state ? (
        <Card>
          <EmptyState title="Resolutions could not be loaded" body={ws.error} />
        </Card>
      ) : null}

      {votePanel}

      {res.drafting && topic === 1 ? (
        <Card>
          <CardHeader label="Emergency Session" title="Submitted draft resolutions" />
          <CardBody className="space-y-3">
            {res.drafts.length === 0 ? (
              <p className="text-sm text-muted">No drafts yet. Delegates submit them from their phones.</p>
            ) : (
              res.drafts.map((draft) => (
                <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-hairline px-4 py-3">
                  <div>
                    <p className="font-medium text-ink-900">Draft Resolution {draft.number}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      <SubmitterList countries={draft.submitters} />
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (window.confirm(`Debate Draft Resolution ${draft.number}?`)) report({ action: 'adopt', draftId: draft.id });
                    }}
                  >
                    Choose this one
                  </Button>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      ) : null}

      {topicState && current && !(res.drafting && topic === 1) ? (
        <Card>
          <CardHeader
            label={`Topic ${topic}`}
            title={
              topicState.status === 'open'
                ? 'Not voted on yet'
                : `The resolution ${topicState.status}${topicState.votes ? ` — ${topicState.votes.for} for, ${topicState.votes.against} against, ${topicState.votes.abstain} abstaining` : ''}`
            }
            action={
              topicState.status === 'open' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(vote)}
                  onClick={() =>
                    startVote({
                      subjectKind: 'resolution',
                      subjectId: `topic-${topic}`,
                      subjectLabel: res.topics.length > 1 ? `the resolution (Topic ${topic})` : 'the resolution',
                      mode: 'placard',
                      eligible,
                    })
                  }
                >
                  <VoteIcon size={14} strokeWidth={1.75} />
                  Vote on it
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm('Undo this result? The resolution goes back to not voted on.')) {
                      report({ action: 'resolution', topic, status: 'open', votes: null });
                    }
                  }}
                >
                  <RotateCcw size={14} strokeWidth={1.75} />
                  Undo result
                </Button>
              )
            }
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader label="Amendments" title={amendments.length ? `${amendments.length} submitted` : 'None yet'} />
        <CardBody className="space-y-3">
          {amendments.length === 0 ? (
            <p className="text-sm text-muted">Delegates submit amendments from their phones: Resolution → My copy → Submit.</p>
          ) : (
            amendments.map((amendment) => (
              <AmendmentCard
                key={amendment.id}
                amendment={amendment}
                current={amendment.kind === 'add' ? undefined : (current?.clauses.find((c) => c.id === amendment.clauseId)?.text ?? null)}
                debating={state?.floor?.amendmentId === amendment.id && amendment.status === 'pending'}
                action={
                  amendment.status === 'pending' ? (
                    <>
                      <Button size="sm" variant="secondary" disabled={Boolean(vote)} onClick={() => voteOn(amendment)}>
                        <VoteIcon size={14} strokeWidth={1.75} />
                        Vote now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Withdraw Amendment ${amendment.number}?`)) {
                            report({ action: 'decide', amendmentId: amendment.id, status: 'withdrawn', votes: null });
                          }
                        }}
                      >
                        <XCircle size={14} strokeWidth={1.75} />
                        Withdraw
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Undo the result of Amendment ${amendment.number}? It goes back to waiting.`)) {
                          report({ action: 'decide', amendmentId: amendment.id, status: 'pending', votes: null });
                        }
                      }}
                    >
                      <RotateCcw size={14} strokeWidth={1.75} />
                      Undo
                    </Button>
                  )
                }
              />
            ))
          )}
        </CardBody>
      </Card>

      {current && current.clauses.length ? (
        <Card>
          <CardHeader
            label="The resolution as it stands"
            title={
              <span className="inline-flex items-center gap-2 font-serif text-lg text-ink-900">
                <CheckCircle2 size={16} strokeWidth={1.75} className="text-teal-600" />
                With every passed amendment
              </span>
            }
          />
          <CardBody className="space-y-6 px-5 py-6 sm:px-7">
            <ResolutionHeader text={current} committeeName={committee.name} topicLabel={current.language === 'ru' ? 'Топик' : 'Topic'} />
            <div className="border-t border-hairline pt-6">
              <ResolutionClauses clauses={current.clauses} marks={marks} lang={current.language} />
            </div>
          </CardBody>
        </Card>
      ) : null}
    </Pane>
  );
}
