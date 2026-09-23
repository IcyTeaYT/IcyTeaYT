import { useEffect } from 'react';
import { create } from 'zustand';
import { emergencySession, type ConferenceStatus } from '@/config/emergency';
import { dataSource } from '@/data/source';
import { useAuth } from './auth';
import { useConference } from './conference';

/**
 * Where the conference stands — the Emergency Session release and Day 2 — as
 * the SERVER sees it. The browser's own clock is only used to tick a countdown
 * between checks, corrected by how far it is from the server's; it never
 * decides whether anything is released.
 */

interface ConferenceStatusState {
  status: ConferenceStatus | null;
  /** Server time minus this device's time, at the last check. */
  offsetMs: number;
  /** The topic was released while this page was open — worth a "New" marker. */
  newlyReleased: boolean;
  refresh: () => Promise<void>;
}

export const useConferenceStatus = create<ConferenceStatusState>((set, get) => ({
  status: null,
  offsetMs: 0,
  newlyReleased: false,

  async refresh() {
    let next: ConferenceStatus;
    try {
      next = await dataSource.getConferenceStatus();
    } catch {
      return; // Offline: keep what we have and try again at the next tick.
    }
    const previous = get().status;
    set({
      status: next,
      offsetMs: next.serverNow - Date.now(),
      newlyReleased: get().newlyReleased || (previous !== null && !previous.released && next.released),
    });

    // The topic has just come out (or been taken back): the committee list
    // the server sends has changed with it.
    if (previous && previous.released !== next.released) void useConference.getState().load();
    // Day 2 has begun (or been switched): roles may have changed with it.
    if (previous && previous.day2 !== next.day2) void useAuth.getState().restore();
  },
}));

/** The server's clock, as best this device can tell. */
export const serverNow = (): number => Date.now() + useConferenceStatus.getState().offsetMs;

/** Check now, then every thirty seconds, and whenever the tab comes back into view. */
export function useConferenceStatusPolling(): void {
  const refresh = useConferenceStatus((state) => state.refresh);
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), emergencySession.pollMs);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);
}
