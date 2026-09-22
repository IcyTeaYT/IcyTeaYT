/**
 * The timer engine behind every clock in the Chair Dashboard.
 *
 * A timer stores three numbers and nothing else: how long it should run, when
 * the current run began, and how much time it had already accumulated before
 * that. Remaining time is DERIVED from Date.now() on every read.
 *
 * That is the whole trick. Nothing decrements, so nothing drifts: a timer is
 * just as correct after the laptop sleeps, the tab is backgrounded for twenty
 * minutes, or the chair refreshes mid-caucus — and because the state is three
 * plain numbers, it survives a round-trip through localStorage untouched.
 */

export interface TimerState {
  /** How long the timer runs for. +30s / −30s move this. */
  durationMs: number;
  /** Epoch ms when the current run started; null when paused or never started. */
  startedAt: number | null;
  /** Time banked from earlier runs, before the current one. */
  elapsedMs: number;
}

export type TimerPhase = 'idle' | 'normal' | 'warning' | 'critical' | 'expired';

export const WARNING_AT_MS = 30_000;
export const CRITICAL_AT_MS = 10_000;

export const createTimer = (durationMs: number): TimerState => ({
  durationMs: Math.max(0, durationMs),
  startedAt: null,
  elapsedMs: 0,
});

export const isRunning = (timer: TimerState): boolean => timer.startedAt !== null;

export const elapsedOf = (timer: TimerState, now: number): number =>
  timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt));

export const remainingOf = (timer: TimerState, now: number): number =>
  Math.max(0, timer.durationMs - elapsedOf(timer, now));

export const isExpired = (timer: TimerState, now: number): boolean =>
  remainingOf(timer, now) <= 0 && (isRunning(timer) || timer.elapsedMs > 0);

/** Has never been started and has no banked time. */
export const isPristine = (timer: TimerState): boolean =>
  timer.startedAt === null && timer.elapsedMs === 0;

export function startTimer(timer: TimerState, now: number): TimerState {
  return isRunning(timer) ? timer : { ...timer, startedAt: now };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (!isRunning(timer)) return timer;
  return { ...timer, startedAt: null, elapsedMs: elapsedOf(timer, now) };
}

export function toggleTimer(timer: TimerState, now: number): TimerState {
  return isRunning(timer) ? pauseTimer(timer, now) : startTimer(timer, now);
}

export function resetTimer(timer: TimerState): TimerState {
  return { ...timer, startedAt: null, elapsedMs: 0 };
}

/** Shift the length by ±ms. Used by the +30s / +1 min / −30s controls. */
export function adjustTimer(timer: TimerState, deltaMs: number): TimerState {
  return { ...timer, durationMs: Math.max(0, timer.durationMs + deltaMs) };
}

export function phaseOf(timer: TimerState, now: number): TimerPhase {
  if (isPristine(timer)) return 'idle';
  const remaining = remainingOf(timer, now);
  if (remaining <= 0) return 'expired';
  if (remaining <= CRITICAL_AT_MS) return 'critical';
  if (remaining <= WARNING_AT_MS) return 'warning';
  return 'normal';
}

/** 0 → 1, for progress bars. */
export function progressOf(timer: TimerState, now: number): number {
  if (timer.durationMs <= 0) return 1;
  return Math.min(1, elapsedOf(timer, now) / timer.durationMs);
}
