import { TOPIC_PAPERS } from '@/config/papers';
import type { Committee } from '@/data/source/types';

export interface Paper {
  /** "Topic 1", "Topic 2", or "Background paper" when there is one for the committee. */
  label: string;
  /** The topic it covers, when it is one topic's paper. */
  topic: string | null;
  url: string;
}

/** A committee's background papers: one per topic where published, else the single one. */
export function papersOf(committee: Committee): Paper[] {
  if (committee.locked) return [];
  const byTopic = TOPIC_PAPERS[committee.id];
  if (byTopic) {
    return ([1, 2] as const).flatMap((n) => {
      const url = byTopic[n];
      return url ? [{ label: `Topic ${n}`, topic: committee.topics[n - 1] || null, url }] : [];
    });
  }
  return committee.backgroundPaperUrl
    ? [{ label: 'Background paper', topic: null, url: committee.backgroundPaperUrl }]
    : [];
}
