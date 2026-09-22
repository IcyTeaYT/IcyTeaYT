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

/** Wall-clock time of day for the session log, e.g. "14:32:07". */
export function formatTimeOfDay(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
