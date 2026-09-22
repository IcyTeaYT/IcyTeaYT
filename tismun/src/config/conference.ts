/**
 * Conference identity and all user-facing copy that isn't committee data.
 * Edit this file to rebrand the site — no component changes needed.
 */

export const CONFERENCE = {
  /** Short name used in the nav, the projector and page titles. */
  name: 'TISMUN',
  /** Spelled out, used on the login page and in footers. */
  fullName: 'Tashkent International School Model United Nations',
  /** The current edition, shown under the wordmark on the login page. */
  edition: 'TISMUN 2026',
  /** Shown on the login page under the edition. Set to '' to hide. */
  dates: '13 – 15 March 2026',
  venue: 'Tashkent International School',
  /** Where delegates are told to write when something is missing. */
  secretariatEmail: 'secretariat@tismun.uz',
} as const;

/**
 * The school Google Workspace domain, e.g. 'tashkentis.uz'.
 * This copy is only used for the hint delegates read on the login page — the
 * binding check happens server-side in functions/api/session.ts using the
 * SCHOOL_DOMAIN secret, which is never exposed to the browser.
 */
export const SCHOOL_DOMAIN = import.meta.env.VITE_SCHOOL_DOMAIN || 'your-school.edu';

/** Google OAuth client ID. Public by design; blank disables Google sign-in. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/** 'demo' reads the mock JSON in the browser; 'live' calls /api/*. */
export const DATA_MODE: 'demo' | 'live' =
  import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'demo';

export const COPY = {
  login: {
    heading: `Sign in to ${CONFERENCE.name}`,
    subtext: 'Use your school account.',
    googleButton: 'Sign in with Google',
    googleNotConfigured: 'Not configured yet',
    googleNotConfiguredHint:
      'Google sign-in switches on once the Secretariat adds the OAuth client ID.',
    wrongDomain: 'Please sign in with your school account.',
    demoHeading: 'Demo access',
    demoSubtext: 'Development only. This section disappears in live mode.',
  },
  home: {
    greeting: (firstName: string) => `Welcome to ${CONFERENCE.name}, ${firstName}`,
    subtext: 'Below are your committee, delegation, and background paper.',
    unassignedTitle: 'You haven’t been assigned yet',
    unassignedBody: `Check back soon or contact the Secretariat at ${CONFERENCE.secretariatEmail}.`,
  },
  committees: {
    heading: 'Committees',
    subtext: 'Every committee at this year’s conference, with its background paper.',
    searchPlaceholder: 'Search committees or topics',
    yourCommittee: 'Your committee',
    noResults: 'No committees match that search.',
  },
  paper: {
    view: 'View paper',
    download: 'Download',
    missing: 'The background paper for this committee is not published yet.',
  },
  errors: {
    notFoundTitle: 'Page not found',
    notFoundBody: 'That page doesn’t exist, or it has moved.',
    deniedTitle: 'Access denied',
    deniedBody: 'The Chair Dashboard is only available to committee chairs.',
    backHome: 'Back to home',
  },
} as const;
