/**
 * Background papers published one per topic, in public/papers/.
 *
 * To publish one: add the PDF to public/papers/ named
 * `<committee-id>-topic-<1|2>.pdf` (or a shared name when committees share a
 * paper) and list it here. A committee listed here
 * shows a paper per topic; any other committee shows the single paper in the
 * Committees tab's "Background Paper URL" column.
 */
export const TOPIC_PAPERS: Record<string, Partial<Record<1 | 2, string>>> = {
  'ga-2': { 1: '/papers/ga-2-topic-1.pdf', 2: '/papers/ga-2-topic-2.pdf' },
  'ga-3': { 1: '/papers/ga-3-topic-1.pdf', 2: '/papers/ga-3-topic-2.pdf' },
  // Each HRC's chairs wrote their own papers.
  'hrc-1': { 1: '/papers/hrc-1-topic-1.pdf', 2: '/papers/hrc-1-topic-2.pdf' },
  'hrc-2': { 1: '/papers/hrc-2-topic-1.pdf', 2: '/papers/hrc-2-topic-2.pdf' },
  'hrc-russian': { 1: '/papers/hrc-russian-topic-1.pdf', 2: '/papers/hrc-russian-topic-2.pdf' },
  // The HSC chairs split the writing: one paper per topic, shared by both HSCs.
  'hsc-1': { 1: '/papers/hsc-topic-1.pdf', 2: '/papers/hsc-topic-2.pdf' },
  'hsc-2': { 1: '/papers/hsc-topic-1.pdf', 2: '/papers/hsc-topic-2.pdf' },
  sc: { 1: '/papers/sc-topic-1.pdf', 2: '/papers/sc-topic-2.pdf' },
};
