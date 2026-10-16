import type { EmergencyAssignment } from '@/data/source/types';

/**
 * Sits in the Emergency Session for a country: a delegate, or a chair whom the
 * sheet also gives a country — they chair it and sit in it for that country.
 */
export const isEmergencyDelegate = (emergency: EmergencyAssignment | null | undefined): boolean =>
  Boolean(emergency?.country);
