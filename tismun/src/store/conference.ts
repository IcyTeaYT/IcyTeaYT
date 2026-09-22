import { create } from 'zustand';
import { dataSource } from '@/data/source';
import type { Committee } from '@/data/source/types';

/**
 * Committee information, loaded once per session. Public to every role, so it
 * is safe to keep a single shared copy in memory.
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
