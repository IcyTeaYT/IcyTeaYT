/**
 * The conference is over, and the site is closed.
 *
 * While `closed` is true, everyone who opens the site is told so, and nobody
 * can sign in — except the site's owners (OWNER_EMAILS on the server). The
 * page shows no way in; an owner signs in at /login?owner, sees the same
 * message, and is asked whether to go in anyway. The server enforces
 * it on every request, so an old sign-in left open on someone's laptop stops
 * working too. Nothing is deleted: the Google Sheet, the database and every
 * setting stay exactly as they are.
 *
 * To open the site for the next conference, set `closed` to false (and update
 * the dates and copy in conference.ts).
 *
 * Read by both the browser and the server, so it must stay free of anything
 * browser-only.
 */
export const SITE_CLOSED = {
  closed: true,
  title: 'TISMUN 2026 is over',
  message:
    'Thank you to every delegate, chair and member of the Secretariat who took part. Sign-in is closed until the next conference.',
  /** What the server says to anyone else who tries to sign in or use the site. */
  refusal: 'TISMUN 2026 is over, so sign-in is closed. Thank you for taking part!',
} as const;
