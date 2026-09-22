import { ExternalLink, FileText, Plus, Trash2, Vote as VoteIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { DelegationMultiSelect } from '../components/DelegationMultiSelect';
import { DelegationPicker } from '../components/DelegationPicker';
import { Pane } from '../components/Pane';
import { VotePanel } from '../components/VotePanel';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import {
  RESOLUTION_FLOW,
  RESOLUTION_LABEL,
  type Amendment,
  type Resolution,
  type ResolutionStatus,
} from '../types';

const STATUS_TONE: Record<ResolutionStatus, 'neutral' | 'teal' | 'success' | 'danger' | 'warning'> = {
  draft: 'neutral',
  introduced: 'teal',
  debate: 'teal',
  voting: 'warning',
  passed: 'success',
  failed: 'danger',
};

const AMENDMENT_TONE: Record<Amendment['status'], 'neutral' | 'teal' | 'success' | 'danger'> = {
  pending: 'neutral',
  accepted: 'teal',
  passed: 'success',
  failed: 'danger',
  withdrawn: 'neutral',
};

export function Resolutions() {
  const { roster } = useChairContext();
  const { nameOf, codeOf } = useDelegationLookup();

  const resolutions = useChair((state) => state.resolutions);
  const amendments = useChair((state) => state.amendments);
  const addResolution = useChair((state) => state.addResolution);
  const setStatus = useChair((state) => state.setResolutionStatus);
  const removeResolution = useChair((state) => state.removeResolution);
  const addAmendment = useChair((state) => state.addAmendment);
  const setAmendmentStatus = useChair((state) => state.setAmendmentStatus);
  const removeAmendment = useChair((state) => state.removeAmendment);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = resolutions.find((resolution) => resolution.id === selectedId) ?? null;

  return (
    <Pane
      title="Resolutions"
      description="Draft resolutions, their submitters and every amendment raised against them."
      actions={
        <Button
          variant="primary"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
        >
          <Plus size={15} strokeWidth={1.5} />
          New draft resolution
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* List */}
        <Card className="xl:sticky xl:top-24 xl:self-start">
          <CardHeader label="Drafts" title={`${resolutions.length} on file`} />
          {resolutions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No resolutions yet"
              body="Create a draft resolution once a bloc submits one."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {resolutions.map((resolution) => (
                <li key={resolution.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(resolution.id);
                      setCreating(false);
                    }}
                    className={cn(
                      'flex w-full flex-col gap-1.5 px-5 py-3.5 text-left transition-colors duration-150',
                      resolution.id === selectedId ? 'bg-teal-50' : 'hover:bg-canvas',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink-900">{resolution.number}</span>
                      <Badge tone={STATUS_TONE[resolution.status]}>
                        {RESOLUTION_LABEL[resolution.status]}
                      </Badge>
                    </div>
                    <span className="line-clamp-2 text-xs leading-relaxed text-muted">
                      {resolution.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Detail or create */}
        <div>
          {creating ? (
            <CreateResolution
              roster={roster}
              onCancel={() => setCreating(false)}
              onCreate={(input) => {
                // Open the new resolution straight away — a chair who has just
                // written one down wants to introduce it, not hunt for it in
                // the list first.
                setSelectedId(addResolution(input));
                setCreating(false);
              }}
            />
          ) : selected ? (
            <ResolutionDetail
              resolution={selected}
              amendments={amendments.filter((amendment) => amendment.resolutionId === selected.id)}
              roster={roster}
              nameOf={nameOf}
              codeOf={codeOf}
              onStatus={(status) => setStatus(selected.id, status)}
              onDelete={() => {
                removeResolution(selected.id);
                setSelectedId(null);
              }}
              onAddAmendment={addAmendment}
              onAmendmentStatus={setAmendmentStatus}
              onRemoveAmendment={removeAmendment}
            />
          ) : (
            <Card>
              <EmptyState
                icon={FileText}
                title="Select a resolution"
                body="Choose a draft from the list, or create a new one."
              />
            </Card>
          )}
        </div>
      </div>
    </Pane>
  );
}

function CreateResolution({
  roster,
  onCreate,
  onCancel,
}: {
  roster: ReturnType<typeof useChairContext>['roster'];
  onCreate: (input: Omit<Resolution, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}) {
  const [number, setNumber] = useState('DR 1.1');
  const [title, setTitle] = useState('');
  const [mainSubmitters, setMainSubmitters] = useState<string[]>([]);
  const [signatories, setSignatories] = useState<string[]>([]);
  const [link, setLink] = useState('');

  return (
    <Card>
      <CardHeader label="New draft resolution" title="Details" />
      <CardBody className="space-y-5 py-5">
        <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Field label="Number" htmlFor="dr-number">
            <Input id="dr-number" value={number} onChange={(event) => setNumber(event.target.value)} />
          </Field>
          <Field label="Title" htmlFor="dr-title">
            <Input
              id="dr-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Strengthening regional early-warning capacity in the Sahel"
            />
          </Field>
        </div>

        <DelegationMultiSelect
          label="Main submitters"
          delegations={roster}
          value={mainSubmitters}
          onChange={setMainSubmitters}
        />

        <DelegationMultiSelect
          label="Co-submitters and signatories"
          delegations={roster.filter((d) => !mainSubmitters.includes(d.id))}
          value={signatories}
          onChange={setSignatories}
        />

        <Field label="Document link" htmlFor="dr-link" hint="Optional — a Google Doc or PDF the committee can read.">
          <Input
            id="dr-link"
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://"
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            disabled={!number.trim() || !title.trim()}
            onClick={() =>
              onCreate({
                number: number.trim(),
                title: title.trim(),
                mainSubmitters,
                signatories,
                link: link.trim(),
              })
            }
          >
            Create resolution
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ResolutionDetail({
  resolution,
  amendments,
  roster,
  nameOf,
  codeOf,
  onStatus,
  onDelete,
  onAddAmendment,
  onAmendmentStatus,
  onRemoveAmendment,
}: {
  resolution: Resolution;
  amendments: Amendment[];
  roster: ReturnType<typeof useChairContext>['roster'];
  nameOf: (id: string | null | undefined) => string;
  codeOf: (id: string | null | undefined) => string | null;
  onStatus: (status: ResolutionStatus) => void;
  onDelete: () => void;
  onAddAmendment: (input: Omit<Amendment, 'id' | 'createdAt' | 'status'>) => void;
  onAmendmentStatus: (id: string, status: Amendment['status']) => void;
  onRemoveAmendment: (id: string) => void;
}) {
  const [submittedBy, setSubmittedBy] = useState<string | null>(null);
  const [clause, setClause] = useState('');
  const [text, setText] = useState('');
  const [friendly, setFriendly] = useState(false);

  const currentStep = RESOLUTION_FLOW.indexOf(resolution.status);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          label={resolution.number}
          title={resolution.title}
          action={
            <>
              {resolution.link ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(resolution.link, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink size={15} strokeWidth={1.5} />
                  Document
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" iconOnly onClick={onDelete} aria-label="Delete resolution">
                <Trash2 size={15} strokeWidth={1.5} />
              </Button>
            </>
          }
        />
        <CardBody className="space-y-6 py-5">
          {/* Status flow */}
          <div>
            <p className="label-micro mb-3">Status</p>
            <ol className="flex flex-wrap items-center gap-1.5">
              {RESOLUTION_FLOW.map((status, index) => {
                const active = resolution.status === status;
                const done = currentStep >= 0 && index < currentStep;
                return (
                  <li key={status} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStatus(status)}
                      className={cn(
                        'rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-200',
                        active
                          ? 'bg-teal-500 text-white'
                          : done
                            ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                            : 'bg-ink-50 text-muted hover:bg-ink-100 hover:text-ink-700',
                      )}
                    >
                      {RESOLUTION_LABEL[status]}
                    </button>
                    {index < RESOLUTION_FLOW.length - 1 ? (
                      <span aria-hidden="true" className="text-ink-200">
                        ›
                      </span>
                    ) : null}
                  </li>
                );
              })}
              <li className="ml-2">
                <button
                  type="button"
                  onClick={() => onStatus('failed')}
                  className={cn(
                    'rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors duration-200',
                    resolution.status === 'failed'
                      ? 'bg-danger text-white'
                      : 'bg-ink-50 text-muted hover:bg-danger-soft hover:text-danger',
                  )}
                >
                  Failed
                </button>
              </li>
            </ol>
          </div>

          {/* Voting Procedure, on the resolution itself */}
          {resolution.status !== 'passed' && resolution.status !== 'failed' ? (
            <div className="space-y-3 border-t border-hairline pt-5">
              <p className="label-micro">Voting Procedure</p>
              <VoteLauncher
                subjectKind="resolution"
                subjectId={resolution.id}
                subjectLabel={`${resolution.number} — ${resolution.title}`}
              />
            </div>
          ) : null}

          {/* Submitters */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="label-micro mb-2">Main submitters</p>
              <SubmitterList ids={resolution.mainSubmitters} nameOf={nameOf} codeOf={codeOf} />
            </div>
            <div>
              <p className="label-micro mb-2">
                Signatories · {resolution.signatories.length}
              </p>
              <SubmitterList ids={resolution.signatories} nameOf={nameOf} codeOf={codeOf} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Amendments */}
      <Card>
        <CardHeader label="Amendments" title={`${amendments.length} submitted`} />
        {amendments.length === 0 ? (
          <EmptyState title="No amendments" body="Amendments submitted against this resolution appear here." />
        ) : (
          <ul className="divide-y divide-hairline">
            {amendments.map((amendment) => (
              <li key={amendment.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={amendment.friendly ? 'teal' : 'neutral'}>
                        {amendment.friendly ? 'Friendly' : 'Unfriendly'}
                      </Badge>
                      <Badge tone={AMENDMENT_TONE[amendment.status]}>{amendment.status}</Badge>
                      <span className="text-sm font-medium text-ink-900">{amendment.clause}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">{amendment.text}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <Flag code={codeOf(amendment.submittedBy)} country={nameOf(amendment.submittedBy)} size="xs" />
                      {nameOf(amendment.submittedBy)}
                    </p>

                    {/* Friendly amendments are accepted without a vote; only an
                        unfriendly one still pending needs the committee. */}
                    {!amendment.friendly && amendment.status === 'pending' ? (
                      <div className="mt-3">
                        <VoteLauncher
                          subjectKind="amendment"
                          subjectId={amendment.id}
                          subjectLabel={`Amendment to ${resolution.number} — ${amendment.clause}`}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {amendment.status === 'pending' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAmendmentStatus(amendment.id, 'withdrawn')}
                      >
                        Withdraw
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => onRemoveAmendment(amendment.id)}
                      aria-label="Delete amendment"
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <CardBody className="space-y-4 border-t border-hairline bg-canvas py-5">
          <p className="label-micro">Submit an amendment</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label-micro mb-1.5 block">Submitted by</span>
              <DelegationPicker
                delegations={roster}
                value={submittedBy}
                onChange={setSubmittedBy}
                placeholder="Choose a delegation"
              />
            </div>
            <Field label="Clause affected" htmlFor="amendment-clause">
              <Input
                id="amendment-clause"
                value={clause}
                onChange={(event) => setClause(event.target.value)}
                placeholder="e.g. Operative clause 3"
              />
            </Field>
          </div>

          <Field label="Amendment text" htmlFor="amendment-text">
            <Textarea
              id="amendment-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Strike “shall” and insert “should” …"
            />
          </Field>

          <label className="flex items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={friendly}
              onChange={(event) => setFriendly(event.target.checked)}
              className="h-4 w-4 rounded border-hairline text-teal-500"
            />
            Friendly — accepted by the submitters without a vote
          </label>

          <Button
            variant="primary"
            disabled={!submittedBy || !clause.trim() || !text.trim()}
            onClick={() => {
              if (!submittedBy) return;
              onAddAmendment({
                resolutionId: resolution.id,
                submittedBy,
                clause: clause.trim(),
                text: text.trim(),
                friendly,
              });
              setClause('');
              setText('');
              setFriendly(false);
              setSubmittedBy(null);
            }}
          >
            <Plus size={15} strokeWidth={1.5} />
            Add amendment
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function SubmitterList({
  ids,
  nameOf,
  codeOf,
}: {
  ids: string[];
  nameOf: (id: string) => string;
  codeOf: (id: string) => string | null;
}) {
  if (ids.length === 0) return <p className="text-sm text-muted">None recorded.</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <li
          key={id}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1"
        >
          <Flag code={codeOf(id)} country={nameOf(id)} size="xs" />
          <span className="text-xs text-ink-700">{nameOf(id)}</span>
        </li>
      ))}
    </ul>
  );
}


/**
 * Put something to a vote without leaving it.
 *
 * The chair has the Draft Resolution or the Amendment in front of them; making
 * them go to a separate screen and pick it out of a dropdown again is the step
 * this removes. Once a vote opens, the panel takes over this same spot.
 */
function VoteLauncher({
  subjectKind,
  subjectId,
  subjectLabel,
}: {
  subjectKind: 'resolution' | 'amendment';
  subjectId: string;
  subjectLabel: string;
}) {
  const { roster } = useChairContext();
  const vote = useChair((state) => state.vote);
  const attendance = useChair((state) => state.attendance);
  const startVote = useChair((state) => state.startVote);

  const eligible = useMemo(
    () =>
      roster
        .filter((delegation) => (attendance[delegation.id] ?? 'absent') !== 'absent')
        .sort((a, b) => a.country.localeCompare(b.country))
        .map((delegation) => delegation.id),
    [roster, attendance],
  );

  if (vote?.subjectKind === subjectKind && vote.subjectId === subjectId) return <VotePanel />;

  // One vote at a time: the committee cannot be voting on two things at once.
  if (vote) {
    return (
      <p className="rounded-control border border-hairline bg-canvas px-3 py-2.5 text-xs text-muted">
        A vote is already open on <span className="text-ink-700">{vote.subjectLabel}</span>. Close it
        before opening another.
      </p>
    );
  }

  if (eligible.length === 0) {
    return (
      <p className="rounded-control border border-hairline bg-canvas px-3 py-2.5 text-xs text-muted">
        Take the Roll Call before opening a vote.
      </p>
    );
  }

  const open = (mode: 'placard' | 'roll-call') =>
    startVote({ subjectKind, subjectId, subjectLabel, mode, eligible });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" size="sm" onClick={() => open('placard')}>
        <VoteIcon size={15} strokeWidth={1.5} />
        Placard Vote
      </Button>
      <Button variant="secondary" size="sm" onClick={() => open('roll-call')}>
        Roll Call Vote
      </Button>
      <span className="text-xs text-muted">{eligible.length} delegations eligible</span>
    </div>
  );
}
