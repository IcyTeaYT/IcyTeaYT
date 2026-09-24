import { readJson } from '@/lib/storage';
import { emptyPresentation, knownMotions, type ChairData } from '@/features/chair/store';
import { buildLiveSnapshot, buildLiveSummary } from './snapshot';
import type { LiveLogEntry, LiveOverview, LiveSnapshot } from './types';
import { useConferenceStatus } from '@/store/conferenceStatus';

/**
 * The same-browser fallback.
 *
 * With no D1 binding the Secretariat can still see every committee whose chair
 * is running in this browser, because zustand's `persist` has already written
 * each one to localStorage. That covers a single-laptop demo and a chair with
 * several tabs open; it cannot, by construction, see another device.
 */

const STORAGE_PREFIX = 'tismun.chair.';

interface PersistedEnvelope {
  state?: Partial<ChairData>;
  version?: number;
}

/** Read one committee's persisted session, or null if it has never been used. */
function readCommittee(committeeId: string): ChairData | null {
  const envelope = readJson<PersistedEnvelope | null>(`${STORAGE_PREFIX}${committeeId}`, null);
  const state = envelope?.state;
  // A committee whose chair has never opened the dashboard has no roster, and
  // reporting it as "0 of 0 present" would be worse than omitting it.
  if (!state?.names || Object.keys(state.names).length === 0) return null;
  // Held from before the Secretariat reset every session: it no longer counts.
  const resetAt = useConferenceStatus.getState().status?.sessionsResetAt ?? null;
  const resetEpoch = typeof state.resetEpoch === 'number' ? state.resetEpoch : 0;
  if (resetAt !== null && resetEpoch < resetAt) return null;

  return {
    names: state.names,
    codes: state.codes ?? {},
    rollCallTakenAt: state.rollCallTakenAt ?? null,
    attendance: state.attendance ?? {},
    gsl: state.gsl as ChairData['gsl'],
    unmoderated: state.unmoderated as ChairData['unmoderated'],
    presentation: { ...emptyPresentation(), ...state.presentation },
    presentationsHeld: state.presentationsHeld ?? 0,
    briefingsHeld: state.briefingsHeld ?? 0,
    unmoderatedHeld: state.unmoderatedHeld ?? 0,
    motions: knownMotions(state.motions ?? []),
    resolutions: state.resolutions ?? [],
    amendments: state.amendments ?? [],
    vote: state.vote ?? null,
    awards: state.awards ?? [],
    log: state.log ?? [],
    resetEpoch,
  };
}

export function localOverview(committeeIds: string[]): LiveOverview {
  const committees = [];
  const log: LiveLogEntry[] = [];

  for (const committeeId of committeeIds) {
    const state = readCommittee(committeeId);
    if (!state) continue;
    // Offset zero: this is the same device, so its clock already agrees.
    committees.push(buildLiveSummary(state, committeeId, 0));
    for (const entry of state.log) log.push({ ...entry, committeeId });
  }

  return {
    configured: false,
    serverNow: Date.now(),
    committees,
    log: log.sort((a, b) => b.at - a.at).slice(0, 120),
  };
}

export function localSnapshot(committeeId: string): LiveSnapshot | null {
  const state = readCommittee(committeeId);
  return state ? buildLiveSnapshot(state, committeeId, 0) : null;
}
