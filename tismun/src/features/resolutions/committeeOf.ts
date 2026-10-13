import { emergencySession } from '@/config/emergency';
import { hasResolutions } from '@/config/resolutions';
import type { User } from '@/data/source/types';

/**
 * The committee whose resolution a delegate works on today: their Day 1
 * committee, or from Day 2 — once its topic is out — the Emergency Session.
 * Null for anyone who does not amend a resolution (chairs use their dashboard).
 */
export function resolutionCommitteeOf(user: User | null, day2: boolean, released: boolean): string | null {
  if (!user) return null;
  if (user.emergency?.role === 'DELEGATE' && day2 && released) return emergencySession.committeeId;
  if (user.role === 'DELEGATE' && user.committeeId && hasResolutions(user.committeeId)) return user.committeeId;
  return null;
}
