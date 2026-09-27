// Shared by the site and the Pages Functions, so the two can never disagree
// about which categories exist. Keep ids in sync with the CHECK in schema.sql.

export const CATEGORIES = [
  { id: 'network', label: 'Wi-Fi & network' },
  { id: 'classroom', label: 'Classroom tech' },
  { id: 'apps', label: 'Apps & software' },
  { id: 'campus', label: 'Smart campus / facilities' },
  { id: 'other', label: 'Other' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as readonly CategoryId[];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const SUGGESTION_MIN = 10;
export const SUGGESTION_MAX = 1000;
export const NAME_MAX = 80;
export const GRADE_MAX = 20;
