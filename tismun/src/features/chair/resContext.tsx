import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ResAction } from '@/data/source/types';
import { topicsOf } from '@/config/resolutions';
import { pendingAmendments, type ResolutionText } from '@/lib/resolution';
import { useResolutions, type Workspace } from '@/features/resolutions/useResolutions';
import { useChair, useChairContext } from './context';
import { emptyResContext, floorOf, guidedScreen, type ResContext } from './guide';

/**
 * The committee's resolution, as the server has it, for the chair's screens:
 * what is on the paper now, the amendments waiting, and how each vote went.
 */

interface ChairRes {
  ws: Workspace;
  res: ResContext;
  current: ResolutionText | null;
  /**
   * Record a decision on the server — a vote's result, a withdrawal. If the
   * connection drops it keeps trying, so a result is never lost.
   */
  report: (action: ResAction) => void;
  /** Decisions still waiting to reach the server. */
  unsent: number;
}

const ChairResContext = createContext<ChairRes | null>(null);

export function ChairResProvider({ children }: { children: ReactNode }) {
  const { committee } = useChairContext();
  const topic = useChair((state) => state.topic);
  const ws = useResolutions(committee.id, topic, { fast: false, withCountries: true });

  const res = useMemo<ResContext>(() => {
    if (!ws.state) return { ...emptyResContext(topic), topics: topicsOf(committee.id) };
    const topicState = ws.state.topics[topic];
    return {
      loaded: true,
      topic,
      topics: topicsOf(committee.id),
      status: topicState.status,
      votes: topicState.votes,
      pending: pendingAmendments(ws.state, topic),
      drafting: ws.drafting,
      drafts: ws.state.drafts.filter((draft) => draft.status !== 'withdrawn'),
      mainSubmitters: ws.current?.mainSubmitters ?? [],
      coSubmitters: ws.current?.coSubmitters ?? [],
    };
  }, [ws.state, ws.drafting, ws.current, topic, committee.id]);

  const queue = useRef<ResAction[]>([]);
  const [unsent, setUnsent] = useState(0);
  const sending = useRef(false);
  const act = ws.act;
  const drain = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      while (queue.current.length > 0) {
        const next = queue.current[0];
        if (!next) break;
        try {
          await act(next);
        } catch (error) {
          // Refused outright (it no longer exists, say): drop it. A network
          // problem: keep it for the next try.
          const status = (error as { status?: number }).status ?? 0;
          if (status < 400 || status >= 500 || status === 401) break;
        }
        queue.current.shift();
        setUnsent(queue.current.length);
      }
    } finally {
      sending.current = false;
    }
  }, [act]);
  const report = useCallback(
    (action: ResAction) => {
      queue.current.push(action);
      setUnsent(queue.current.length);
      void drain();
    },
    [drain],
  );
  useEffect(() => {
    if (unsent === 0) return;
    const id = window.setInterval(() => void drain(), 5000);
    return () => window.clearInterval(id);
  }, [unsent, drain]);

  const value = useMemo(() => ({ ws, res, current: ws.current, report, unsent }), [ws, res, report, unsent]);

  return (
    <ChairResContext.Provider value={value}>{children}</ChairResContext.Provider>
  );
}

export function useChairRes(): ChairRes {
  const value = useContext(ChairResContext);
  if (!value) throw new Error('useChairRes must be used inside a ChairResProvider');
  return value;
}

/**
 * Tells delegates' screens what the committee is doing — "Speeches against
 * Amendment 3" — whenever that changes. Only the device running the committee.
 */
export function FloorReporter() {
  const { committee } = useChairContext();
  const { ws, res } = useChairRes();
  const state = useChair((snapshot) => snapshot);
  const floor = useMemo(
    () => (res.loaded ? floorOf(state, guidedScreen(state, committee.id, res), res) : undefined),
    [state, committee.id, res],
  );
  const sent = useRef<string | null>(null);
  const key = floor === undefined ? null : JSON.stringify(floor ? [res.topic, floor.stage, floor.amendmentId] : null);
  // Read at send time, so a poll arriving mid-wait does not restart the wait.
  const latest = useRef({ floor, topic: res.topic, act: ws.act });
  latest.current = { floor, topic: res.topic, act: ws.act };

  useEffect(() => {
    if (key === null || key === sent.current) return;
    const id = window.setTimeout(() => {
      const { floor: now, topic, act } = latest.current;
      if (now === undefined) return;
      sent.current = key;
      void act({ action: 'floor', floor: now ? { topic, stage: now.stage, amendmentId: now.amendmentId } : null }).catch(
        () => {
          // Try again on the next change; the banner is a courtesy, not a record.
          sent.current = null;
        },
      );
    }, 800);
    return () => window.clearTimeout(id);
  }, [key]);

  return null;
}
