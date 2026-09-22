import { useEffect, useRef, useState } from 'react';
import {
  elapsedOf,
  isExpired,
  isRunning,
  phaseOf,
  progressOf,
  remainingOf,
  type TimerPhase,
  type TimerState,
} from './timer';

/** How often a running clock repaints. Fine-grained enough for the last ten seconds. */
const TICK_MS = 100;

export interface TimerView {
  remainingMs: number;
  elapsedMs: number;
  running: boolean;
  expired: boolean;
  phase: TimerPhase;
  progress: number;
}

/**
 * Subscribe a component to a timer's derived values.
 *
 * The interval only repaints — it never advances the clock — so a missed or
 * late tick costs a frame, not accuracy. When the timer is paused we tear the
 * interval down entirely; a paused clock cannot change.
 */
export function useTimer(timer: TimerState, onExpire?: () => void): TimerView {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<TimerState | null>(null);

  const running = isRunning(timer);

  useEffect(() => {
    if (!running) {
      setNow(Date.now());
      return;
    }
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    // Coming back from a background tab: repaint immediately rather than
    // waiting up to a tick for a clock that may be minutes out of date.
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running]);

  const expired = isExpired(timer, now);

  // Fire once per timer run, not once per tick.
  useEffect(() => {
    if (!expired) {
      firedFor.current = null;
      return;
    }
    if (firedFor.current === timer) return;
    firedFor.current = timer;
    onExpire?.();
  }, [expired, timer, onExpire]);

  return {
    remainingMs: remainingOf(timer, now),
    elapsedMs: elapsedOf(timer, now),
    running,
    expired,
    phase: phaseOf(timer, now),
    progress: progressOf(timer, now),
  };
}
