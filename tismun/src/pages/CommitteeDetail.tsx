import { motion } from 'framer-motion';
import { ArrowLeft, Download, ExternalLink, Gavel, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  AllDelegations,
  DelegationPanel,
  useMyDelegation,
} from '@/components/emergency/DelegationPanel';
import { LockedTopic } from '@/components/emergency/ReleaseCountdown';
import { COPY } from '@/config/conference';
import { isEmergency } from '@/config/emergency';
import { isSecretariat, useAuth } from '@/store/auth';
import { useCommittee, useConference } from '@/store/conference';
import { useConferenceStatus } from '@/store/conferenceStatus';

export function CommitteeDetail() {
  const { id } = useParams<{ id: string }>();
  const committee = useCommittee(id);
  const loaded = useConference((state) => state.loaded);
  const user = useAuth((state) => state.user);
  const day2 = useConferenceStatus((state) => state.status?.day2 ?? false);
  const emergency = isEmergency(id);
  const emergencyDelegate = emergency && user?.emergency?.role === 'DELEGATE';
  // The Emergency Session's chairs and the Secretariat see every delegation.
  const seesAllDelegations =
    emergency && (user?.emergency?.role === 'CHAIR' || isSecretariat(user));
  const { delegation } = useMyDelegation(emergencyDelegate);

  if (!committee) {
    return (
      <PageContainer>
        <Card className="max-w-xl">
          <EmptyState
            title={loaded ? 'Committee not found' : 'Loading committee…'}
            body={loaded ? 'That committee is not part of this year’s conference.' : undefined}
            action={
              loaded ? (
                <Link
                  to="/committees"
                  className="rounded text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  Back to all committees
                </Link>
              ) : undefined
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const mine = committee.id === user?.committeeId || emergencyDelegate;
  const badge = emergencyDelegate
    ? day2
      ? 'Your committee today'
      : 'Your Day 2 committee'
    : COPY.committees.yourCommittee;
  const url = committee.backgroundPaperUrl;
  const topics = committee.topics.filter(Boolean);

  return (
    <PageContainer>
      <Link
        to="/committees"
        className="group inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted transition-colors duration-200 hover:text-ink-800"
      >
        <ArrowLeft
          size={15}
          strokeWidth={1.5}
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        All committees
      </Link>

      <motion.header
        className="mt-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="label-micro">{committee.abbreviation}</p>
          {mine ? <Badge tone="teal">{badge}</Badge> : null}
        </div>
        <h1 className="mt-3 max-w-3xl font-serif text-[28px] leading-[1.2] text-ink-900 sm:text-[34px]">
          {committee.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Gavel size={14} strokeWidth={1.5} className="text-ink-400" />
            {committee.chairs.join(', ')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} strokeWidth={1.5} className="text-ink-400" />
            {committee.room}
          </span>
        </div>
      </motion.header>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 space-y-6 lg:order-1">
          {committee.locked ? (
            <Card>
              <CardHeader label="Background paper" title={committee.abbreviation} />
              <CardBody className="py-5">
                <LockedTopic />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader
                label="Background paper"
                title={committee.abbreviation}
                action={
                  url ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink size={15} strokeWidth={1.5} />
                        New tab
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          window.location.href = url;
                        }}
                      >
                        <Download size={15} strokeWidth={1.5} />
                        {COPY.paper.download}
                      </Button>
                    </>
                  ) : null
                }
              />
              {url ? (
                <div className="h-[560px] bg-ink-50 sm:h-[720px]">
                  <iframe
                    src={`${url}#view=FitH`}
                    title={`${committee.name} — background paper`}
                    className="h-full w-full border-0"
                  />
                </div>
              ) : (
                <EmptyState title="Not published yet" body={COPY.paper.missing} />
              )}
            </Card>
          )}

          {seesAllDelegations ? (
            <Card>
              <CardHeader label="Delegations" title="Every country in the Emergency Session" />
              <CardBody className="py-5">
                <AllDelegations />
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          {emergencyDelegate && delegation ? (
            <DelegationPanel delegation={delegation} room={committee.room} />
          ) : null}

          {topics.length > 0 ? (
            <Card>
              <CardHeader label={topics.length === 1 ? 'Topic' : 'Topics'} />
              <CardBody className="space-y-4 py-5">
                {topics.map((topic, index) => (
                  <div key={topic} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums text-teal-600">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm leading-relaxed text-ink-800">{topic}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {committee.description ? (
            <Card>
              <CardHeader label="About this committee" />
              <CardBody className="py-5">
                <p className="text-sm leading-relaxed text-ink-700">{committee.description}</p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
