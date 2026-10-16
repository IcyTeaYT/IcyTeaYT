import { useEffect, useState } from 'react';
import type { ChairStore } from '@/features/chair/store';
import { claimControl } from './client';
import { deviceId } from './device';
import { fromHandover } from './handover';
import { clockOffset } from './serverClock';

/**
 * Starting the committee on this tab.
 *
 * Any number of tabs and devices can run a committee at once: there is no
 * lock, and nobody has to take it over. Each one keeps its own timers and
 * steps, and the Secretariat and the room see whichever reported last.
 *
 * - `checking`: picking up the session, on first load.
 * - `control`: this tab runs the committee and reports it.
 * - `solo`: there is no live-sync server to ask (local development, or no
 *   database bound), so this tab just runs the committee on its own.
 */
export type ControlMode = 'checking' | 'control' | 'solo';

export interface CommitteeControl {
  mode: ControlMode;
}

export function useCommitteeControl(committeeId: string, store: ChairStore): CommitteeControl {
  const [mode, setMode] = useState<ControlMode>('checking');

  useEffect(() => {
    let cancelled = false;
    setMode('checking');
    void claimControl(committeeId, deviceId(), true).then((claim) => {
      if (cancelled) return;
      if (!claim || !claim.configured) {
        setMode('solo');
        return;
      }
      // A tab opening fresh carries on from the session another device last
      // reported, so it starts where the others are.
      const data = fromHandover(claim.state, clockOffset());
      if (data) store.setState(data);
      setMode('control');
    });
    return () => {
      cancelled = true;
    };
  }, [committeeId, store]);

  return { mode };
}
