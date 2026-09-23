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
  venue: 'Tashkent International School',
  /** The school hosting the conference — the secondary mark beside TISMUN's. */
  host: 'Tashkent International School',
  hostShort: 'TIS',
  /** Where delegates are told to write when something is missing. */
  secretariatEmail: 'secretariat@tismun.uz',
} as const;

/**
 * When the conference runs.
 *
 * Dates are plain YYYY-MM-DD in the conference's own timezone, never
 * timestamps: "15 October in Tashkent" must mean the same thing to a delegate
 * whose laptop is set to London. Everything date-related — the countdown, the
 * Day 1 / Day 2 label, session log timestamps and exports — is resolved in
 * `timezone` rather than in the viewer's local time.
 */
export const CONFERENCE_DATES = {
  start: '2026-10-15',
  end: '2026-10-16',
  timezone: 'Asia/Tashkent',
} as const;

/**
 * Optional school Google Workspace domain, e.g. 'tashkentis.uz'. Only used to
 * name the domain in the login hint; blank simply leaves the domain out of the
 * sentence. Whether a domain is actually enforced is decided server-side by
 * SCHOOL_DOMAIN, and who gets in is decided by the Users sheet.
 */
export const SCHOOL_DOMAIN: string = import.meta.env.VITE_SCHOOL_DOMAIN || '';

/** Google OAuth client ID. Public by design; blank disables Google sign-in. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/** 'demo' reads the mock JSON in the browser; 'live' calls /api/*. */
export const DATA_MODE: 'demo' | 'live' =
  import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'demo';

export const COPY = {
  login: {
    heading: `Sign in to ${CONFERENCE.name}`,
    subtext: 'Use your school Google account.',
    googleButton: 'Sign in with Google',
    googleNotConfigured: 'Not configured yet',
    googleNotConfiguredHint:
      'Google sign-in switches on once the Secretariat adds the OAuth client ID.',
    wrongDomain: 'Please sign in with your school Google account.',
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
