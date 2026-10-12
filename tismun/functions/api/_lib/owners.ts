import type { Env } from './env';

/** The OWNER_EMAILS list, lower-cased. Commas, semicolons or spaces separate it. */
const ownersOf = (env: Env): Set<string> =>
  new Set(
    (env.OWNER_EMAILS ?? '')
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

/** Is this account one of the site's owners? */
export const isOwner = (env: Env, email: string | null | undefined): boolean =>
  Boolean(email) && ownersOf(env).has((email ?? '').trim().toLowerCase());
