/**
 * What an account may do RIGHT NOW. A person's role changes between the two
 * days of the conference, so this depends on whether Day 2 has begun.
 *
 * The server works this out on every request, from the sheet and its own
 * clock, and enforces it; the browser is only ever told the answer, to decide
 * what to show. (This file is read by both, so it must stay free of browser-
 * only code and of the "@/" import alias.)
 *
 *                         Day 1                    Day 2 (from focusFrom)
 *   Day 1 chair           runs their committee     reads it (read-only); runs
 *                                                  the Emergency Session only
 *                                                  if marked its chair
 *   Emergency chair       their Day 1 role         runs the Emergency Session
 *   Secretariat           oversight                oversight — always — plus the
 *                                                  Emergency Session if marked
 *                                                  its chair
 *   Delegate              their committee          their committee, or the
 *                                                  Emergency Session
 *
 * An owner (OWNER_EMAILS on the server) keeps whatever the sheet gives them and
 * gets Secretariat oversight on top, plus the sign-in log.
 */

import { emergencySession } from '../config/emergency';

export interface Access {
  day: 1 | 2;
  /** Oversight of the whole conference. Never lost, on either day. */
  secretariat: boolean;
  /** The one committee this account may run — write to — right now. */
  chairOf: string | null;
  /** A Day 1 committee this account chaired, open read-only from Day 2. */
  readOnlyChairOf: string | null;
  /** Listed in OWNER_EMAILS: Secretariat oversight on top of their own role, and the sign-in log. */
  owner: boolean;
}

export interface AccessInput {
  /** The Role column: the Day 1 role. */
  role: string | null | undefined;
  /** The Committee ID column: the Day 1 committee. */
  committeeId: string | null | undefined;
  /** The Emergency Role column. */
  emergencyRole: 'DELEGATE' | 'CHAIR' | null;
  /** Listed in OWNER_EMAILS. Only the server can know this. */
  owner?: boolean;
}

export function accessFor(input: AccessInput, day2: boolean): Access {
  const role = (input.role ?? '').trim().toUpperCase();
  const owner = input.owner === true;
  const secretariat = role === 'SECRETARIAT' || role === 'ADMIN' || owner;
  const committeeId = (input.committeeId ?? '').trim();
  const day1Chair = role === 'CHAIR' && committeeId ? committeeId : null;

  if (!day2) return { day: 1, secretariat, chairOf: day1Chair, readOnlyChairOf: null, owner };

  const emergencyChair = input.emergencyRole === 'CHAIR' ? emergencySession.committeeId : null;
  return {
    day: 2,
    secretariat,
    chairOf: emergencyChair,
    readOnlyChairOf: day1Chair && day1Chair !== emergencyChair ? day1Chair : null,
    owner,
  };
}

/** May this account change the committee's session right now? */
export const canRun = (access: Access, committeeId: string): boolean => access.chairOf === committeeId;

/** May this account look at the committee's full session — to run it, read it, or oversee it? */
export const canView = (access: Access, committeeId: string): boolean =>
  access.secretariat || access.chairOf === committeeId || access.readOnlyChairOf === committeeId;
