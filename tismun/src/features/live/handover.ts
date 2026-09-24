import {
  emptyPresentation,
  knownMotions,
  type ChairData,
  type ChairState,
} from '@/features/chair/store';
import { shiftTimer } from './snapshot';

/**
 * The whole committee session, as it travels between devices on a takeover.
 *
 * Every timestamp is moved into server time on the way out and back into the
 * receiving device's clock on the way in. Two laptops' clocks can disagree by
 * minutes; without this a running caucus would jump forward or back when the
 * other chair took over.
 */

const CHAIR_DATA_KEYS = [
  'names',
  'codes',
  'rollCallTakenAt',
  'attendance',
  'gsl',
  'unmoderated',
  'presentation',
  'presentationsHeld',
  'briefingsHeld',
  'unmoderatedHeld',
  'motions',
  'resolutions',
  'amendments',
  'vote',
  'awards',
  'log',
  'resetEpoch',
] as const satisfies readonly (keyof ChairData)[];

/** Plenty for a two-day conference; keeps the stored session bounded. */
const HANDOVER_LOG_LIMIT = 1000;

export function pickChairData(state: ChairState): ChairData {
  const data = {} as Record<string, unknown>;
  for (const key of CHAIR_DATA_KEYS) data[key] = state[key];
  return data as ChairData;
}

const shiftOptional = (value: number | null, deltaMs: number): number | null =>
  value === null ? null : value + deltaMs;

/** Move every timestamp in a session by `deltaMs`. */
export function shiftChairData(data: ChairData, deltaMs: number): ChairData {
  return {
    ...data,
    rollCallTakenAt: shiftOptional(data.rollCallTakenAt, deltaMs),
    gsl: { ...data.gsl, timer: shiftTimer(data.gsl.timer, deltaMs) },
    unmoderated: { ...data.unmoderated, timer: shiftTimer(data.unmoderated.timer, deltaMs) },
    presentation: { ...data.presentation, timer: shiftTimer(data.presentation.timer, deltaMs) },
    motions: data.motions.map((motion) => ({
      ...motion,
      raisedAt: motion.raisedAt + deltaMs,
      decidedAt: shiftOptional(motion.decidedAt, deltaMs),
    })),
    resolutions: data.resolutions.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt + deltaMs,
    })),
    amendments: data.amendments.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt + deltaMs,
    })),
    vote: data.vote ? { ...data.vote, startedAt: data.vote.startedAt + deltaMs } : null,
    awards: (data.awards ?? []).map((award) => ({
      ...award,
      awardedAt: award.awardedAt + deltaMs,
    })),
    log: data.log.map((entry) => ({ ...entry, at: entry.at + deltaMs })),
  };
}

/** This device's session, ready to store on the server. */
export function toHandover(state: ChairState, offsetToServer: number): ChairData {
  const data = pickChairData(state);
  return shiftChairData({ ...data, log: data.log.slice(0, HANDOVER_LOG_LIMIT) }, offsetToServer);
}

/**
 * A session received from the server, in this device's clock. Anything the
 * sender's version predates (a field added since) falls back to empty.
 */
export function fromHandover(raw: unknown, offsetToServer: number): ChairData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<ChairData>;
  if (!data.gsl || !data.unmoderated) return null;
  return shiftChairData(
    {
      names: data.names ?? {},
      codes: data.codes ?? {},
      rollCallTakenAt: data.rollCallTakenAt ?? null,
      attendance: data.attendance ?? {},
      gsl: data.gsl,
      unmoderated: data.unmoderated,
      presentation: { ...emptyPresentation(), ...data.presentation },
      presentationsHeld: data.presentationsHeld ?? 0,
      briefingsHeld: data.briefingsHeld ?? 0,
      unmoderatedHeld: data.unmoderatedHeld ?? 0,
      // Sent by a device on an older version, the session may still hold
      // motion types that have since been removed from the rules.
      motions: knownMotions(data.motions ?? []),
      resolutions: data.resolutions ?? [],
      amendments: data.amendments ?? [],
      vote: data.vote ?? null,
      awards: data.awards ?? [],
      log: data.log ?? [],
      // Server time already: not shifted with the rest.
      resetEpoch: typeof data.resetEpoch === 'number' ? data.resetEpoch : 0,
    },
    -offsetToServer,
  );
}
