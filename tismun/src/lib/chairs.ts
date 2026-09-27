/**
 * Who chairs each committee, read from the Users tab, so the names shown on
 * the site always match who actually has chair access — there is no second
 * list to keep in step. (Read by the browser and by the Pages Functions, so it
 * must stay free of browser-only code and of the "@/" import alias.)
 *
 *   Day 1 committees     Role CHAIR + that Committee ID
 *   Emergency Session    Emergency Role CHAIR
 *
 * Names come in the order they appear in the Users tab. A committee with
 * nobody marked keeps whatever its Chairs cell in the Committees tab says.
 */

import { emergencySession } from '../config/emergency';

interface ChairSource {
  Role?: string;
  'Committee ID'?: string;
  'Full Name'?: string;
  'Emergency Role'?: string;
}

const clean = (value: string | undefined): string => (value ?? '').trim();

export function chairNamesByCommittee(users: readonly ChairSource[]): Map<string, string[]> {
  const byCommittee = new Map<string, string[]>();
  const add = (committeeId: string, name: string) => {
    if (!committeeId || !name) return;
    const names = byCommittee.get(committeeId) ?? [];
    if (!names.includes(name)) names.push(name);
    byCommittee.set(committeeId, names);
  };
  for (const user of users) {
    const name = clean(user['Full Name']);
    if (clean(user.Role).toUpperCase() === 'CHAIR') add(clean(user['Committee ID']), name);
    if (clean(user['Emergency Role']).toUpperCase() === 'CHAIR') add(emergencySession.committeeId, name);
  }
  return byCommittee;
}

/** Each committee with its Chairs cell replaced by the names from the Users tab. */
export function withChairsFromUsers<T extends { 'Committee ID': string; Chairs: string }>(
  committees: readonly T[],
  users: readonly ChairSource[],
): T[] {
  const names = chairNamesByCommittee(users);
  return committees.map((committee) => {
    const chairs = names.get(clean(committee['Committee ID']));
    return chairs?.length ? { ...committee, Chairs: chairs.join('; ') } : committee;
  });
}
