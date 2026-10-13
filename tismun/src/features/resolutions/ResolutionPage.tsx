import { ArrowLeft, CheckCircle2, FileText, Loader2, Megaphone, Send, Share2, Users, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { hasResolutions, topicsOf } from '@/config/resolutions';
import type { Committee } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { countryCodeFor } from '@/lib/countryCodes';
import {
  amendmentsFor,
  amendmentsFromCopy,
  copyChangeCount,
  currentTopic,
  describeAmendment,
  ResolutionError,
  sameCountry,
  type Copy,
  type ResolutionText,
  type TopicNo,
} from '@/lib/resolution';
import { useAuth } from '@/store/auth';
import { useCommittee } from '@/store/conference';
import { useConferenceStatus } from '@/store/conferenceStatus';
import { resolutionCommitteeOf } from './committeeOf';
import { CopyEditor, virtualCopy } from './CopyEditor';
import { AmendmentCard, ResolutionClauses, ResolutionHeader, SubmitterList } from './ResolutionDocument';
import { useResolutions, type Workspace } from './useResolutions';

type Tab = 'read' | 'copy' | 'amendments';

/** Which committee's resolution a person works on today. */
function useMyResolutionCommittee(): string | null {
  const user = useAuth((state) => state.user);
  const day2 = useConferenceStatus((state) => state.status?.day2 ?? false);
  const released = useConferenceStatus((state) => state.status?.released ?? false);
  const [params] = useSearchParams();
  const asked = params.get('committee');
  if (asked) return asked;
  return resolutionCommitteeOf(user, day2, released) ?? user?.access.chairOf ?? user?.committeeId ?? null;
}

/**
 * The resolution workspace for a committee's delegates: read the draft
 * resolution, propose changes in your country's copy — alone or with the
 * countries you share it with — and follow every amendment to its vote.
 */
export function ResolutionPage() {
  const committeeId = useMyResolutionCommittee();
  const committee = useCommittee(committeeId);

  if (!committeeId || !hasResolutions(committeeId)) {
    return (
      <PageContainer>
        <Card className="max-w-xl">
          <EmptyState
            title="No resolution here"
            body="Your committee does not debate a resolution on the site. If you think it should, ask your chairs."
          />
        </Card>
      </PageContainer>
    );
  }
  if (!committee) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" />
          Loading…
        </div>
      </PageContainer>
    );
  }
  return <ResolutionWorkspace committee={committee} />;
}

