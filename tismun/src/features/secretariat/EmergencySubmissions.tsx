import { ArrowRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { emergencySession } from '@/config/emergency';
import { amendmentsFor, copyChangeCount, type Amendment } from '@/lib/resolution';
import { formatTimeOfDay } from '@/lib/time';
import { SubmitterList } from '@/features/resolutions/ResolutionDocument';
import { useResolutions } from '@/features/resolutions/useResolutions';

const AMENDMENT_STATUS: Record<Amendment['status'], { label: string; tone: 'neutral' | 'success' | 'danger' | 'outline' }> = {
  pending: { label: 'Waiting', tone: 'neutral' },
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  withdrawn: { label: 'Withdrawn', tone: 'outline' },
};

const RESOLUTION_PAGE = `/resolution?committee=${encodeURIComponent(emergencySession.committeeId)}`;

/**
 * Everything the Emergency Session's delegates have written, on the
 * Secretariat's own page: every draft submitted, every draft still being
 * written, and every amendment. It refreshes by itself; the full text is one
 * click away on the resolution page.
 */
export function EmergencySubmissions() {
  const ws = useResolutions(emergencySession.committeeId, 1);
  const drafts = ws.state?.drafts ?? [];
  const chosen = drafts.find((draft) => draft.status === 'adopted') ?? null;
  const writing = ws.writing.filter((copy) => copy.topic === 1).sort((a, b) => b.updatedAt - a.updatedAt);
  const amendments = ws.state ? amendmentsFor(ws.state, 1) : [];
  const setAside = (ws.state?.setAside ?? []).reduce((count, group) => count + group.amendments.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-micro">Drafts and amendments</p>
        <Link
          to={RESOLUTION_PAGE}
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          Read them in full
          <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </div>

      {ws.loading && !ws.state ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </p>
      ) : ws.error && !ws.state ? (
        <p className="mt-2 text-sm text-muted">{ws.error}</p>
      ) : (
        <div className="mt-2 space-y-4">
          <p className="text-sm text-ink-800">
            {[
              `${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'} submitted`,
              `${writing.length} being written`,
              ...(chosen ? [`Draft Resolution ${chosen.number} chosen for debate`] : []),
              ...(chosen || amendments.length ? [`${amendments.length} ${amendments.length === 1 ? 'amendment' : 'amendments'}`] : []),
            ].join(' · ')}
          </p>

          {drafts.length ? (
            <Group title="Submitted drafts">
              {drafts.map((draft) => (
                <Row
                  key={draft.id}
                  time={draft.submittedAt}
                  title={`Draft Resolution ${draft.number}`}
                  countries={draft.submitters}
                  badge={
                    draft.status === 'adopted' ? (
                      <Badge tone="success">Chosen for debate</Badge>
                    ) : draft.status === 'withdrawn' ? (
                      <Badge tone="outline">Withdrawn</Badge>
                    ) : chosen ? (
                      <Badge tone="neutral">Not chosen</Badge>
                    ) : null
                  }
                />
              ))}
            </Group>
          ) : null}

          {writing.length ? (
            <Group title="Being written now — not submitted yet">
              {writing.map((copy) => {
                const count = copyChangeCount(copy);
                const unit = chosen ? (count === 1 ? 'change' : 'changes') : count === 1 ? 'clause' : 'clauses';
                return (
                  <Row
                    key={copy.id}
                    time={copy.updatedAt}
                    title={`${copy.owner}’s ${chosen ? 'copy' : 'draft'}`}
                    detail={`${count} ${unit} so far`}
                    countries={[copy.owner, ...copy.members]}
                    badge={<Badge tone="warning">Not submitted</Badge>}
                  />
                );
              })}
            </Group>
          ) : null}

          {amendments.length ? (
            <Group title="Amendments">
              {amendments.map((amendment) => {
                const status = AMENDMENT_STATUS[amendment.status];
                return (
                  <Row
                    key={amendment.id}
                    time={amendment.submittedAt}
                    title={`Amendment ${amendment.number}`}
                    detail={
                      amendment.kind === 'add'
                        ? amendment.label
                        : `${amendment.kind === 'remove' ? 'Removes' : 'Changes'} ${amendment.label.toLowerCase()}`
                    }
                    countries={amendment.submitters}
                    badge={<Badge tone={status.tone}>{status.label}</Badge>}
                  />
                );
              })}
            </Group>
          ) : null}

          {setAside ? (
            <p className="text-xs text-muted">
              {setAside} {setAside === 1 ? 'amendment' : 'amendments'} to an earlier draft, set aside when the chairs
              chose another —{' '}
              <Link to={RESOLUTION_PAGE} className="font-medium text-teal-700 hover:text-teal-800">
                see them under Amendments
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{title}</p>
      <ol className="mt-1.5 divide-y divide-hairline rounded-card border border-hairline">{children}</ol>
    </div>
  );
}

function Row({
  time,
  title,
  detail,
  countries,
  badge,
}: {
  time: number;
  title: string;
  detail?: string;
  countries: string[];
  badge?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
      <time className="tabular w-14 shrink-0 text-xs text-muted">{formatTimeOfDay(time).slice(0, 5)}</time>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-900">
          <span className="font-medium">{title}</span>
          {badge}
        </p>
        {detail ? <p className="mt-0.5 text-sm text-ink-700">{detail}</p> : null}
        <p className="mt-0.5 text-xs text-muted">
          <SubmitterList countries={countries} />
        </p>
      </div>
    </li>
  );
}
