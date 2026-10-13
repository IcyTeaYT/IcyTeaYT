import {
  AlertTriangle,
  Eye,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@/components/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { dataSource } from '@/data/source';
import type { ActivityEvent, ActivityKind, ActivityLog as Log, Presence } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { useConference } from '@/store/conference';

/**
 * The owners' sign-in log: who is on the site right now, and every sign-in,
 * sign-out, return visit and turned-away sign-in. The server only answers for
 * accounts in OWNER_EMAILS; nobody else, the Secretariat included, can read it.
 */

const REFRESH_MS = 15_000;
/** Seen within this long counts as online. The page beats every two minutes. */
const ONLINE_MS = 3 * 60 * 1000;

type Filter = 'all' | 'sign-in' | 'visit' | 'denied';

const KIND: Record<ActivityKind, { verb: string; icon: LucideIcon; tone: string }> = {
  'sign-in': { verb: 'signed in', icon: LogIn, tone: 'bg-teal-50 text-teal-700' },
  visit: { verb: 'opened the site', icon: Eye, tone: 'bg-ink-50 text-ink-500' },
  'sign-out': { verb: 'signed out', icon: LogOut, tone: 'bg-ink-50 text-ink-500' },
  denied: { verb: 'tried to sign in — not on the roster', icon: ShieldAlert, tone: 'bg-warning-soft text-warning' },
};

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

const timeOf = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function dayLabel(at: number, now: number): string {
  const day = new Date(at);
  const today = new Date(now);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(today) - start(day)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

const startOfToday = (now: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** The sign-in log. `embedded`: a section of the Owner tab rather than a page of its own. */
export function ActivityLog({ embedded = false }: { embedded?: boolean }) {
  const committees = useConference((state) => state.committees);
  const [log, setLog] = useState<Log | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setLog(await dataSource.getActivity());
      setFailed(null);
    } catch (error) {
      setFailed(
        (error as { status?: number }).status === 403
          ? 'The sign-in log is only for the site owner.'
          : 'The sign-in log could not be loaded. It will try again shortly.',
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  /** "Chair · GA 2", "France · GA 3", "Secretariat". */
  const roleLine = useCallback(
    (entry: Pick<ActivityEvent, 'role' | 'committeeId' | 'country'>): string | null => {
      const committee = entry.committeeId
        ? (committees.find((c) => c.id === entry.committeeId)?.abbreviation ?? entry.committeeId.toUpperCase())
        : null;
      const role = (entry.role ?? '').toUpperCase();
      if (role === 'SECRETARIAT' || role === 'ADMIN') return 'Secretariat';
      if (role === 'CHAIR') return ['Chair', committee].filter(Boolean).join(' · ');
      return [entry.country, committee].filter(Boolean).join(' · ') || null;
    },
    [committees],
  );

  const now = log?.now ?? Date.now();
  const online = useMemo(
    () => (log?.presence ?? []).filter((p) => now - p.lastSeen < ONLINE_MS),
    [log, now],
  );

  const today = startOfToday(now);
  const todayEvents = (log?.events ?? []).filter((e) => e.at >= today);
  const visitorsToday = new Set(todayEvents.filter((e) => e.kind !== 'denied').map((e) => e.email)).size;
  const deniedToday = todayEvents.filter((e) => e.kind === 'denied').length;

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (log?.events ?? []).filter((e) => {
      if (filter !== 'all' && e.kind !== filter && !(filter === 'sign-in' && e.kind === 'sign-out')) return false;
      if (!q) return true;
      return [e.name, e.email, e.country, e.committeeId, e.device].some((v) => v?.toLowerCase().includes(q));
    });
  }, [log, filter, query]);

  // Group consecutive events by day, newest first.
  const groups = useMemo(() => {
    const out: { label: string; items: ActivityEvent[] }[] = [];
    for (const event of events) {
      const label = dayLabel(event.at, now);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(event);
      else out.push({ label, items: [event] });
    }
    return out;
  }, [events, now]);

  const Wrap = embedded ? 'section' : PageContainer;
  return (
    <Wrap>
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="label-micro">Owner</p>
          {embedded ? (
            <h2 className="mt-2.5 font-serif text-[24px] leading-tight text-ink-900">Sign-in log</h2>
          ) : (
            <h1 className="mt-2.5 font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">Sign-in log</h1>
          )}
          <p className="mt-2 text-sm text-muted">
            Who is on the site right now, and every sign-in. Only you can see this.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge tone="success">Updates every 15 s</Badge>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors duration-200 hover:text-teal-700"
          >
            <RefreshCw size={12} strokeWidth={1.5} className={cn(refreshing && 'animate-spin')} />
            Refresh now
          </button>
        </div>
      </header>

      {failed || (log && !log.available) ? (
        <div className="mt-6 flex items-start gap-3 rounded-card border border-warning-border bg-warning-soft px-4 py-3.5">
          <AlertTriangle size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-sm text-warning">
            {failed ??
              (log?.error
                ? `The log's database is not working: ${log.error}`
                : 'Sign-ins are recorded in the live-sync database (the DB binding), which this deployment does not have.')}
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <Stat label="Online now" value={online.length} />
        <Stat label="On the site today" value={visitorsToday} />
        <Stat label="Turned away today" value={deniedToday} warn={deniedToday > 0} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="self-start">
          <CardHeader label="Right now" title="Online" />
          {online.length ? (
            <ul className="divide-y divide-hairline">
              {online.map((person) => (
                <OnlineRow key={person.email} person={person} now={now} role={roleLine(person)} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="Nobody online" body="People show here while they have the site open." />
          )}
        </Card>

        <Card>
          <CardHeader
            label="Last 30 days"
            title="Activity"
            className="flex-col items-stretch gap-3 sm:flex-row sm:items-start"
            action={
              <Segmented<Filter>
                name="Show"
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'sign-in', label: 'Sign-ins' },
                  { value: 'visit', label: 'Visits' },
                  { value: 'denied', label: 'Turned away' },
                ]}
              />
            }
          />
          <div className="border-b border-hairline px-5 py-3">
            <label className="relative block">
              <span className="sr-only">Search the log</span>
              <Search
                size={15}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a name, email, country or committee"
                className="pl-9"
              />
            </label>
          </div>
          {!log && !failed ? (
            <CardBody className="text-sm text-muted">Loading…</CardBody>
          ) : groups.length ? (
            <div>
              {groups.map((group) => (
                <section key={group.label}>
                  <h3 className="label-micro bg-canvas px-5 py-2">{group.label}</h3>
                  <ul className="divide-y divide-hairline">
                    {group.items.map((event) => (
                      <EventRow key={event.id} event={event} now={now} role={roleLine(event)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={LogIn}
              title={query || filter !== 'all' ? 'Nothing matches' : 'No sign-ins yet'}
              body={query || filter !== 'all' ? 'Try another search or filter.' : 'Sign-ins appear here as they happen.'}
            />
          )}
        </Card>
      </div>
    </Wrap>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p className="label-micro">{label}</p>
        <p className={cn('mt-1.5 font-serif text-[28px] leading-none', warn ? 'text-warning' : 'text-ink-900')}>
          {value}
        </p>
      </CardBody>
    </Card>
  );
}

function OnlineRow({ person, now, role }: { person: Presence; now: number; role: string | null }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">{person.name ?? person.email}</p>
        <p className="truncate text-xs text-muted">
          {[role, person.device].filter(Boolean).join(' · ') || person.email}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted">{ago(now - person.lastSeen)}</span>
    </li>
  );
}

function EventRow({ event, now, role }: { event: ActivityEvent; now: number; role: string | null }) {
  const kind = KIND[event.kind] ?? KIND.visit;
  const Icon = kind.icon;
  const who = event.name ?? event.email;
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control', kind.tone)}>
        <Icon size={15} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-800">
          <span className="font-medium text-ink-900">{who}</span> {kind.verb}
        </p>
        <p className="mt-0.5 break-words text-xs text-muted">
          {[role, event.name ? event.email : null, event.device].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium tabular-nums text-ink-700">{timeOf(event.at)}</p>
        <p className="text-[11px] text-muted">{ago(now - event.at)}</p>
      </div>
    </li>
  );
}
