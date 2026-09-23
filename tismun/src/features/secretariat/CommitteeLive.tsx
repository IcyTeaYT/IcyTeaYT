import { ArrowLeft, Cloud, Laptop } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { AWARDS } from '@/config/awards';
import { EmptyState } from '@/components/ui/EmptyState';
import { MAJORITY_LABEL, MOTION_BY_ID } from '@/config/rules';
import {
  ATTENDANCE_OPTIONS,
  LOG_LABEL,
  RESOLUTION_LABEL,
  type Attendance,
  type LogType,
} from '@/features/chair/types';
import { useLiveSnapshot } from '@/features/live/useLive';
import { cn } from '@/lib/cn';
import { formatTimeOfDay } from '@/lib/time';
import { useCommittee } from '@/store/conference';
import { LiveTimer } from './LiveTimer';

const ATTENDANCE_TONE: Record<Attendance, string> = {
  present: 'text-teal-700',
  'present-voting': 'text-teal-800 font-semibold',
  absent: 'text-ink-300',
};

/**
 * A read-only window onto one committee. Everything here mirrors the chair's
 * own screens; nothing on this page can change what the committee is doing.
 */
export function CommitteeLive() {
  const { committeeId } = useParams<{ committeeId: string }>();
  const committee = useCommittee(committeeId);
  const { data: snapshot, remote, loading } = useLiveSnapshot(committeeId);

  const summary = snapshot?.summary;

  return (
    <PageContainer>
      <Link
        to="/secretariat"
        className="group inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted transition-colors duration-200 hover:text-ink-800"
      >
        <ArrowLeft
          size={15}
          strokeWidth={1.5}
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Conference floor
      </Link>

      <header className="mt-6 flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="label-micro">{committee?.abbreviation ?? committeeId?.toUpperCase()}</p>
            <Badge tone="neutral">Read only</Badge>
            {summary ? <Badge tone="teal">{summary.status}</Badge> : null}
          </div>
          <h1 className="mt-3 font-serif text-[26px] leading-tight text-ink-900 sm:text-[30px]">
            {committee?.name ?? 'Committee'}
          </h1>
          {summary?.detail ? <p className="mt-2 text-sm text-muted">{summary.detail}</p> : null}
        </div>

        <Badge tone={remote ? 'success' : 'neutral'}>
          {remote ? <Cloud size={11} strokeWidth={1.5} /> : <Laptop size={11} strokeWidth={1.5} />}
          {remote ? 'Live' : 'This browser'}
        </Badge>
      </header>

      {!snapshot ? (
        <Card className="mt-6">
          <EmptyState
            title={loading ? 'Loading…' : 'No session reported'}
            body={
              loading
                ? undefined
                : 'This committee’s chair has not opened the dashboard yet, or is working on a device this one cannot see.'
            }
          />
        </Card>
      ) : (
        <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {/* Floor */}
            <Card>
              <CardHeader label="The floor" />
              <CardBody className="flex flex-wrap items-end justify-between gap-6 py-6">
                <div className="min-w-0">
                  <p className="label-micro">
                    {summary?.currentSpeaker ? 'Now speaking' : 'No delegation has the floor'}
                  </p>
                  {summary?.currentSpeaker ? (
                    <div className="mt-3 flex items-center gap-3">
                      <Flag
                        code={summary.currentSpeaker.countryCode}
                        country={summary.currentSpeaker.country}
                        size="lg"
                      />
                      <p className="font-serif text-[24px] leading-tight text-ink-900">
                        {summary.currentSpeaker.country}
                      </p>
                    </div>
                  ) : null}
                  {snapshot.queue.length > 0 ? (
                    <p className="mt-4 text-xs text-muted">
                      Next: {snapshot.queue.map((entry) => entry.country).join(', ')}
                    </p>
                  ) : null}
                </div>

                <div className="text-right">
                  {summary?.primaryTimer ? (
                    <>
                      <p className="label-micro">{summary.primaryTimer.label}</p>
                      <LiveTimer timer={summary.primaryTimer.timer} size="lg" className="mt-2" />
                    </>
                  ) : null}
                  {summary?.secondaryTimer ? (
                    <div className="mt-3">
                      <p className="label-micro">{summary.secondaryTimer.label}</p>
                      <LiveTimer timer={summary.secondaryTimer.timer} size="sm" className="mt-1" />
                    </div>
                  ) : null}
                </div>
              </CardBody>
            </Card>

            {/* Motions */}
            <Card>
              <CardHeader label="Motions" title={`${snapshot.motions.length} raised`} />
              {snapshot.motions.length === 0 ? (
                <EmptyState title="No motions" body="Motions appear here as they are raised." />
              ) : (
                <ul className="divide-y divide-hairline">
                  {snapshot.motions.map((motion) => {
                    const rule = MOTION_BY_ID[motion.type];
                    return (
                      <li key={motion.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        <Badge
                          tone={
                            motion.status === 'passed'
                              ? 'success'
                              : motion.status === 'failed'
                                ? 'danger'
                                : motion.status === 'floor'
                                  ? 'warning'
                                  : 'neutral'
                          }
                        >
                          {motion.status === 'floor' ? 'On the floor' : motion.status}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-900">{rule?.label ?? motion.type}</p>
                          <p className="truncate text-xs text-muted">
                            {motion.votesFor} for, {motion.votesAgainst} against ·{' '}
                            {rule ? MAJORITY_LABEL[rule.majority] : ''}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Resolutions */}
            <Card>
              <CardHeader label="Resolutions" title={`${snapshot.resolutions.length} on file`} />
              {snapshot.resolutions.length === 0 ? (
                <EmptyState title="No draft resolutions" body="Drafts appear here once created." />
              ) : (
                <ul className="divide-y divide-hairline">
                  {snapshot.resolutions.map((resolution) => {
                    const amendments = snapshot.amendments.filter(
                      (amendment) => amendment.resolutionId === resolution.id,
                    );
                    return (
                      <li key={resolution.id} className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-semibold text-ink-900">
                            {resolution.number}
                          </span>
                          <Badge
                            tone={
                              resolution.status === 'passed'
                                ? 'success'
                                : resolution.status === 'failed'
                                  ? 'danger'
                                  : 'neutral'
                            }
                          >
                            {RESOLUTION_LABEL[resolution.status]}
                          </Badge>
                          {amendments.length > 0 ? (
                            <span className="text-xs text-muted">
                              {amendments.length}{' '}
                              {amendments.length === 1 ? 'amendment' : 'amendments'}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-ink-700">
                          {resolution.title}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Log */}
            <Card>
              <CardHeader label="Session log" title={`${snapshot.log.length} recent entries`} />
              {snapshot.log.length === 0 ? (
                <EmptyState title="Nothing logged yet" />
              ) : (
                <ol className="divide-y divide-hairline">
                  {snapshot.log.map((entry) => (
                    <li key={entry.id} className="flex gap-4 px-5 py-3">
                      <time className="tabular w-16 shrink-0 pt-0.5 text-xs text-muted">
                        {formatTimeOfDay(entry.at)}
                      </time>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{LOG_LABEL[entry.type as LogType] ?? entry.type}</Badge>
                          <p className="text-sm text-ink-900">{entry.summary}</p>
                        </div>
                        {entry.detail ? (
                          <p className="mt-1 text-xs leading-relaxed text-muted">{entry.detail}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            {/* Awards */}
            <Card>
              <CardHeader
                label="Awards"
                title={`${summary?.awards?.length ?? 0} of ${AWARDS.length} given`}
              />
              <ul className="divide-y divide-hairline">
                {AWARDS.map((definition) => {
                  const award = summary?.awards?.find((entry) => entry.type === definition.type);
                  return (
                    <li key={definition.type} className="px-5 py-3">
                      <p className="label-micro">{definition.label}</p>
                      {award ? (
                        <div className="mt-2 flex items-center gap-2.5">
                          <Flag code={award.countryCode} country={award.country} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-900">
                              {award.country}
                            </p>
                            {award.delegateName ? (
                              <p className="truncate text-xs text-muted">{award.delegateName}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm text-muted">Not given yet</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>

            {/* Attendance */}
            <Card>
              <CardHeader
                label="Attendance"
                title={summary ? `${summary.present} of ${summary.total} present` : 'Roll'}
                action={
                  summary ? (
                    <Badge tone={summary.quorum ? 'success' : 'danger'}>
                      {summary.quorum ? 'Quorum' : 'No quorum'}
                    </Badge>
                  ) : null
                }
              />
              <ul className="divide-y divide-hairline">
                {snapshot.roster.map((delegation) => (
                  <li key={delegation.id} className="flex items-center gap-3 px-5 py-2">
                    <Flag code={delegation.countryCode} country={delegation.country} size="sm" />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        ATTENDANCE_TONE[delegation.attendance],
                      )}
                    >
                      {delegation.country}
                    </span>
                    <span className="shrink-0 text-[11px] uppercase tracking-label text-muted">
                      {ATTENDANCE_OPTIONS.find((option) => option.value === delegation.attendance)
                        ?.short ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
