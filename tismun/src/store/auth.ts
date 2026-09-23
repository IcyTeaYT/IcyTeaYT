import { create } from 'zustand';
import { DATA_MODE } from '@/config/conference';
import { dataSource } from '@/data/source';
import type { User } from '@/data/source/types';
import { readJson, removeKey, writeJson } from '@/lib/storage';

/**
 * Who is signed in.
 *
 * In demo mode the chosen account is remembered in localStorage so a refresh
 * doesn't kick you back to the login page. In live mode nothing is remembered
 * client-side: identity lives in the HttpOnly session cookie and the server is
 * asked afresh on every boot, so the browser can never promote itself.
 */

const DEMO_EMAIL_KEY = 'tismun.demo-email';

type Status = 'booting' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: Status;
  user: User | null;
  error: string | null;
  /** Resolve the session on app boot. Resolves once the status is settled. */
  restore: () => Promise<void>;
  /** Demo mode only: adopt a known mock account. */
  signInAs: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'booting',
  user: null,
  error: null,

  async restore() {
    try {
      if (DATA_MODE === 'live') {
        const user = await dataSource.getMe('');
        set(user ? { status: 'authenticated', user } : { status: 'unauthenticated', user: null });
        return;
      }

      const email = readJson<string | null>(DEMO_EMAIL_KEY, null);
      if (!email) {
        set({ status: 'unauthenticated', user: null });
        return;
      }
      const user = await dataSource.getMe(email);
      if (user) {
        set({ status: 'authenticated', user });
      } else {
        // The mock data changed under a remembered account — drop it quietly.
        removeKey(DEMO_EMAIL_KEY);
        set({ status: 'unauthenticated', user: null });
      }
    } catch {
      set({ status: 'unauthenticated', user: null });
    }
  },

  async signInAs(email) {
    const user = await dataSource.getMe(email);
    if (!user) {
      set({ error: 'That account is not on the conference roster.' });
      return false;
    }
    writeJson(DEMO_EMAIL_KEY, user.email);
    set({ status: 'authenticated', user, error: null });
    return true;
  },

  async signOut() {
    removeKey(DEMO_EMAIL_KEY);
    if (DATA_MODE === 'live') {
      // Clears the HttpOnly cookie; the browser cannot do this itself.
      try {
        await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
      } catch {
        /* offline — the cookie expires on its own */
      }
    }
    set({ status: 'unauthenticated', user: null, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));

/** Has a Chair Dashboard to open — one they run now, or a Day 1 one to read back. */
export const isChair = (user: User | null): boolean =>
  Boolean(user?.access.chairOf || user?.access.readOnlyChairOf);

/** Oversees the conference. Kept on both days, whatever else the account does. */
export const isSecretariat = (user: User | null): boolean => user?.access.secretariat === true;

/** The committee whose dashboard this account opens: the one it runs, else the Day 1 one it reads. */
export const chairCommitteeOf = (user: User | null): string | null =>
  user?.access.chairOf ?? user?.access.readOnlyChairOf ?? null;
