import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChairStore } from '@/features/chair/store';
import type { TimerState } from '@/lib/timer';
import { useConferenceStatus } from '@/store/conferenceStatus';
import { fetchDetail, fetchOverview, isSyncReachable, pushLive } from './client';
import { deviceId } from './device';
import { toHandover } from './handover';
import { localOverview, localSnapshot } from './localSource';
import { clockOffset } from './serverClock';
import { buildLiveSnapshot, buildLiveSummary, shiftTimer } from './snapshot';
import type { ControlHolder, LiveOverview, LiveSnapshot } from './types';

/** Wait this long after the last change before reporting, to batch typing. */
const PUSH_DEBOUNCE_MS = 600;
/** Never report more often than this, however fast the chair works. */
const PUSH_MIN_INTERVAL_MS = 1000;
/** Report anyway on this cadence, so silence is distinguishable from absence. */
const HEARTBEAT_MS = 10_000;
/** How often the Secretariat asks for fresh state. */
const POLL_MS = 2000;

/**
 * Report this committee's session to the server so the Secretariat can watch it.
 *
 * Writes are debounced and rate-limited, then backed by a heartbeat: without
 * the heartbeat a quiet committee would be indistinguishable from one whose
 * chair has closed their laptop, and "stale" is exactly what the Secretariat
 * needs to be able to see.
 */
export function useLivePush(
  committeeId: string,
  store: ChairStore,
  {
    enabled,
    onLocked,
  }: {
    /** Only the device running the committee reports it. */
    enabled: boolean;
    /** Another device has taken the committee over. */
    onLocked: (holder: ControlHolder | null) => void;
  },
): void {
  const lastPushAt = useRef(0);
  const pending = useRef<number | null>(null);
  const onLockedRef = useRef(onLocked);
  onLockedRef.current = onLocked;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const send = async () => {
      if (cancelled) return;
      lastPushAt.current = Date.now();
      const state = store.getState();
      const offset = clockOffset();
      const result = await pushLive(committeeId, {
        deviceId: deviceId(),
        chairState: toHandover(state, offset),
        summary: buildLiveSummary(state, committeeId, offset),
        snapshot: buildLiveSnapshot(state, committeeId, offset),
        log: state.log.slice(0, 60).map((entry) => ({ ...entry, at: entry.at + offset })),
        resetEpoch: state.resetEpoch,
      });
      if (cancelled) return;
      if (result.kind === 'locked') onLockedRef.current(result.holder);
      // The Secretariat reset every session: wipe this copy, then report the fresh one.
      if (result.kind === 'reset') {
        store.getState().applySecretariatReset(result.sessionsResetAt);
        void useConferenceStatus.getState().refresh();
      }
    };

    const schedule = () => {
      if (pending.current !== null) return;
      const since = Date.now() - lastPushAt.current;
      const wait = Math.max(PUSH_DEBOUNCE_MS, PUSH_MIN_INTERVAL_MS - since);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        void send();
      }, wait);
    };

    // Claiming the committee already set this device's clock against the
    // server's, so the first report can go straight away.
    void send();

    const unsubscribe = store.subscribe(schedule);
    const heartbeat = window.setInterval(() => void send(), HEARTBEAT_MS);
    // Report the moment the tab is back in view, so a laptop waking from sleep
    // (or a tab brought back to the front) learns straight away if another
    // device took the committee over in the meantime.
    const onVisible = () => {
      if (!document.hidden) void send();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisible);
      if (pending.current !== null) window.clearTimeout(pending.current);
      pending.current = null;
    };
  }, [committeeId, store, enabled]);
}

export interface LiveView<T> {
  data: T | null;
  /** true when the data came from the server rather than this browser. */
  remote: boolean;
  loading: boolean;
}

/** Every committee, refreshed on a short poll. Falls back to this browser. */
export function useLiveOverview(committeeIds: string[]): LiveView<LiveOverview> {
  const key = committeeIds.join(',');
  const [state, setState] = useState<LiveView<LiveOverview>>({
    data: null,
    remote: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',') : [];

    const tick = async () => {
      const remote = await fetchOverview();
      if (cancelled) return;
      setState({
        data: remote ?? localOverview(ids),
        remote: Boolean(remote?.configured),
        loading: false,
      });
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [key]);

  return state;
}

/** One committee's full state, refreshed on the same poll. */
export function useLiveSnapshot(committeeId: string | undefined): LiveView<LiveSnapshot> {
  const [state, setState] = useState<LiveView<LiveSnapshot>>({
    data: null,
    remote: false,
    loading: true,
  });

  useEffect(() => {
    if (!committeeId) return;
    let cancelled = false;

    const tick = async () => {
      const remote = await fetchDetail(committeeId);
      if (cancelled) return;
      setState({
        data: remote?.snapshot ?? localSnapshot(committeeId),
        remote: Boolean(remote?.configured && remote.snapshot),
        loading: false,
      });
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [committeeId]);

  return state;
}

/**
 * Bring a timer out of server time into this device's clock, so the existing
 * timer helpers — which all read `Date.now()` — work on it unchanged.
 */
export function useLocalisedTimer(timer: TimerState | null | undefined): TimerState | null {
  const offset = clockOffset();
  return useMemo(() => (timer ? shiftTimer(timer, -offset) : null), [timer, offset]);
}

export const syncReachable = isSyncReachable;

/**
 * Take in a Secretariat "reset every session" as soon as this device hears of
 * it — from the conference status every open page checks, or from the server
 * refusing a report — whether or not this device is the one running the
 * committee, so no device keeps the old session to hand back on Take over.
 */
export function useSecretariatReset(store: ChairStore): void {
  const resetAt = useConferenceStatus((state) => state.status?.sessionsResetAt ?? null);
  useEffect(() => {
    if (resetAt !== null) store.getState().applySecretariatReset(resetAt);
  }, [resetAt, store]);
}
