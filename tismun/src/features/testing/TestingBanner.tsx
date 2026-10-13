import { FlaskConical, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { dataSource } from '@/data/source';
import { countryCode } from '@/lib/resolution';
import { useAuth } from '@/store/auth';
import { useConference } from '@/store/conference';
import { TestAsDialog } from './TestAsDialog';

/**
 * On every page while the owner tests the site as a delegate: whose view this
 * is, and the way back. Nobody else ever sees it.
 */
export function TestingBanner() {
  const seat = useAuth((state) => state.user?.testing ?? null);
  const committee = useConference((state) => state.committees.find((entry) => entry.id === seat?.committeeId));
  const [switching, setSwitching] = useState(false);
  const [stopping, setStopping] = useState(false);
  if (!seat) return null;

  const stop = async () => {
    setStopping(true);
    try {
      await dataSource.stopTest();
    } finally {
      window.location.assign('/');
    }
  };

  return (
    <div className="border-b border-warning-border bg-warning-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:px-6">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-warning">
          <FlaskConical size={15} strokeWidth={1.75} className="shrink-0" />
          <span className="min-w-0">
            <span className="font-semibold">Testing as </span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Flag code={countryCode(seat.country)} country={seat.country} size="xs" />
              {seat.country}
            </span>
            {committee ? ` · ${committee.abbreviation || committee.name}` : ''}
            {seat.day2 ? ' · Day 2 preview' : ''}
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSwitching(true)}>
            Switch
          </Button>
          <Button size="sm" variant="primary" onClick={() => void stop()} disabled={stopping}>
            {stopping ? <Loader2 size={14} className="animate-spin" /> : null}
            Stop testing
          </Button>
        </div>
      </div>
      <TestAsDialog open={switching} onClose={() => setSwitching(false)} />
    </div>
  );
}
