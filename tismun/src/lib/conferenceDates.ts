import { CONFERENCE, CONFERENCE_DATES } from '@/config/conference';

/**
 * Conference dates, resolved in the conference's own timezone.
 *
 * Day arithmetic here never touches the viewer's local time. A delegate opening
 * the site from London at 22:00 on 14 October is looking at 03:00 on the 15th in
 * Tashkent, and the site must agree with the room, not with their laptop. So
 * "today" is formatted into an Asia/Tashkent calendar date first, and only then
 * compared with the conference dates as plain YYYY-MM-DD strings.
 */

const MS_PER_DAY = 86_400_000;

/** The calendar date in the conference timezone, as YYYY-MM-DD. */
export function zonedDate(epochMs: number, timeZone: string = CONFERENCE_DATES.timezone): string {
  // en-CA formats as YYYY-MM-DD, which sorts and parses cleanly.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
}

/** Whole days between two YYYY-MM-DD dates, treating both as UTC midnight. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

export type ConferencePhase =
  | { kind: 'before'; daysUntil: number; label: string }
  | { kind: 'during'; day: number; totalDays: number; label: string }
  | { kind: 'after'; label: string };

export function conferencePhase(now: number = Date.now()): ConferencePhase {
  const today = zonedDate(now);
  const start: string = CONFERENCE_DATES.start;
  const end: string = CONFERENCE_DATES.end;

  if (today < start) {
    const daysUntil = daysBetween(today, start);
    return {
      kind: 'before',
      daysUntil,
      label: `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} until ${CONFERENCE.name}`,
    };
  }

  if (today <= end) {
    return {
      kind: 'during',
      day: daysBetween(start, today) + 1,
      totalDays: daysBetween(start, end) + 1,
      label: `Day ${daysBetween(start, today) + 1}`,
    };
  }

  return { kind: 'after', label: `Thank you for attending ${CONFERENCE.edition}` };
}

/** "October 15–16, 2026", collapsing the month and year when they are shared. */
export function formatDateRange(): string {
  // Widened from the config's literal types so the comparisons below are
  // real runtime checks rather than something TypeScript folds away.
  const start: string = CONFERENCE_DATES.start;
  const end: string = CONFERENCE_DATES.end;
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);

  const month = (date: Date) =>
    new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(date);
  const day = (date: Date) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' }).format(date);
  const year = (date: Date) =>
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' }).format(date);

  if (start === end) return `${month(startDate)} ${day(startDate)}, ${year(startDate)}`;

  // En dash, and no repeated month when both days fall in the same one.
  if (month(startDate) === month(endDate) && year(startDate) === year(endDate)) {
    return `${month(startDate)} ${day(startDate)}–${day(endDate)}, ${year(startDate)}`;
  }
  if (year(startDate) === year(endDate)) {
    return `${month(startDate)} ${day(startDate)} – ${month(endDate)} ${day(endDate)}, ${year(startDate)}`;
  }
  return `${month(startDate)} ${day(startDate)}, ${year(startDate)} – ${month(endDate)} ${day(endDate)}, ${year(endDate)}`;
}
