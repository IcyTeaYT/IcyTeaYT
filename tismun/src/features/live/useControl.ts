import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChairStore } from '@/features/chair/store';
import { claimControl, fetchControl } from './client';
import { deviceId } from './device';
import { fromHandover } from './handover';
import { clockOffset } from './serverClock';
import type { ControlClaim, ControlHolder, LiveSummary } from './types';

/**
 * Who runs this committee — this device, or another chair's.
 *
 * - `checking`: asking the server, on first load.
 * - `control`: this device runs the committee and reports it.
 * - `watching`: another device runs it; this one shows a read-only view and a
 *   Take over button.
 * - `solo`: there is no live-sync server to ask (local development, or no
 *   database bound), so this device just runs the committee on its own, as it
 *   always did.
 */
export type ControlMode = 'checking' | 'control' | 'watching' | 'solo';

export interface CommitteeControl {
  mode: ControlMode;
  /** Why this device is watching: someone was already running it, or took over. */
  reason: 'busy' | 'taken' | null;
  holder: ControlHolder | null;
  /** What the committee looks like, for the watch view. Server time. */
  summary: LiveSummary | null;
  serverNow: number;
  takingOver: boolean;
  takeOver: () => Promise<boolean>;
  /** For useLivePush: another device took over while this one was running. */
  lostControl: (holder: ControlHolder | null) => void;
}

/** How often a watching device checks in. Paused while the tab is hidden. */
const WATCH_POLL_MS = 10_000;

export function useCommitteeControl(committeeId: string, store: ChairStore): CommitteeControl {
  const [mode, setMode] = useState<ControlMode>('checking');
  const [reason, setReason] = useState<'busy' | 'taken' | null>(null);
  const [holder, setHolder] = useState<ControlHolder | null>(null);
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [serverNow, setServerNow] = useState(Date.now());
  const [takingOver, setTakingOver] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  /** Carry on from another device's session, if the claim brought one. */
  const adopt = useCallback(
    (claim: ControlClaim) => {
      const data = fromHandover(claim.state, clockOffset());
      if (data) store.setState(data);
    },
    [store],
  );

  const applyClaim = useCallback(
    (claim: ControlClaim | null, whenRefused: 'busy' | 'taken'): boolean => {
      if (!claim || !claim.configured) {
        setMode('solo');
        return true;
      }
      setServerNow(claim.serverNow);
      setHolder(claim.holder ?? null);
      if (claim.acquired) {
        adopt(claim);
        setReason(null);
        setMode('control');
        return true;
      }
      setReason(whenRefused);
      setMode('watching');
      return false;
    },
    [adopt],
  );

  // First load: take the committee if nobody is running it.
  useEffect(() => {
    let cancelled = false;
    setMode('checking');
    void claimControl(committeeId, deviceId(), false).then((claim) => {
      if (!cancelled) applyClaim(claim, 'busy');
    });
    return () => {
      cancelled = true;
    };
  }, [committeeId, applyClaim]);

  // While watching, keep the view current, and pick the committee up on our
  // own if the device running it goes quiet.
  useEffect(() => {
    if (mode !== 'watching') return;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      const status = await fetchControl(committeeId, deviceId());
      if (cancelled || !status?.configured) return;
      setServerNow(status.serverNow);
      setSummary(status.summary ?? null);
      setHolder(status.holder ?? null);

      if (!status.holder || status.holder.stale || status.isYou) {
        const claim = await claimControl(committeeId, deviceId(), false);
        if (!cancelled && modeRef.current === 'watching') applyClaim(claim, 'busy');
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), WATCH_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [mode, committeeId, applyClaim]);

  const takeOver = useCallback(async () => {
    setTakingOver(true);
    const claim = await claimControl(committeeId, deviceId(), true);
    setTakingOver(false);
    return applyClaim(claim, 'busy');
  }, [committeeId, applyClaim]);

  const lostControl = useCallback((next: ControlHolder | null) => {
    setHolder(next);
    setReason('taken');
    setMode('watching');
  }, []);

  return { mode, reason, holder, summary, serverNow, takingOver, takeOver, lostControl };
}
