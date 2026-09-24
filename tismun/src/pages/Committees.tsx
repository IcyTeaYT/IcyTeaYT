import { motion } from 'framer-motion';
import { Gavel, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { PaperActions } from '@/components/PaperActions';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import { LockedTopic } from '@/components/emergency/ReleaseCountdown';
import { COPY } from '@/config/conference';
import { emergencySession, isEmergency } from '@/config/emergency';
import type { Committee } from '@/data/source/types';
import { useAuth } from '@/store/auth';
import { useConference } from '@/store/conference';
import { useConferenceStatus } from '@/store/conferenceStatus';

export function Committees() {
  const committees = useConference((state) => state.committees);
  const user = useAuth((state) => state.user);
  const day2 = useConferenceStatus((state) => state.status?.day2 ?? false);
  const [query, setQuery] = useState('');

  // An Emergency Session delegate's committee today is the Emergency Session:
  // from Day 2 it leads the list; before that it is marked for Day 2.
  const inEmergency = user?.emergency?.role === 'DELEGATE';
  const badgeFor = (committee: Committee): string | null => {
    if (isEmergency(committee.id) && inEmergency) {
      return day2 ? 'Your committee today' : 'Your Day 2 committee';
    }
    if (committee.id === user?.committeeId) {
      return inEmergency && day2 ? 'Your Day 1 committee' : COPY.committees.yourCommittee;
    }
    return null;
  };

  const ordered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (committee: Committee) =>
      !needle ||
      [committee.name, committee.abbreviation, ...committee.topics, committee.room]
        .join(' ')
        .toLowerCase()
        .includes(needle);

    // The committee the delegate sits in TODAY always leads.
    const today = inEmergency && day2 ? emergencySession.committeeId : user?.committeeId;
    return [...committees].filter(matches).sort((a, b) => {
      const mine = Number(b.id === today) - Number(a.id === today);
      return mine !== 0 ? mine : a.name.localeCompare(b.name);
    });
  }, [committees, query, user?.committeeId, inEmergency, day2]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-micro">Background papers</p>
          <h1 className="mt-2.5 font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">
            {COPY.committees.heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{COPY.committees.subtext}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={COPY.committees.searchPlaceholder}
            aria-label={COPY.committees.searchPlaceholder}
            className="pl-9"
          />
        </div>
      </div>

      {ordered.length === 0 ? (
        <Card className="mt-8">
          <EmptyState
            icon={Search}
            title={COPY.committees.noResults}
            body="Try a shorter search."
          />
        </Card>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {ordered.map((committee, index) => {
            const badge = badgeFor(committee);
            const mine = badge !== null;
            return (
              <motion.div
                key={committee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.28,
                  delay: Math.min(index * 0.04, 0.2),
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Card
                  className={
                    mine ? 'h-full border-teal-200 ring-1 ring-inset ring-teal-100' : 'h-full'
                  }
                >
                  <CardBody className="flex h-full flex-col gap-5 px-6 py-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="label-micro">{committee.abbreviation}</p>
                        <h2 className="mt-2 font-serif text-xl leading-snug text-ink-900">
                          <Link
                            to={`/committees/${committee.id}`}
                            className="rounded transition-colors duration-200 hover:text-teal-700"
                          >
                            {committee.name}
                          </Link>
                        </h2>
                      </div>
                      {badge ? <Badge tone="teal">{badge}</Badge> : null}
                    </div>

                    {committee.locked ? <LockedTopic compact /> : null}

                    <ol className="space-y-2.5">
                      {committee.topics.filter(Boolean).map((topic, topicIndex) => (
                        <li key={topic} className="flex gap-3">
                          <span className="mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums text-teal-600">
                            {String(topicIndex + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm leading-relaxed text-ink-700">{topic}</span>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-auto space-y-4 border-t border-hairline pt-4">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Gavel size={13} strokeWidth={1.5} className="text-ink-400" />
                          {committee.chairs.join(', ') || 'Chairs to be announced'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} strokeWidth={1.5} className="text-ink-400" />
                          {committee.room || 'Room to be announced'}
                        </span>
                      </div>
                      {committee.locked ? null : (
                        <PaperActions
                          committee={committee}
                          size="sm"
                          className="flex flex-wrap gap-2"
                        />
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
