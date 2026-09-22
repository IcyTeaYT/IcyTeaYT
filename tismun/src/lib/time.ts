import { CONFERENCE_DATES } from '@/config/conference';

/** mm:ss, minutes uncapped (90 minutes reads "90:00"). Never negative. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "1 min 30 sec" style, for prose rather than clocks. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes && seconds) return `${minutes} min ${seconds} sec`;
  if (minutes) return `${minutes} min`;
  return `${seconds} sec`;
}

export const secondsToMs = (seconds: number): number => seconds * 1000;

/**
 * Session log times are always conference time, never the reader's.
 *
 * A chair in the room, the Secretariat on a phone and whoever opens the
 * exported CSV next week must all read the same "14:32:07" for the same
 * moment — so every timestamp is formatted in the conference timezone
 * regardless of where the device thinks it is.
 */
export function formatTimeOfDay(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-GB', {
    timeZone: CONFERENCE_DATES.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-GB', {
    timeZone: CONFERENCE_DATES.timezone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Spelled out for export headers, e.g. "22 Sep 2026, 14:32:07 (Tashkent)". */
export function formatDateTimeWithZone(epochMs: number): string {
  return `${formatDateTime(epochMs)} (Tashkent)`;
}
