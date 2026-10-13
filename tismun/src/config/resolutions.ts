/**
 * Which pre-written draft resolution each committee debates, per topic.
 *
 * Committees that share a topic share its resolution: both HSCs, and the two
 * English-language HRCs. HRC RU debates the Russian translations. The
 * Emergency Session has none — its delegates write theirs on the site.
 *
 * (Read by the browser and by the Pages Functions, so no "@/" imports.)
 */

import type { ResolutionText, TopicNo } from '../lib/resolution';
import { emergencySession } from './emergency';
import { RESOLUTION_TEXTS } from './resolutionTexts';

const BY_COMMITTEE: Record<string, [string, string]> = {
  'hsc-1': ['hsc-t1', 'hsc-t2'],
  'hsc-2': ['hsc-t1', 'hsc-t2'],
  sc: ['sc-t1', 'sc-t2'],
  'ga-2': ['ga2-t1', 'ga2-t2'],
  'ga-3': ['ga3-t1', 'ga3-t2'],
  'hrc-1': ['hrc-t1', 'hrc-t2'],
  'hrc-2': ['hrc-t1', 'hrc-t2'],
  'hrc-russian': ['hrc-ru-t1', 'hrc-ru-t2'],
};

/** The Emergency Session writes its resolution during the session, from blank. */
export const writesOwnResolution = (committeeId: string): boolean => committeeId === emergencySession.committeeId;

/** The topics a committee debates, in order. */
export const topicsOf = (committeeId: string): TopicNo[] => (writesOwnResolution(committeeId) ? [1] : [1, 2]);

/** The pre-written resolution for a committee's topic, or null if there is none. */
export function preWrittenResolution(committeeId: string, topic: TopicNo): ResolutionText | null {
  const key = BY_COMMITTEE[committeeId]?.[topic - 1];
  return key ? (RESOLUTION_TEXTS[key] ?? null) : null;
}

/** What an Emergency Session copy starts from: nothing but the topic. */
export const blankResolution = (topic: string): ResolutionText => ({
  language: 'en',
  topic,
  mainSubmitters: [],
  coSubmitters: [],
  clauses: [],
});

/** Every committee that debates resolutions on the site. */
export const hasResolutions = (committeeId: string): boolean =>
  committeeId in BY_COMMITTEE || writesOwnResolution(committeeId);
