import { MapPin, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { dataSource } from '@/data/source';
import type { DelegationMember, EmergencyDelegation } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { useConference } from '@/store/conference';

/** The signed-in delegate's own Emergency Session delegation, from the server. */
export function useMyDelegation(enabled: boolean): {
  delegation: EmergencyDelegation | null;
  loading: boolean;
} {
  const [delegation, setDelegation] = useState<EmergencyDelegation | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    dataSource
      .getMyDelegation()
      .then((result) => {
        if (!cancelled) setDelegation(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { delegation, loading };
}

/** "GA 2", or "Chair, GA 2" — where a teammate spends Day 1. */
function useDay1Label(): (member: DelegationMember) => string {
  const committees = useConference((state) => state.committees);
  return (member) => {
    if (member.day1Role === 'SECRETARIAT') return 'Secretariat';
    const abbreviation =
      committees.find((committee) => committee.id === member.day1CommitteeId)?.abbreviation ??
      member.day1CommitteeId?.toUpperCase() ??
      '';
    if (!abbreviation) return '';
    return member.day1Role === 'CHAIR' ? `Chair, ${abbreviation}` : abbreviation;
  };
}

function MemberList({ members }: { members: DelegationMember[] }) {
  const day1 = useDay1Label();
  return (
    <ul className="divide-y divide-hairline">
      {members.map((member) => (
        <li
          key={`${member.fullName}-${member.day1CommitteeId}`}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'truncate text-sm',
                member.you ? 'font-semibold text-ink-900' : 'text-ink-800',
              )}
            >
              {member.fullName}
            </span>
            {member.you ? <Badge tone="teal">You</Badge> : null}
          </span>
          <span className="shrink-0 text-xs text-muted">{day1(member)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Your delegation": the country, large, and the people representing it
 * together — names and Day 1 committees only, never an email address.
 */
export function DelegationPanel({
  delegation,
  room,
  className,
}: {
  delegation: EmergencyDelegation;
  room: string;
  className?: string;
}) {
  const alone = delegation.members.length <= 1;

  return (
    <div className={cn('rounded-card border border-hairline bg-surface', className)}>
      <div className="flex items-center gap-4 border-b border-hairline px-5 py-4">
        <Flag code={delegation.countryCode} country={delegation.country} size="lg" />
        <div className="min-w-0">
          <p className="label-micro">Your delegation</p>
          <p className="mt-1 truncate font-serif text-[22px] leading-tight text-ink-900">
            {delegation.country}
          </p>
        </div>
      </div>
      <div className="px-5 py-2">
        {alone ? (
          <p className="py-2.5 text-sm text-ink-800">
            You are representing {delegation.country} on your own.
          </p>
        ) : (
          <MemberList members={delegation.members} />
        )}
      </div>
      {room ? (
        <p className="flex items-center gap-1.5 border-t border-hairline px-5 py-3 text-xs text-muted">
          <MapPin size={13} strokeWidth={1.5} className="shrink-0 text-ink-400" />
          {alone
            ? `The Emergency Session meets in ${room}.`
            : `Find your delegation in ${room} before the session opens.`}
        </p>
      ) : null}
    </div>
  );
}

/** Every delegation at once — for the Emergency Session chairs and the Secretariat. */
export function AllDelegations({ className }: { className?: string }) {
  const [delegations, setDelegations] = useState<EmergencyDelegation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dataSource
      .getAllDelegations()
      .then((result) => {
        if (!cancelled) setDelegations(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed)
    return (
      <p className={cn('text-sm text-muted', className)}>The delegations could not be loaded.</p>
    );
  if (!delegations)
    return <p className={cn('text-sm text-muted', className)}>Loading delegations…</p>;
  if (delegations.length === 0) {
    return (
      <p className={cn('text-sm text-muted', className)}>
        No Emergency Session countries are assigned yet. Fill in the Emergency Country column of the
        Users tab.
      </p>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {delegations.map((delegation) => (
        <div
          key={delegation.country}
          className="rounded-card border border-hairline bg-surface px-4 py-3"
        >
          <div className="flex items-center gap-2.5">
            <Flag code={delegation.countryCode} country={delegation.country} size="sm" />
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
              {delegation.country}
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Users size={12} strokeWidth={1.5} />
              {delegation.members.length}
            </span>
          </div>
          <div className="mt-1">
            <MemberList members={delegation.members} />
          </div>
        </div>
      ))}
    </div>
  );
}