function ResolutionWorkspace({ committee }: { committee: Committee }) {
  const topics = topicsOf(committee.id);
  const [topicChoice, setTopicChoice] = useState<TopicNo | null>(null);
  const [tab, setTab] = useState<Tab>('read');
  const topic = topicChoice ?? 1;
  const ws = useResolutions(committee.id, topic, { fast: tab === 'copy', withCountries: true });

  // Open on the topic the committee is debating: the first answer may say Topic 2.
  // During a caucus, a delegate is there to write: open their copy.
  useEffect(() => {
    if (topicChoice !== null || !ws.state) return;
    setTopicChoice(currentTopic(ws.state, topics));
    if (ws.me?.role === 'delegate' && ws.state.floor?.stage.startsWith('Unmoderated Caucus')) setTab('copy');
  }, [ws.state, ws.me, topicChoice, topics]);

  const isDelegate = ws.me?.role === 'delegate';
  const topicState = ws.state?.topics[topic];
  const amendments = ws.state ? amendmentsFor(ws.state, topic) : [];
  const floor = ws.state?.floor && ws.state.floor.topic === topic ? ws.state.floor : null;
  const floorAmendment = floor?.amendmentId ? amendments.find((a) => a.id === floor.amendmentId) : null;
  const topicTitle = committee.topics[topic - 1] || ws.current?.topic || '';

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink-900">
          <ArrowLeft size={15} strokeWidth={1.5} />
          Home
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-micro">
              {committee.abbreviation} · {ws.drafting ? 'Writing the resolution' : 'Draft resolution'}
            </p>
            <h1 className="mt-2 font-serif text-[24px] leading-tight text-ink-900 sm:text-[30px]">{topicTitle}</h1>
          </div>
          {topics.length > 1 ? (
            <Segmented
              name="Topic"
              value={String(topic) as '1' | '2'}
              onChange={(value) => setTopicChoice(Number(value) as TopicNo)}
              options={topics.map((t) => ({ value: String(t) as '1' | '2', label: `Topic ${t}` }))}
            />
          ) : null}
        </div>

        {floor ? (
          <div className="mt-5 flex items-start gap-3 rounded-card border border-teal-200 bg-teal-50/60 px-4 py-3">
            <Megaphone size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-teal-700" />
            <div className="text-sm">
              <p className="font-medium text-teal-900">
                Now: {floor.stage}
                {floorAmendment ? ` — Amendment ${floorAmendment.number}` : ''}
              </p>
              {floor.stage.startsWith('Voting') ? (
                <p className="mt-0.5 text-teal-800">Note passing is suspended during voting.</p>
              ) : floorAmendment ? (
                <p className="mt-0.5 text-teal-800">{describeAmendment(floorAmendment).replace(/^Amendment \d+ — /, '')}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {topicState && topicState.status !== 'open' ? (
          <div
            className={cn(
              'mt-5 flex items-center gap-2.5 rounded-card border px-4 py-3 text-sm font-medium',
              topicState.status === 'passed'
                ? 'border-success-border bg-success-soft text-success'
                : 'border-danger-border bg-danger-soft text-danger',
            )}
          >
            {topicState.status === 'passed' ? <CheckCircle2 size={17} strokeWidth={1.75} /> : <XCircle size={17} strokeWidth={1.75} />}
            The resolution {topicState.status}
            {topicState.votes ? ` — ${topicState.votes.for} for, ${topicState.votes.against} against, ${topicState.votes.abstain} abstaining` : ''}.
          </div>
        ) : null}

        <div className="mt-6">
          <Segmented
            name="View"
            value={tab}
            onChange={setTab}
            className="w-full [&>button]:flex-1"
            options={[
              { value: 'read', label: ws.drafting ? 'Drafts' : 'Resolution' },
              ...(isDelegate ? [{ value: 'copy' as const, label: ws.drafting ? 'Our draft' : 'My copy' }] : []),
              ...(ws.drafting ? [] : [{ value: 'amendments' as const, label: `Amendments${amendments.length ? ` (${amendments.length})` : ''}` }]),
            ]}
          />
        </div>

        <div className="mt-6">
          {ws.loading && !ws.state ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted">
              <Loader2 size={15} className="animate-spin" />
              Loading the resolution…
            </div>
          ) : tab === 'read' ? (
            <>
              {isDelegate && topicState?.status === 'open' ? (
                <Button variant="primary" size="lg" className="mb-5 w-full" onClick={() => setTab('copy')}>
                  {ws.drafting ? 'Write your draft' : 'Suggest a change to this resolution'}
                </Button>
              ) : null}
              <ReadTab ws={ws} committee={committee} topic={topic} />
            </>
          ) : tab === 'copy' && isDelegate ? (
            <CopyTab ws={ws} topic={topic} onSubmitted={() => setTab(ws.drafting ? 'read' : 'amendments')} />
          ) : (
            <AmendmentsTab ws={ws} topic={topic} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Notice({ tone, children }: { tone: 'error' | 'ok' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-card border px-4 py-3 text-sm',
        tone === 'error' && 'border-danger-border bg-danger-soft text-danger',
        tone === 'ok' && 'border-success-border bg-success-soft text-success',
        tone === 'info' && 'border-hairline bg-canvas text-muted',
      )}
    >
      {children}
    </div>
  );
}

/* ── The resolution as it stands ─────────────────────────────────────────── */

function ReadTab({ ws, committee, topic }: { ws: Workspace; committee: Committee; topic: TopicNo }) {
  const marks = useMemo(() => {
    const map = new Map<string, string>();
    for (const amendment of ws.state ? amendmentsFor(ws.state, topic) : []) {
      if (amendment.status !== 'passed') continue;
      map.set(amendment.clauseId, `${amendment.kind === 'add' ? 'Added' : 'Amended'} by Amendment ${amendment.number}`);
    }
    return map;
  }, [ws.state, topic]);

  if (ws.drafting) return <DraftsList ws={ws} />;
  if (!ws.current) return <Notice tone="info">There is no resolution for this topic yet.</Notice>;

  return (
    <Card>
      <CardBody className="space-y-6 px-5 py-6 sm:px-7">
        <ResolutionHeader
          text={ws.current}
          committeeName={committee.name}
          topicLabel={ws.current.language === 'ru' ? 'Топик' : 'Topic'}
        />
        <div className="border-t border-hairline pt-6">
          <ResolutionClauses clauses={ws.current.clauses} marks={marks} lang={ws.current.language} />
        </div>
      </CardBody>
    </Card>
  );
}

/** The Emergency Session before the chairs adopt a draft. */
function DraftsList({ ws }: { ws: Workspace }) {
  const drafts = ws.state?.drafts.filter((draft) => draft.status !== 'withdrawn') ?? [];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Notice tone="info">
        No draft resolution has been chosen yet. Write one with your bloc under <strong>Our draft</strong>, share it with
        the countries writing it with you, and submit it. The chairs then choose the draft the committee debates.
      </Notice>
      {drafts.length === 0 ? null : (
        <div className="space-y-3">
          <p className="label-micro">Submitted drafts</p>
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <CardBody className="px-5 py-4">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                  onClick={() => setOpen(open === draft.id ? null : draft.id)}
                >
                  <span className="font-serif text-[17px] text-ink-900">Draft Resolution {draft.number}</span>
                  <span className="text-xs text-muted">{open === draft.id ? 'Hide' : 'Read it'}</span>
                </button>
                <p className="mt-1 text-xs text-muted">
                  <SubmitterList countries={draft.submitters} />
                </p>
                {open === draft.id ? (
                  <div className="mt-4 border-t border-hairline pt-4">
                    <ResolutionClauses clauses={draft.text.clauses} />
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Amendments ──────────────────────────────────────────────────────────── */

function AmendmentsTab({ ws, topic }: { ws: Workspace; topic: TopicNo }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const amendments = ws.state ? amendmentsFor(ws.state, topic) : [];
  const floorId = ws.state?.floor?.topic === topic ? ws.state.floor.amendmentId : null;
  const country = ws.me?.country ?? null;
  const clauseNow = (clauseId: string) => ws.current?.clauses.find((clause) => clause.id === clauseId)?.text ?? null;

  if (amendments.length === 0) {
    return (
      <Notice tone="info">
        No amendments yet. Propose one from {ws.me?.role === 'delegate' ? <strong>My copy</strong> : 'a delegate’s copy'}: change
        the words of any clause, strike one, or add a new one, then press Submit.
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <p className="text-sm text-muted">Debated in the order they were submitted.</p>
      {amendments.map((amendment) => {
        const mine = country !== null && amendment.submitters.some((submitter) => sameCountry(submitter, country));
        return (
          <AmendmentCard
            key={amendment.id}
            amendment={amendment}
            current={amendment.kind === 'add' ? undefined : clauseNow(amendment.clauseId)}
            debating={floorId === amendment.id && amendment.status === 'pending'}
            action={
              mine && amendment.status === 'pending' && floorId !== amendment.id ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === amendment.id}
                  onClick={async () => {
                    if (!window.confirm(`Withdraw Amendment ${amendment.number}?`)) return;
                    setBusy(amendment.id);
                    setError(null);
                    try {
                      await ws.act({ action: 'withdraw', amendmentId: amendment.id });
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : 'It could not be withdrawn.');
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Withdraw
                </Button>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}

/* ── My copy ─────────────────────────────────────────────────────────────── */

function CopyTab({ ws, topic, onSubmitted }: { ws: Workspace; topic: TopicNo; onSubmitted: () => void }) {
  const country = ws.me?.country ?? '';
  const epoch = ws.state?.topics[topic].epoch ?? 0;
  const own = ws.copies.find((copy) => copy.topic === topic && sameCountry(copy.owner, country));
  const mine = own ?? virtualCopy(topic, country, epoch);
  const others = ws.copies
    .filter((copy) => copy.topic === topic && !sameCountry(copy.owner, country))
    .sort((a, b) => a.owner.localeCompare(b.owner));
  const [selectedOwner, setSelectedOwner] = useState<string>(country);
  const copy = others.find((entry) => entry.owner === selectedOwner) ?? mine;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const decided = ws.state?.topics[topic].status !== 'open';

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(id);
  }, [error]);

  if (!ws.current) return <Notice tone="info">There is no resolution for this topic yet.</Notice>;
  const current = ws.current;
  const changes = copyChangeCount(copy);
  const owned = sameCountry(copy.owner, country);

  return (
    <div className="space-y-5 pb-24">
      {others.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Copies you can edit">
          {[mine, ...others].map((entry) => {
            const active = entry.owner === copy.owner;
            return (
              <button
                key={entry.owner}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedOwner(entry.owner)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150',
                  active ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-hairline bg-surface text-ink-700 hover:border-ink-300',
                )}
              >
                <Flag code={countryCodeFor(entry.owner)} country={entry.owner} size="xs" />
                {sameCountry(entry.owner, country) ? 'My copy' : `${entry.owner}’s copy`}
              </button>
            );
          })}
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-ink-900">
              {owned ? (ws.drafting ? 'Your country’s draft' : 'Your country’s copy') : `${copy.owner}’s copy, shared with you`}
            </p>
            <p className="mt-1 flex gap-1.5 text-muted">
              <Users size={13} strokeWidth={1.5} className="mt-[3px] shrink-0" />
              <span className="min-w-0">
                {copy.members.length ? (
                  <>
                    {owned ? 'Shared with' : `Shared by ${copy.owner} with`}{' '}
                    <SubmitterList countries={copy.members} />
                  </>
                ) : (
                  'Only you can see it. Share it to write it together.'
                )}
              </span>
            </p>
          </div>
          {owned && !decided ? (
            <Button variant="secondary" size="sm" onClick={() => setSharing(true)}>
              <Share2 size={14} strokeWidth={1.75} />
              Share with other countries
            </Button>
          ) : null}
        </CardBody>
      </Card>

      {copy.lastSubmitted && changes === 0 ? (
        <Notice tone="ok">
          {copy.lastSubmitted.draft
            ? `Submitted as Draft Resolution ${copy.lastSubmitted.numbers[0]}.`
            : `Submitted as ${copy.lastSubmitted.numbers.length === 1 ? 'Amendment' : 'Amendments'} ${listNumbers(copy.lastSubmitted.numbers)}.`}{' '}
          {ws.drafting ? '' : 'You can keep proposing changes here.'}
        </Notice>
      ) : null}
      {notice ? <Notice tone="ok">{notice}</Notice> : null}
      {decided ? <Notice tone="info">The committee has voted on this resolution, so it can no longer be amended.</Notice> : null}
      {!decided ? <HowTo drafting={ws.drafting} /> : null}

      <CopyEditor
        key={`${topic}-${copy.owner}`}
        ws={ws}
        topic={topic}
        copy={copy}
        current={current}
        readOnly={decided}
        onError={setError}
      />

      {/* Always in reach on a phone. */}
      {!decided ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur-[6px]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            {error ? (
              <p role="alert" className="min-w-0 flex-1 text-sm text-danger">
                {error}
              </p>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-muted">
                {changes === 0 ? 'No changes yet' : `${changes} ${changes === 1 ? 'change' : 'changes'}`}
              </p>
            )}
            <Button variant="primary" disabled={changes === 0} onClick={() => setConfirming(true)}>
              <Send size={15} strokeWidth={1.75} />
              {ws.drafting ? 'Submit draft' : changes ? `Submit ${changes} ${changes === 1 ? 'change' : 'changes'}` : 'Submit'}
            </Button>
          </div>
        </div>
      ) : null}

      <ShareDialog
        open={sharing}
        onClose={() => setSharing(false)}
        ws={ws}
        topic={topic}
        copy={copy}
        country={country}
      />
      <SubmitDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        ws={ws}
        topic={topic}
        copy={copy}
        current={current}
        onDone={(numbers) => {
          setConfirming(false);
          setNotice(
            ws.drafting
              ? `Submitted as Draft Resolution ${numbers[0]}. The chairs choose which draft the committee debates.`
              : `Submitted as ${numbers.length === 1 ? 'Amendment' : 'Amendments'} ${listNumbers(numbers)}.`,
          );
          onSubmitted();
        }}
      />
    </div>
  );
}

/** Three steps, always in view: nobody has to work out what to do. */
function HowTo({ drafting }: { drafting: boolean }) {
  const steps = drafting
    ? ['Add clauses below. It saves by itself.', 'Share it with the countries writing it with you (optional).', 'Press Submit draft at the bottom.']
    : ['Tap “Change this” on a clause and type. It saves by itself.', 'Share your copy to write it with other countries (optional).', 'Press Submit at the bottom.'];
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 rounded-card border border-hairline bg-surface px-4 py-3 text-sm text-ink-800">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white">
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

const listNumbers = (numbers: number[]): string =>
  numbers.length <= 1
    ? String(numbers[0] ?? '')
    : `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;

function ShareDialog({
  open,
  onClose,
  ws,
  topic,
  copy,
  country,
}: {
  open: boolean;
  onClose: () => void;
  ws: Workspace;
  topic: TopicNo;
  copy: Copy;
  country: string;
}) {
  const [chosen, setChosen] = useState<string[]>(copy.members);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) setChosen(copy.members);
  }, [open, copy.members]);
  const countries = ws.countries.filter((entry) => !sameCountry(entry.name, country));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share your copy"
      description="Countries you share with can edit it with you, live. You are all listed as its submitters."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await ws.act({ action: 'edit', topic, copyId: copy.id || null, ops: [{ op: 'share', members: chosen }] });
                onClose();
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'Sharing did not save.');
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {countries.length === 0 ? (
        <p className="text-sm text-muted">No other countries found in this committee.</p>
      ) : (
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {countries.map((entry) => {
            const checked = chosen.some((member) => sameCountry(member, entry.name));
            return (
              <li key={entry.name}>
                <label className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-2 hover:bg-ink-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setChosen((list) =>
                        checked ? list.filter((member) => !sameCountry(member, entry.name)) : [...list, entry.name],
                      )
                    }
                    className="h-4 w-4 accent-teal-600"
                  />
                  <Flag code={entry.code} country={entry.name} size="sm" />
                  <span className="text-sm text-ink-900">{entry.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function SubmitDialog({
  open,
  onClose,
  ws,
  topic,
  copy,
  current,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  ws: Workspace;
  topic: TopicNo;
  copy: Copy;
  current: ResolutionText;
  onDone: (numbers: number[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  let preview: string[] = [];
  let problem: string | null = null;
  if (open && !ws.drafting) {
    try {
      preview = amendmentsFromCopy(copy, current).map((draft) =>
        draft.kind === 'add' ? draft.label : `${draft.kind === 'remove' ? 'Removes' : 'Changes'} ${draft.label.toLowerCase()}`,
      );
    } catch (caught) {
      problem = caught instanceof ResolutionError ? caught.message : 'This copy cannot be submitted yet.';
    }
  }
  const submitters = [copy.owner, ...copy.members];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ws.drafting ? 'Submit your draft resolution?' : `Submit ${preview.length === 1 ? 'this amendment' : `${preview.length} amendments`}?`}
      description={
        ws.drafting
          ? 'The chairs will see it with the other drafts and choose one for the committee to debate.'
          : 'Each one is debated and voted on separately, in the order received.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not yet
          </Button>
          <Button
            variant="primary"
            disabled={busy || Boolean(problem) || (!ws.drafting && preview.length === 0)}
            onClick={async () => {
              if (!copy.id) return;
              setBusy(true);
              setError(null);
              try {
                const result = await ws.act({ action: 'submit', topic, copyId: copy.id });
                onDone(result.numbers ?? []);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'It did not submit. Try again.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send size={15} strokeWidth={1.75} />
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {problem ? <p className="text-danger">{problem}</p> : null}
        {error ? <p className="text-danger">{error}</p> : null}
        {preview.length ? (
          <ul className="space-y-1.5">
            {preview.map((line, index) => (
              <li key={index} className="flex gap-2 text-ink-900">
                <FileText size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-teal-600" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <p className="label-micro mb-1.5">Submitted by</p>
          <SubmitterList countries={submitters} className="text-ink-900" />
        </div>
        <Badge tone="neutral">Your copy is cleared once submitted</Badge>
      </div>
    </Modal>
  );
}
