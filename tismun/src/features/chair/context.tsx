import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dataSource } from '@/data/source';
import type { Committee, Delegation } from '@/data/source/types';
import { chairStoreFor, type ChairState, type ChairStore } from './store';

interface ChairContextValue {
  store: ChairStore;
  committee: Committee;
  roster: Delegation[];
  rosterById: Map<string, Delegation>;
  loading: boolean;
  error: string | null;
}

const ChairContext = createContext<ChairContextValue | null>(null);

export function ChairProvider({
  committee,
  children,
}: {
  committee: Committee;
  children: ReactNode;
}) {
  const store = useMemo(() => chairStoreFor(committee.id), [committee.id]);
  const [roster, setRoster] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dataSource
      .getRoster(committee.id)
      .then((delegations) => {
        if (cancelled) return;
        setRoster(delegations);
        // Seed names and codes so log entries and the projector read correctly,
        // while preserving any attendance already recorded this session.
        store.getState().syncRoster(delegations);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('The committee roster could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [committee.id, store]);

  const value = useMemo<ChairContextValue>(
    () => ({
      store,
      committee,
      roster,
      rosterById: new Map(roster.map((delegation) => [delegation.id, delegation])),
      loading,
      error,
    }),
    [store, committee, roster, loading, error],
  );

  return <ChairContext.Provider value={value}>{children}</ChairContext.Provider>;
}

export function useChairContext(): ChairContextValue {
  const value = useContext(ChairContext);
  if (!value) throw new Error('useChairContext must be used inside a ChairProvider');
  return value;
}

/** Subscribe to a slice of the committee's session state. */
export function useChair<T>(selector: (state: ChairState) => T): T {
  const { store } = useChairContext();
  return store(selector);
}

/** Read or write session state outside of a render. */
export function useChairStoreApi(): ChairStore {
  return useChairContext().store;
}

/** Look up a delegation by id, falling back to whatever the session remembers. */
export function useDelegationLookup() {
  const { rosterById } = useChairContext();
  const names = useChair((state) => state.names);
  const codes = useChair((state) => state.codes);

  return useMemo(
    () => ({
      nameOf: (id: string | null | undefined): string =>
        (id ? (rosterById.get(id)?.country ?? names[id]) : undefined) ?? '—',
      codeOf: (id: string | null | undefined): string | null =>
        (id ? (rosterById.get(id)?.countryCode ?? codes[id]) : undefined) ?? null,
    }),
    [rosterById, names, codes],
  );
}
