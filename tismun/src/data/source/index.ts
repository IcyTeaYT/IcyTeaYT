import { DATA_MODE } from '@/config/conference';
import { liveSource } from './liveSource';
import { mockSource } from './mockSource';
import type { DataSource } from './types';

/**
 * The one place the app decides where data comes from.
 * Flip VITE_DATA_MODE between 'demo' and 'live' — nothing else changes.
 */
export const dataSource: DataSource = DATA_MODE === 'live' ? liveSource : mockSource;

export const isDemoMode = DATA_MODE === 'demo';

export * from './types';
export { firstNameOf } from './normalise';
