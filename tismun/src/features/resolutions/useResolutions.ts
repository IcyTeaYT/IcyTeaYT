import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { preWrittenResolution, blankResolution, writesOwnResolution } from '@/config/resolutions';
import { dataSource } from '@/data/source';
import type { ResAction, ResActionResult, ResCountry, ResMe, ResWorkspace } from '@/data/source/types';
import {
  currentText,
  withSubmittersHere,
  type CommitteeResState,
  type Copy,
  type ResolutionText,
  type TopicNo,
} from '@/lib/resolution';

/**
 * A committee's resolution workspace, kept fresh.
 *
 * Polling is the cost of being live, so it is careful about it: every two
 * seconds while someone is co-editing (a shared copy, or a clause someone else
 * is typing in), every ten otherwise, and not at all while the tab is hidden.
 */

const FAST_MS = 2000;
const SLOW_MS = 10_000;

export interface Workspace {
  loading: boolean;
  /** Could not be loaded at all — the message says why. */
  error: string | null;
  available: boolean;
  me: ResMe | null;
  state: CommitteeResState | null;
  copies: Copy[];
  /** The Secretariat only: what delegates are writing but have not submitted. */
  writing: Copy[];
  countries: ResCountry[];
  /** Server time minus this browser's, for comparing hold times. */
  offset: number;
  /** The resolution as it stands for this topic, or null before there is one. */
  current: ResolutionText | null;
  /** The Emergency Session before a draft is adopted: copies are whole drafts. */
  drafting: boolean;
  refresh: () => Promise<void>;
  act: (action: ResAction) => Promise<ResActionResult>;
}

export function baseFor(committeeId: string, topic: TopicNo, state: CommitteeResState | null): ResolutionText | null {
  if (writesOwnResolution(committeeId)) return state?.topics[topic].base ?? null;
  return preWrittenResolution(committeeId, topic);
}

const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'The resolution could not be loaded.';

export function useResolutions(
  committeeId: string | null,
  topic: TopicNo,
  options: { fast?: boolean; withCountries?: boolean } = {},
): Workspace {
  const [data, setData] = useState<ResWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const countriesLoaded = useRef(false);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    if (!committeeId) return;
    const ticket = (latest.current += 1);
    try {
      const next = await dataSource.getResolutions(committeeId, topic, options.withCountries && !countriesLoaded.current);
      if (ticket !== latest.current) return;
      if (next.countries) countriesLoaded.current = true;
      setOffset(next.serverNow - Date.now());
      setData((previous) => ({ ...next, countries: next.countries ?? previous?.countries }));
      setError(next.available ? null : (next.error ?? 'Resolutions are not available yet.'));
    } catch (caught) {
      if (ticket === latest.current) setError(messageOf(caught));
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, [committeeId, topic, options.withCountries]);

  // A new topic starts from scratch.
  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  // Someone else typing in a copy this person can see makes it worth keeping up.
  const othersActive = useMemo(() => {
    const now = Date.now() + offset;
    return (data?.copies ?? []).some(
      (copy) =>
        copy.members.length > 0 &&
        Object.values(copy.locks).some((lock) => lock.until > now && lock.holder !== data?.me?.key),
    );
  }, [data, offset]);
  const fast = Boolean(options.fast) && (othersActive || (data?.copies ?? []).some((copy) => copy.members.length > 0));

  useEffect(() => {
    if (!committeeId) return;
    let timer: number | undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    timer = window.setInterval(tick, fast ? FAST_MS : SLOW_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      timer = undefined;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [committeeId, fast, refresh]);

  const act = useCallback(
    async (action: ResAction): Promise<ResActionResult> => {
      if (!committeeId) throw new Error('No committee.');
      const result = await dataSource.resolutionAction(committeeId, action);
      // Whatever came back is newer than any poll still in flight.
      latest.current += 1;
      setOffset(result.serverNow - Date.now());
      setData((previous) => {
        if (!previous) return previous;
        const copies = result.copy
          ? [...(previous.copies ?? []).filter((copy) => copy.id !== result.copy?.id), result.copy]
          : previous.copies;
        return { ...previous, state: result.state ?? previous.state, copies };
      });
      return result;
    },
    [committeeId],
  );

  const state = data?.state ?? null;
  const base = committeeId ? baseFor(committeeId, topic, state) : null;
  // Who submitted it, as this committee has it: if no Main Submitter sits
  // here, a co-submitter who does takes their place.
  const countryNames = useMemo(() => (data?.countries ?? []).map((country) => country.name), [data?.countries]);
  const current = useMemo(() => {
    const text = base && state ? currentText(base, state.amendments, topic) : base;
    return text ? withSubmittersHere(text, countryNames) : text;
  }, [base, state, topic, countryNames]);
  const drafting = Boolean(committeeId && writesOwnResolution(committeeId) && state && !state.topics[topic].base);

  return {
    loading,
    error,
    available: data?.available ?? false,
    me: data?.me ?? null,
    state,
    copies: data?.copies ?? [],
    writing: data?.writing ?? [],
    countries: data?.countries ?? [],
    offset,
    current: drafting ? blankResolution('') : current,
    drafting,
    refresh,
    act,
  };
}
