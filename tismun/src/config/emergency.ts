/**
 * The Emergency Session: the committee that meets on Day 2, whose topic and
 * background paper stay secret until the morning it sits.
 *
 * Both times are checked against the SERVER's clock, never a browser's, so
 * changing a device's date does nothing. Change them here; nothing else needs
 * editing. (This file is read by the browser and by the Pages Functions, so it
 * must stay free of browser-only code.)
 */
export const emergencySession = {
  /** The committee's id — its "Committee ID" in the Committees tab. */
  committeeId: 'emergency',

  /**
   * From this moment Day 2 applies: Emergency Session delegates see it as
   * their main committee, and everyone's Day 2 role takes effect.
   */
  focusFrom: '2026-10-16T08:30:00+05:00',

  /**
   * From this moment the topic, description and background paper are released
   * — automatically, with nobody pressing anything. The Secretariat has a
   * "Release now" / "Un-release" override purely as a backup.
   */
  releaseAt: '2026-10-16T08:30:00+05:00',

  /** How the release time is written for delegates. */
  releaseLabel: '16 October at 8:30 AM',

  /** Default purpose of an Unmoderated Caucus in this committee. */
  unmoderatedPurpose: 'Writing the draft resolution',

  /** How often open pages check whether the topic has been released. */
  pollMs: 30_000,
} as const;

export const FOCUS_FROM_MS = Date.parse(emergencySession.focusFrom);
export const RELEASE_AT_MS = Date.parse(emergencySession.releaseAt);

export const isEmergency = (committeeId: string | null | undefined): boolean =>
  committeeId === emergencySession.committeeId;

/** An override the Secretariat can set, or 'auto' to follow the schedule. */
export type ReleaseMode = 'auto' | 'released' | 'locked';
export type FocusMode = 'auto' | 'on' | 'off';

/** Where the conference stands, as the server sees it. */
export interface ConferenceStatus {
  serverNow: number;
  releaseAt: number;
  focusFrom: number;
  releaseMode: ReleaseMode;
  focusMode: FocusMode;
  /** The topic and background paper are available. */
  released: boolean;
  /** Day 2 roles and Day 2 focus apply. */
  day2: boolean;
  /**
   * When the Secretariat last reset every committee's session (server time),
   * or null if it never has. A chair's device holding an older session wipes
   * it; the server refuses reports from one that has not.
   */
  sessionsResetAt: number | null;
}

export function conferenceStatus(
  now: number,
  releaseMode: ReleaseMode,
  focusMode: FocusMode,
  sessionsResetAt: number | null = null,
): ConferenceStatus {
  return {
    serverNow: now,
    releaseAt: RELEASE_AT_MS,
    focusFrom: FOCUS_FROM_MS,
    releaseMode,
    focusMode,
    released: releaseMode === 'released' || (releaseMode === 'auto' && now >= RELEASE_AT_MS),
    day2: focusMode === 'on' || (focusMode === 'auto' && now >= FOCUS_FROM_MS),
    sessionsResetAt,
  };
}

/** The Secretariat's backup buttons. */
export type OverrideAction =
  | 'release-now'
  | 'unrelease'
  | 'release-auto'
  | 'day2-now'
  | 'day2-hold'
  | 'day2-auto';

export const OVERRIDE_ACTIONS: readonly OverrideAction[] = [
  'release-now',
  'unrelease',
  'release-auto',
  'day2-now',
  'day2-hold',
  'day2-auto',
];

export type Override =
  | { target: 'release'; value: ReleaseMode; label: string }
  | { target: 'focus'; value: FocusMode; label: string };

/**
 * What a button stores, at this moment. Undoing an early release, or an early
 * Day 2, before its scheduled time goes back to the schedule — so it still
 * happens on its own when the time comes. Only after the scheduled time does
 * undoing hold anything back.
 */
export function overrideFor(action: OverrideAction, now: number): Override {
  const beforeRelease = now < RELEASE_AT_MS;
  const beforeDay2 = now < FOCUS_FROM_MS;
  switch (action) {
    case 'release-now':
      return beforeRelease
        ? { target: 'release', value: 'released', label: 'Emergency Session topic released early' }
        : { target: 'release', value: 'auto', label: 'Emergency Session topic released' };
    case 'unrelease':
      return beforeRelease
        ? { target: 'release', value: 'auto', label: 'Topic un-released — it releases on schedule' }
        : { target: 'release', value: 'locked', label: 'Topic un-released — locked until released again' };
    case 'release-auto':
      return { target: 'release', value: 'auto', label: 'Topic release returned to the schedule' };
    case 'day2-now':
      return beforeDay2
        ? { target: 'focus', value: 'on', label: 'Switched to Day 2 early' }
        : { target: 'focus', value: 'auto', label: 'Switched to Day 2' };
    case 'day2-hold':
      return beforeDay2
        ? { target: 'focus', value: 'auto', label: 'Back to Day 1 — Day 2 begins on schedule' }
        : { target: 'focus', value: 'off', label: 'Back to Day 1 — held until switched again' };
    case 'day2-auto':
      return { target: 'focus', value: 'auto', label: 'Day 2 returned to the schedule' };
  }
}
