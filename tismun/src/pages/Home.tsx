import { motion } from 'framer-motion';
import {
  ArrowRight,
  DoorOpen,
  FileText,
  Gavel,
  Landmark,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { ConferenceCountdown } from '@/components/ConferenceCountdown';
import { EmergencyCard } from '@/components/emergency/EmergencyCard';
import { GlobeLines } from '@/components/GlobeLines';
import { PaperActions } from '@/components/PaperActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CONFERENCE, COPY } from '@/config/conference';
import { emergencySession } from '@/config/emergency';
import { firstNameOf } from '@/data/source';
import type { Committee, User } from '@/data/source/types';
import { formatDateRange } from '@/lib/conferenceDates';
import { isSecretariat, useAuth } from '@/store/auth';
import { useCommittee, useConference } from '@/store/conference';
import { useConferenceStatus } from '@/store/conferenceStatus';

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function Home() {
  const user = useAuth((state) => state.user);
  const committee = useCommittee(user?.committeeId);
  const emergency = useCommittee(emergencySession.committeeId);
  const day2 = useConferenceStatus((state) => state.status?.day2 ?? false);

  if (!user) return null;

  const emergencyDelegate = user.emergency?.role === 'DELEGATE' && emergency !== null;
  // From Day 2, an Emergency Session delegate's day is the Emergency Session:
  // it leads, and their Day 1 committee steps back.
  const focus = emergencyDelegate && day2 && emergency !== null;

  return (
    <>
      {/* Welcome header, with the globe motif reading as texture behind it. */}
      <div className="relative isolate overflow-hidden border-b border-hairline">
        <GlobeLines className="absolute -right-20 -top-40 -z-10 h-[420px] w-[420px] opacity-[0.06] sm:-right-10 sm:h-[520px] sm:w-[520px]" />
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-14">
          <motion.div className="flex flex-wrap items-center justify-between gap-4" {...enter(0)}>
            <p className="label-micro">
              {CONFERENCE.edition} · {formatDateRange()}
            </p>
            <ConferenceCountdown />
          </motion.div>
          <motion.h1
            className="mt-3 max-w-2xl font-serif text-[28px] leading-[1.2] text-ink-900 sm:text-[38px]"
            {...enter(0.05)}
          >
            {focus ? 'Day 2 — Emergency Session' : COPY.home.greeting(firstNameOf(user))}
          </motion.h1>
          <motion.p className="mt-3 max-w-xl text-sm text-muted sm:text-base" {...enter(0.1)}>
            {focus
              ? `Good morning, ${firstNameOf(user)}. The Emergency Session is your committee today.`
              : COPY.home.subtext}
          </motion.p>
        </div>
      </div>

      <PageContainer>
        {focus && emergency ? (
          <>
            <motion.div {...enter(0.14)}>
              <EmergencyCard committee={emergency} user={user} primary />
            </motion.div>
            {committee ? (
              <motion.section className="mt-10" {...enter(0.2)}>
                <h2 className="label-micro">Your Day 1 committee</h2>
                <Day1Compact committee={committee} user={user} />
              </motion.section>
            ) : null}
          </>
        ) : (
          <>
            <Day1Home user={user} committee={committee} emergencyDelegate={emergencyDelegate} />
            {emergencyDelegate && emergency ? (
              <motion.section className="mt-10" {...enter(0.3)}>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-xl text-ink-900">Day 2 — Emergency Session</h2>
                  <p className="text-xs text-muted">Friday 16 October</p>
                </div>
                <EmergencyCard committee={emergency} user={user} primary={false} />
              </motion.section>
            ) : null}
          </>
        )}

        {committee || isSecretariat(user) || emergencyDelegate ? (
          <motion.div className="mt-8" {...enter(0.32)}>
            <Link
              to="/committees"
              className="group inline-flex items-center gap-2 rounded-control text-sm font-medium text-teal-700 transition-colors duration-200 hover:text-teal-800"
            >
              <DoorOpen size={15} strokeWidth={1.5} />
              Browse every committee and background paper
              <ArrowRight
                size={15}
                strokeWidth={1.5}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>
        ) : null}
      </PageContainer>
    </>
  );
}

/** What a delegate or chair sees for Day 1: their committee, delegation and paper. */
function Day1Home({
  user,
  committee,
  emergencyDelegate,
}: {
  user: User;
  committee: Committee | null;
  emergencyDelegate: boolean;
}) {
  const committeesLoaded = useConference((state) => state.loaded);
  const navigate = useNavigate();
  const isChair = user.role === 'CHAIR';

  // Someone only in the Emergency Session has no Day 1 committee to show.
  if (!committee && !user.committeeId && emergencyDelegate && !isSecretariat(user)) return null;

  return (
    <>
      {isSecretariat(user) ? (
        <Card className="max-w-xl">
          <CardHeader label="Your role" title={user.title ?? 'Secretariat'} />
          <CardBody className="space-y-5 py-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-teal-50 text-teal-600">
              <Landmark size={22} strokeWidth={1.5} />
            </span>
            <p className="text-sm leading-relaxed text-muted">
              The conference floor shows every committee as it stands right now — status, timers,
              attendance and quorum, motions, resolutions, and a combined session log.
            </p>
            <Button variant="primary" onClick={() => navigate('/secretariat')}>
              Open the conference floor
              <ArrowRight size={15} strokeWidth={1.5} />
            </Button>
          </CardBody>
        </Card>
      ) : !committee && user.committeeId && !committeesLoaded ? (
        <Card className="max-w-xl">
          <CardBody className="flex items-center gap-3 px-6 py-7 text-sm text-muted">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            Loading your committee…
          </CardBody>
        </Card>
      ) : !committee ? (
        <Card className="max-w-xl">
          <CardBody className="px-6 py-7">
            <h2 className="font-serif text-lg text-ink-900">{COPY.home.unassignedTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{COPY.home.unassignedBody}</p>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => {
                window.location.href = `mailto:${CONFERENCE.secretariatEmail}`;
              }}
            >
              Email the Secretariat
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Committee */}
          <motion.div className="md:col-span-2 lg:col-span-1" {...enter(0.14)}>
            <Card className="h-full">
              <CardHeader label="Committee" title={committee.abbreviation} />
              <CardBody className="space-y-5 py-5">
                <p className="font-serif text-lg leading-snug text-ink-900">{committee.name}</p>

                <div className="space-y-3">
                  {committee.topics.map((topic, index) => (
                    <div key={topic} className="flex gap-3">
                      <span className="mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums text-teal-600">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="text-sm leading-relaxed text-ink-700">{topic}</p>
                    </div>
                  ))}
                </div>

                <dl className="space-y-2.5 border-t border-hairline pt-4 text-sm">
                  <div className="flex items-center gap-2.5 text-ink-700">
                    <MapPin size={15} strokeWidth={1.5} className="shrink-0 text-ink-400" />
                    <dt className="sr-only">Room</dt>
                    <dd>{committee.room}</dd>
                  </div>
                  <div className="flex items-start gap-2.5 text-ink-700">
                    <Gavel size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-400" />
                    <dt className="sr-only">Chairs</dt>
                    <dd>{committee.chairs.join(', ')}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </motion.div>

          {/* Delegation, or the chair's own card */}
          <motion.div {...enter(0.2)}>
            {isChair ? (
              <Card className="flex h-full flex-col">
                <CardHeader label="Your role" title="Chair" />
                <CardBody className="flex flex-1 flex-col justify-between gap-6 py-6">
                  <div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-teal-50 text-teal-600">
                      <Gavel size={22} strokeWidth={1.5} />
                    </span>
                    <p className="mt-4 text-sm leading-relaxed text-muted">
                      You are chairing {committee.abbreviation}. The dashboard runs roll call,
                      timers, motions, resolutions and voting for your committee.
                    </p>
                  </div>
                  <Button variant="primary" onClick={() => navigate('/chair')}>
                    Open Chair Dashboard
                    <ArrowRight size={15} strokeWidth={1.5} />
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <Card className="flex h-full flex-col">
                {/* The ISO code keeps this header the same height as its
                    neighbours', so the three cards' rules align. */}
                <CardHeader label="Delegation" title={user.countryCode ?? '—'} />
                <CardBody className="flex flex-1 flex-col justify-center py-8">
                  <Flag code={user.countryCode} country={user.country} size="xl" />
                  <p className="mt-5 font-serif text-[26px] leading-tight text-ink-900">
                    {user.country}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <Users size={14} strokeWidth={1.5} />
                    Represented by {user.fullName}
                  </p>
                </CardBody>
              </Card>
            )}
          </motion.div>

          {/* Background paper */}
          <motion.div {...enter(0.26)}>
            <Card className="flex h-full flex-col">
              <CardHeader
                label="Background paper"
                title={committee.abbreviation}
                action={<Badge tone="teal">PDF</Badge>}
              />
              <CardBody className="flex flex-1 flex-col justify-between gap-6 py-5">
                <div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-ink-50 text-ink-400">
                    <FileText size={18} strokeWidth={1.5} />
                  </span>
                  <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-muted">
                    {committee.description}
                  </p>
                </div>
                <PaperActions committee={committee} className="flex flex-wrap gap-2" />
              </CardBody>
            </Card>
          </motion.div>
        </div>
      )}
    </>
  );
}

/** The Day 1 committee, stepped back on Day 2: still there, paper and all. */
function Day1Compact({ committee, user }: { committee: Committee; user: User }) {
  return (
    <Card className="mt-3">
      <CardBody className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {user.role === 'DELEGATE' && user.country ? (
            <Flag code={user.countryCode} country={user.country} size="md" />
          ) : (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ink-50 text-ink-400">
              <Gavel size={16} strokeWidth={1.5} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">
              {committee.name}
              {user.role === 'DELEGATE' && user.country ? ` · ${user.country}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {user.role === 'CHAIR' ? 'You chaired this committee' : committee.abbreviation} ·{' '}
              {committee.room}
            </p>
          </div>
        </div>
        <PaperActions committee={committee} size="sm" className="flex shrink-0 flex-wrap gap-2" />
      </CardBody>
    </Card>
  );
}
