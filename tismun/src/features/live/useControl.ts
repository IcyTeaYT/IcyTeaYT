import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChairStore } from '@/features/chair/store';
import { claimControl, fetchControl } from './client';
import { deviceId, isThisBrowsersTab } from './device';
import { fromHandover } from './handover';
import { clockOffset } from './serverClock';
import { acquireTabLock, type TabLock } from './tabLock';
import type { ControlClaim, ControlHolder, LiveSummary } from './types';

/**
 * Who runs this committee — this tab, or another tab or device.
 *
 * - `checking`: finding out, on first load.
 * - `control`: this tab runs the committee and reports it.
 * - `watching`: another tab or device runs it; this one shows a read-only view
 *   and a Take over button.
 * - `solo`: there is no live-sync server to ask (local development, or no
 *   database bound), so this tab just runs the committee on its own.
 *
 * Running takes two locks. The browser's tab lock settles which tab of THIS
 * browser may run it, instantly and without the network; the server's claim
 * settles which device. A tab without the tab lock never asks the server.
 */
export type ControlMode = 'checking' | 'control' | 'watching' | 'solo';

export interface CommitteeControl {
  mode: ControlMode;
  /** Why this tab is watching: someone was already running it, or took over. */
  reason: 'busy' | 'taken' | null;
  /** Where the committee is being run: another tab of this browser, or elsewhere. */
  where: 'tab' | 'device';
  holder: ControlHolder | null;
  /** What the committee looks like, for the watch view. Server time. */
  summary: LiveSummary | null;
  serverNow: number;
  takingOver: boolean;
  takeOver: () => Promise<boolean>;
  /** For useLivePush: another device took over while this one was running. */
  lostControl: (holder: ControlHolder | null) => void;
}

/** How often a watching tab checks in. Paused while the tab is hidden. */
const WATCH_POLL_MS = 10_000;

export function useCommitteeControl(committeeId: string, store: ChairStore): CommitteeControl {
  const [mode, setMode] = useState<ControlMode>('checking');
  const [reason, setReason] = useState<'busy' | 'taken' | null>(null);
  const [where, setWhere] = useState<'tab' | 'device'>('device');
  const [holder, setHolder] = useState<ControlHolder | null>(null);
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [serverNow, setServerNow] = useState(Date.now());
  const [takingOver, setTakingOver] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const tabLock = useRef<TabLock | null>(null);
  const unmounted = useRef(false);

  /** Carry on from another device's session, if the claim brought one. */
  const adopt = useCallback(
    (claim: ControlClaim) => {
      const data = fromHandover(claim.state, clockOffset());
      if (data) store.setState(data);
    },
    [store],
  );

  const watch = useCallback((why: 'busy' | 'taken', at: 'tab' | 'device') => {
    // A tab already watching keeps saying why it started: "took over" should
    // not turn into "is being run" just because a later check found it busy.
    if (modeRef.current !== 'watching' || why === 'taken') setReason(why);
    setWhere(at);
    setMode('watching');
  }, []);

  /** Hold on to a tab lock, and stand down the moment another tab steals it. */
  const keepTabLock = useCallback(
    (lock: TabLock) => {
      tabLock.current = lock;
      void lock.lost.then(() => {
        if (tabLock.current !== lock || unmounted.current) return;
        tabLock.current = null;
        watch('taken', 'tab');
      });
    },
    [watch],
  );

  /** Ask the server for the committee, having already got this browser's tab lock. */
  const claimFromServer = useCallback(
    async (force: boolean): Promise<boolean> => {
      let claim = await claimControl(committeeId, deviceId(), force);
      if (unmounted.current) return false;
      // Holding the tab lock means no other tab of this browser is running the
      // committee — so if the server still names one of this browser's tabs,
      // that tab has closed, and there is no need to wait for its claim to lapse.
      if (claim?.configured && !claim.acquired && isThisBrowsersTab(claim.holder?.deviceId)) {
        claim = await claimControl(committeeId, deviceId(), true);
        if (unmounted.current) return false;
      }
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
      watch('busy', 'device');
      return false;
    },
    [committeeId, adopt, watch],
  );

  /** Try to run the committee from this tab, without taking it from anyone. */
  const tryToRun = useCallback(async (): Promise<boolean> => {
    if (!tabLock.current) {
      const lock = await acquireTabLock(committeeId, false);
      if (unmounted.current) {
        lock?.release();
        return false;
      }
      if (!lock) {
        // Another tab of this browser is running it; the server is not asked.
        watch('busy', 'tab');
        return false;
      }
      keepTabLock(lock);
    }
    return claimFromServer(false);
  }, [committeeId, keepTabLock, claimFromServer, watch]);

  // First load.
  useEffect(() => {
    unmounted.current = false;
    setMode('checking');
    void tryToRun();
    return () => {
      unmounted.current = true;
      tabLock.current?.release();
      tabLock.current = null;
    };
  }, [tryToRun]);

  // While watching, keep the view current, and pick the committee up on our
  // own once whoever was running it has gone: their tab closed (the tab lock
  // comes free) or their device went quiet (the server claim lapsed).
  useEffect(() => {
    if (mode !== 'watching') return;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      const status = await fetchControl(committeeId, deviceId());
      if (cancelled) return;
      if (status?.configured) {
        setServerNow(status.serverNow);
        setSummary(status.summary ?? null);
        setHolder(status.holder ?? null);
      }

      if (cancelled || modeRef.current !== 'watching') return;

      // Another tab of this browser was running it: see whether it has gone.
      // Asking costs nothing — it is the browser, not the network.
      if (!tabLock.current) {
        await tryToRun();
        return;
      }

      // Another device was running it: pick it up once its claim has lapsed.
      const serverFree =
        !status?.configured ||
        !status.holder ||
        status.holder.stale ||
        status.isYou ||
        isThisBrowsersTab(status.holder.deviceId);
      if (serverFree) await claimFromServer(false);
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
  }, [mode, committeeId, tryToRun, claimFromServer]);

  const takeOver = useCallback(async () => {
    setTakingOver(true);
    try {
      if (!tabLock.current) {
        const lock = await acquireTabLock(committeeId, true);
        if (!lock || unmounted.current) return false;
        keepTabLock(lock);
      }
      return await claimFromServer(true);
    } finally {
      if (!unmounted.current) setTakingOver(false);
    }
  }, [committeeId, keepTabLock, claimFromServer]);

  const lostControl = useCallback(
    (next: ControlHolder | null) => {
      setHolder(next);
      watch('taken', 'device');
    },
    [watch],
  );

  return {
    mode,
    reason,
    where,
    holder,
    summary,
    serverNow,
    takingOver,
    takeOver,
    lostControl,
  };
}
