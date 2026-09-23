import { create } from 'zustand';
import { dataSource } from '@/data/source';
import type { Committee } from '@/data/source/types';

/**
 * Committee information, shared by every role, so one copy lives in memory.
 * In live mode the API needs a session, so App loads it again after sign-in:
 * the first load on a signed-out visit is refused.
 */

interface ConferenceState {
  committees: Committee[];
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useConference = create<ConferenceState>((set) => ({
  committees: [],
  loaded: false,
  error: null,

  async load() {
    // Several components mount at once on first paint; they share one request.
    inFlight ??= (async () => {
      set({ loaded: false });
      try {
        const committees = await dataSource.getCommittees();
        set({ committees, loaded: true, error: null });
      } catch {
        set({ loaded: true, error: 'Committee information could not be loaded.' });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));

export function useCommittee(id: string | null | undefined): Committee | null {
  const committees = useConference((state) => state.committees);
  if (!id) return null;
  return committees.find((committee) => committee.id === id) ?? null;
}
