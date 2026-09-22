import { AlertTriangle, ArrowRight, Cloud, Laptop } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LOG_LABEL, type LogType } from '@/features/chair/types';
import { useLiveOverview } from '@/features/live/useLive';
import { STALE_AFTER_MS, type LiveSummary } from '@/features/live/types';
import { cn } from '@/lib/cn';
import { formatTimeOfDay } from '@/lib/time';
import { useAuth } from '@/store/auth';
import { useConference } from '@/store/conference';
import { LiveTimer } from './LiveTimer';

const STATUS_TONE: Record<string, 'neutral' | 'teal' | 'warning'> = {
  'Not in session': 'neutral',
  'In session': 'teal',
  'General Speakers’ List': 'teal',
  'Moderated caucus': 'teal',
  'Unmoderated caucus': 'teal',
  'Voting procedure': 'warning',
};

const LOG_TONE: Record<LogType, 'neutral' | 'teal' | 'warning' | 'success'> = {
  session: 'neutral',
  'roll-call': 'teal',
  speaker: 'neutral',
  caucus: 'teal',
  motion: 'warning',
  resolution: 'neutral',
  vote: 'success',
};

export function SecretariatDashboard() {
  const user = useAuth((state) => state.user);
  const committees = useConference((state) => state.committees);
  const committeeIds = useMemo(() => committees.map((c) => c.id), [committees]);
  const { data, remote, loading } = useLiveOverview(committeeIds);

  const byId = useMemo(() => new Map(committees.map((c) => [c.id, c])), [committees]);
  const summaries = useMemo(() => {
    const seen = new Map(data?.committees.map((s) => [s.committeeId, s]) ?? []);
    // Show every committee, reporting or not — an empty room is information.
    return committees.map((committee) => ({
      committee,
      summary: seen.get(committee.id) ?? null,
    }));
  }, [committees, data]);

  const reporting = summaries.filter((entry) => entry.summary).length;

  return (
    <PageContainer>
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="label-micro">{user?.title ?? 'Secretariat'}</p>
          <h1 className="mt-2.5 font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">
            Conference floor
          </h1>
          <p className="mt-2 text-sm text-muted">
            Every committee, as it stands right now. Refreshes every two seconds.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge tone={remote ? 'success' : 'neutral'}>
            {remote ? <Cloud size={11} strokeWidth={1.5} /> : <Laptop size={11} strokeWidth={1.5} />}
            {remote ? 'Live across devices' : 'This browser only'}
          </Badge>
          <p className="text-xs text-muted">
            {reporting} of {committees.length} committees reporting
          </p>
        </div>
      </header>

      {!remote && !loading ? (
        // A configured-but-broken database is a different problem from no
        // database at all, and the chair setting it up needs to be told which.
        <div
          className={cn(
            'mt-6 flex items-start gap-3 rounded-card border px-4 py-3.5',
            data?.error ? 'border-warning-border bg-warning-soft' : 'border-hairline bg-canvas',
          )}
        >
          {data?.error ? (
            <AlertTriangle size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" />
          ) : (
            <Laptop size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-400" />
          )}
          <div>
            <p className={cn('text-sm font-medium', data?.error ? 'text-warning' : 'text-ink-800')}>
              {data?.error ? 'Live sync is not working' : 'Showing this browser only'}
            </p>
            <p className={cn('mt-0.5 text-sm', data?.error ? 'text-warning' : 'text-muted')}>
              {data?.error ?? (
                <>
                  No live-sync database is bound, so committees running on other devices cannot be
                  seen. Bind a D1 database named{' '}
                  <code className="rounded bg-ink-50 px-1 text-[12px]">DB</code> in the Cloudflare
                  dashboard to watch the whole conference.
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {summaries.map(({ committee, summary }) => (
          <CommitteeCard
            key={committee.id}
            id={committee.id}
            name={committee.name}
            abbreviation={committee.abbreviation}
            room={committee.room}
            summary={summary}
            serverNow={data?.serverNow ?? Date.now()}
          />
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl text-ink-900">Combined session log</h2>
          <p className="text-xs text-muted">Every committee, newest first</p>
        </div>

        <Card className="mt-4">
          {!data || data.log.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              body="Roll calls, motions, caucuses, resolutions and votes from every committee appear here as they happen."
            />
          ) : (
            <ol className="divide-y divide-hairline">
              {data.log.map((entry) => (
                <li key={`${entry.committeeId}-${entry.id}`} className="flex gap-4 px-5 py-3">
                  <time className="tabular w-16 shrink-0 pt-0.5 text-xs text-muted">
                    {formatTimeOfDay(entry.at)}
                  </time>
                  <Link
                    to={`/secretariat/${entry.committeeId}`}
                    className="w-20 shrink-0 pt-0.5 text-xs font-semibold text-teal-700 hover:underline"
                  >
                    {byId.get(entry.committeeId)?.abbreviation ?? entry.committeeId.toUpperCase()}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={LOG_TONE[entry.type as LogType] ?? 'neutral'}>
                        {LOG_LABEL[entry.type as LogType] ?? entry.type}
                      </Badge>
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
      </section>
    </PageContainer>
  );
}

function CommitteeCard({
  id,
  name,
  abbreviation,
  room,
  summary,
  serverNow,
}: {
  id: string;
  name: string;
  abbreviation: string;
  room: string;
  summary: LiveSummary | null;
  serverNow: number;
}) {
  const stale = summary ? serverNow - summary.updatedAt > STALE_AFTER_MS : false;

  return (
    <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-raised">
      {/* Label and status share a row so the committee's name can run the full
          width of the card — squeezed beside a status badge, "United Nations
          Security Council" breaks across four lines. */}
      <div className="border-b border-hairline px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="label-micro">{abbreviation}</p>
          {summary ? (
            <Badge tone={STATUS_TONE[summary.status] ?? 'neutral'}>{summary.status}</Badge>
          ) : (
            <Badge tone="neutral">No report</Badge>
          )}
        </div>
        <h3 className="mt-2 font-serif text-lg leading-snug text-ink-900">
          <Link to={`/secretariat/${id}`} className="transition-colors duration-200 hover:text-teal-700">
            {name}
          </Link>
        </h3>
      </div>

      <CardBody className="flex flex-1 flex-col gap-5 py-5">
        {!summary ? (
          <p className="text-sm text-muted">
            This committee has not reported a session yet. {room}.
          </p>
        ) : (
          <>
            {stale ? (
              <p className="flex items-center gap-2 rounded-control border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning">
                <AlertTriangle size={13} strokeWidth={1.5} />
                Last heard from {Math.round((serverNow - summary.updatedAt) / 1000)}s ago
              </p>
            ) : null}

            {summary.detail ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-ink-700">{summary.detail}</p>
            ) : null}

            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="label-micro">
                  {summary.currentSpeaker ? 'Now speaking' : 'No delegation has the floor'}
                </p>
                {summary.currentSpeaker ? (
                  <p className="mt-2 flex items-center gap-2">
                    <Flag
                      code={summary.currentSpeaker.countryCode}
                      country={summary.currentSpeaker.country}
                      size="md"
                    />
                    <span className="truncate font-serif text-lg text-ink-900">
                      {summary.currentSpeaker.country}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                {summary.primaryTimer ? (
                  <>
                    <p className="label-micro">{summary.primaryTimer.label}</p>
                    <LiveTimer timer={summary.primaryTimer.timer} className="mt-1.5" />
                  </>
                ) : null}
                {summary.secondaryTimer ? (
                  <p className="mt-2 flex items-baseline justify-end gap-1.5 text-xs text-muted">
                    {summary.secondaryTimer.label}
                    <LiveTimer timer={summary.secondaryTimer.timer} size="sm" />
                  </p>
                ) : null}
              </div>
            </div>

            {summary.voteSubject ? (
              <p className="rounded-control border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning">
                Voting on {summary.voteSubject}
              </p>
            ) : null}

            <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-4 text-center">
              <div>
                <dt className="label-micro">Present</dt>
                <dd
                  className={cn(
                    'tabular mt-1 text-sm font-semibold',
                    summary.quorum ? 'text-ink-900' : 'text-danger',
                  )}
                >
                  {summary.present}
                  <span className="font-normal text-muted"> / {summary.total}</span>
                </dd>
                <dd className="mt-0.5 text-[11px] text-muted">
                  {summary.quorum ? 'Quorum' : 'No quorum'}
                </dd>
              </div>
              <div>
                <dt className="label-micro">Motions</dt>
                <dd className="tabular mt-1 text-sm font-semibold text-ink-900">
                  {summary.motionsOnFloor}
                </dd>
                <dd className="mt-0.5 text-[11px] text-muted">on the floor</dd>
              </div>
              <div>
                <dt className="label-micro">Drafts</dt>
                <dd className="tabular mt-1 text-sm font-semibold text-ink-900">
                  {summary.resolutionCount}
                </dd>
                <dd className="mt-0.5 text-[11px] text-muted">resolutions</dd>
              </div>
            </dl>
          </>
        )}

        <Link
          to={`/secretariat/${id}`}
          className="group mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          Open committee
          <ArrowRight
            size={14}
            strokeWidth={1.5}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </CardBody>
    </Card>
  );
}
