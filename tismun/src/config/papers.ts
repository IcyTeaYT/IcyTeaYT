/**
 * Background papers published one per topic, in public/papers/.
 *
 * To publish one: add the PDF to public/papers/ named
 * `<committee-id>-topic-<1|2>.pdf` and list it here. A committee listed here
 * shows a paper per topic; any other committee shows the single paper in the
 * Committees tab's "Background Paper URL" column.
 */
export const TOPIC_PAPERS: Record<string, Partial<Record<1 | 2, string>>> = {
  'ga-2': { 1: '/papers/ga-2-topic-1.pdf' },
  'ga-3': { 1: '/papers/ga-3-topic-1.pdf', 2: '/papers/ga-3-topic-2.pdf' },
  'hrc-1': { 1: '/papers/hrc-1-topic-1.pdf', 2: '/papers/hrc-1-topic-2.pdf' },
  'hsc-1': { 1: '/papers/hsc-1-topic-1.pdf' },
  'hsc-2': { 2: '/papers/hsc-2-topic-2.pdf' },
};
