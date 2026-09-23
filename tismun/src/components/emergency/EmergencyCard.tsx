import { ArrowRight, Gavel, MapPin, Siren, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Flag } from '@/components/Flag';
import { PaperActions } from '@/components/PaperActions';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import type { Committee, User } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { useConferenceStatus } from '@/store/conferenceStatus';
import { DelegationPanel, useMyDelegation } from './DelegationPanel';
import { LockedTopic } from './ReleaseCountdown';

/**
 * The Emergency Session, as its delegates see it: where and with whom, what it
 * is about once that is released, and the delegation they sit in. On Day 2 it
 * is the delegate's main card; before that it waits below their Day 1
 * committee.
 */
export function EmergencyCard({
  committee,
  user,
  primary,
}: {
  committee: Committee;
  user: User;
  primary: boolean;
}) {
  const newlyReleased = useConferenceStatus((state) => state.newlyReleased);
  const delegate = user.emergency?.role === 'DELEGATE';
  const { delegation } = useMyDelegation(delegate);
  const topics = committee.topics.filter(Boolean);

  return (
    <Card
      className={cn(
        primary && 'border-teal-200 ring-1 ring-inset ring-teal-100',
        newlyReleased && !committee.locked && 'ring-2 ring-teal-300',
      )}
    >
      <CardBody
        className={cn(
          'grid gap-6 px-6',
          primary
            ? 'py-7 lg:grid-cols-[minmax(0,1fr)_340px]'
            : 'py-6 lg:grid-cols-[minmax(0,1fr)_320px]',
        )}
      >
        <div className="min-w-0 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-teal-50 text-teal-700">
                <Siren size={16} strokeWidth={1.5} />
              </span>
              <p className="label-micro">{committee.abbreviation || 'Emergency Session'}</p>
              {newlyReleased && !committee.locked ? (
                <Badge tone="teal">
                  <Sparkles size={11} strokeWidth={1.5} />
                  New
                </Badge>
              ) : null}
            </div>
            <h2
              className={cn(
                'mt-3 font-serif leading-tight text-ink-900',
                primary ? 'text-[26px] sm:text-[30px]' : 'text-[22px]',
              )}
            >
              <Link
                to={`/committees/${committee.id}`}
                className="transition-colors duration-200 hover:text-teal-700"
              >
                {committee.name}
              </Link>
            </h2>
          </div>

          {delegate && user.emergency?.country ? (
            <div className="flex items-center gap-3">
              <Flag code={user.emergency.countryCode} country={user.emergency.country} size="lg" />
              <div>
                <p className="label-micro">Your country</p>
                <p className="mt-1 font-serif text-xl text-ink-900">{user.emergency.country}</p>
              </div>
            </div>
          ) : null}

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
            <div className="flex items-center gap-2">
              <MapPin size={15} strokeWidth={1.5} className="shrink-0 text-ink-400" />
              <dt className="sr-only">Room</dt>
              <dd>{committee.room}</dd>
            </div>
            {committee.chairs.length > 0 ? (
              <div className="flex items-center gap-2">
                <Gavel size={15} strokeWidth={1.5} className="shrink-0 text-ink-400" />
                <dt className="sr-only">Chairs</dt>
                <dd>{committee.chairs.join(', ')}</dd>
              </div>
            ) : null}
          </dl>

          {committee.locked ? (
            <LockedTopic />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {topics.map((topic, index) => (
                  <div key={topic} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums text-teal-600">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[15px] font-medium leading-relaxed text-ink-900">{topic}</p>
                  </div>
                ))}
              </div>
              {committee.description ? (
                <p className="text-sm leading-relaxed text-muted">{committee.description}</p>
              ) : null}
              <PaperActions committee={committee} className="flex flex-wrap gap-2" />
            </div>
          )}

          {!primary ? (
            <Link
              to={`/committees/${committee.id}`}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              Open the Emergency Session
              <ArrowRight
                size={14}
                strokeWidth={1.5}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          ) : null}
        </div>

        {delegate ? (
          delegation ? (
            <DelegationPanel delegation={delegation} room={committee.room} className="self-start" />
          ) : (
            <div className="self-start rounded-card border border-hairline px-5 py-4 text-sm text-muted">
              Loading your delegation…
            </div>
          )
        ) : null}
      </CardBody>
    </Card>
  );
}
