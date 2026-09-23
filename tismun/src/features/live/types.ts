import type { TimerState } from '@/lib/timer';
import type {
  Amendment,
  Attendance,
  Award,
  LogEntry,
  Motion,
  Resolution,
  SessionStatus,
  VoteSession,
} from '@/features/chair/types';

/**
 * What one committee looks like to anyone watching from outside the room.
 *
 * Note that every timestamp in here — `updatedAt`, and the `startedAt` inside
 * each timer — is expressed in SERVER time, not in the clock of whichever
 * laptop produced it. A chair's machine can be minutes off; translating on the
 * way in and out is what stops a caucus clock reading differently in the room
 * and on the Secretariat's phone.
 */
export interface LiveSummary {
  committeeId: string;
  status: SessionStatus;
  /** Caucus topic or purpose — the line under the status. */
  detail: string;
  updatedAt: number;
  present: number;
  presentAndVoting: number;
  total: number;
  quorum: boolean;
  rollCallTakenAt: number | null;
  currentSpeaker: { country: string; countryCode: string | null } | null;
  primaryTimer: { label: string; timer: TimerState } | null;
  secondaryTimer: { label: string; timer: TimerState } | null;
  motionsOnFloor: number;
  resolutionCount: number;
  /** What the committee is voting on, when it is in voting procedure. */
  voteSubject: string | null;
  /**
   * Awards given so far, `awardedAt` in server time. Optional because a
   * committee that last reported before awards existed has none stored.
   */
  awards?: Award[];
}

export interface LiveDelegation {
  id: string;
  country: string;
  countryCode: string | null;
  attendance: Attendance;
}

/** The full read-only view of one committee. */
export interface LiveSnapshot {
  summary: LiveSummary;
  roster: LiveDelegation[];
  queue: { country: string; countryCode: string | null }[];
  motions: Motion[];
  resolutions: Resolution[];
  amendments: Amendment[];
  vote: VoteSession | null;
  log: LogEntry[];
}

/** One committee's log entry, carrying which committee it came from. */
export interface LiveLogEntry extends LogEntry {
  committeeId: string;
}

/** What the chair's browser POSTs on each change. */
export interface LivePush {
  /** Which device is reporting; only the device holding the committee may. */
  deviceId: string;
  /** The full session in server time, so another device can take over from it. */
  chairState: unknown;
  summary: LiveSummary;
  snapshot: LiveSnapshot;
  /** Only recent entries; the server keeps the full history. */
  log: LogEntry[];
}

/** GET /api/live */
export interface LiveOverview {
  /** false when no D1 database is bound — the site still works, locally only. */
  configured: boolean;
  serverNow: number;
  committees: LiveSummary[];
  log: LiveLogEntry[];
  /** Set when sync is configured but failing, e.g. the tables are missing. */
  error?: string;
}

/** GET /api/live/:committeeId */
export interface LiveDetail {
  configured: boolean;
  serverNow: number;
  snapshot: LiveSnapshot | null;
  error?: string;
}

/** The device currently running a committee, as another chair's device sees it. */
export interface ControlHolder {
  /** The chair's name from the sheet; null on a demo deployment. */
  name: string | null;
  heartbeatAt: number;
  /** The claim has lapsed: that device has gone quiet, so anyone may pick it up. */
  stale: boolean;
}

/** POST /api/control/:committeeId */
export interface ControlClaim {
  configured: boolean;
  serverNow: number;
  acquired?: boolean;
  holder?: ControlHolder | null;
  /** The session to carry on from, when another device last reported it. */
  state?: unknown;
  error?: string;
}

/** GET /api/control/:committeeId */
export interface ControlStatus {
  configured: boolean;
  serverNow: number;
  holder?: ControlHolder | null;
  isYou?: boolean;
  summary?: LiveSummary | null;
  error?: string;
}

/** How long before a committee that has stopped reporting is flagged as stale. */
export const STALE_AFTER_MS = 30_000;
