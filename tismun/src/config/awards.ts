import { isEmergency } from './emergency';

/**
 * The awards a chair gives at the close of the conference. Each committee gives
 * each award once, and one delegation cannot hold both. The Emergency Session
 * gives none.
 */
export type AwardType = 'best-delegate' | 'honorable-mention';

export interface AwardDefinition {
  type: AwardType;
  label: string;
  description: string;
}

export const AWARDS: AwardDefinition[] = [
  {
    type: 'best-delegate',
    label: 'Best Delegate',
    description: 'The committee’s highest award.',
  },
  {
    type: 'honorable-mention',
    label: 'Honorable Mention',
    description: 'Recognition for an outstanding delegation.',
  },
];

export const AWARD_LABEL: Record<AwardType, string> = {
  'best-delegate': 'Best Delegate',
  'honorable-mention': 'Honorable Mention',
};

/** Whether a committee gives awards. Every committee does but the Emergency Session. */
export const givesAwards = (committeeId: string | null | undefined): boolean => !isEmergency(committeeId);
