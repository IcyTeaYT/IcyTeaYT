// TISMUN feedback, shared by the form and the Pages Function so the two agree.
// Keep the role ids in sync with the CHECK in schema.sql.

export const FEEDBACK_ROLES = [
  { id: 'delegate', label: 'Delegate' },
  { id: 'chair', label: 'Chair' },
  { id: 'staff', label: 'Staff' },
  { id: 'guest', label: 'Guest' },
] as const;

export type FeedbackRole = (typeof FEEDBACK_ROLES)[number]['id'];
export const FEEDBACK_ROLE_IDS = FEEDBACK_ROLES.map((r) => r.id) as readonly FeedbackRole[];

export function roleLabel(id: string): string {
  return FEEDBACK_ROLES.find((r) => r.id === id)?.label ?? id;
}

export const FEEDBACK_COMMENT_MAX = 1000;
export const FEEDBACK_NAME_MAX = 80;
