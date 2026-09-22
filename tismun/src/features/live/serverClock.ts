/**
 * The offset between this device's clock and the server's.
 *
 * Timers are stored as absolute timestamps, which is what makes them immune to
 * drift — but it also means a timestamp is only meaningful against the clock
 * that produced it. A chair's laptop three minutes fast would otherwise make
 * every caucus look three minutes further along on the Secretariat's screen.
 *
 * Every API response carries the server's own `Date.now()`, so each device can
 * translate into and out of a shared reference clock.
 */

let offsetMs = 0;
let synced = false;

export function noteServerNow(serverNow: number): void {
  offsetMs = serverNow - Date.now();
  synced = true;
}

export const isClockSynced = (): boolean => synced;

/** How far this device is behind (positive) or ahead of (negative) the server. */
export const clockOffset = (): number => offsetMs;

export const toServerTime = (localMs: number): number => localMs + offsetMs;
export const fromServerTime = (serverMs: number): number => serverMs - offsetMs;
export const serverNow = (): number => Date.now() + offsetMs;
