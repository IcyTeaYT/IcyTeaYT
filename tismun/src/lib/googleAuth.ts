import { GOOGLE_CLIENT_ID } from '@/config/conference';

/**
 * Google Identity Services sign-in — the Phase 2 path, wired end to end and
 * waiting on configuration.
 *
 * ┌─ PHASE 2 SETUP ─────────────────────────────────────────────────────────┐
 * │ 1. Google Cloud console → APIs & Services → Credentials →               │
 * │    Create OAuth client ID → Web application.                            │
 * │ 2. Authorised JavaScript origins: https://<your-pages-domain>           │
 * │    (add http://localhost:5173 for local development).                   │
 * │ 3. Put the client ID in VITE_GOOGLE_CLIENT_ID, and the SAME value in    │
 * │    the server-side GOOGLE_CLIENT_ID variable so /api/session can check  │
 * │    the token's audience.                                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * The ID token returned here is NOT trusted by the frontend. It is posted
 * straight to /api/session, which verifies the signature, the audience, the
 * `hd` domain claim and `email_verified` before issuing a session cookie.
 * Nothing in this file decides who anyone is.
 */

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface CredentialResponse {
  credential?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'small' | 'medium' | 'large';
          text?: 'signin_with' | 'continue_with';
          shape?: 'rectangular' | 'pill';
          logo_alignment?: 'left' | 'center';
          width?: number;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export const isGoogleConfigured = (): boolean => GOOGLE_CLIENT_ID.trim().length > 0;

let scriptPromise: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  scriptPromise ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      if (window.google?.accounts?.id) resolve(window.google);
      else {
        scriptPromise = null;
        reject(new Error('Google Identity Services loaded but did not initialise.'));
      }
    });
    script.addEventListener('error', () => {
      scriptPromise = null;
      reject(new Error('Google Identity Services could not be reached.'));
    });
    if (!existing) document.head.append(script);
  });
  return scriptPromise;
}

/** Whoever is showing the button now; Google calls back through this. */
let credentialHandler: ((idToken: string) => void) | null = null;
let initialised = false;

/**
 * Draw Google's own button into `parent`. Resolves once it is on screen.
 * Safe to call again — to redraw at a new width, or after a failed load.
 */
export async function renderGoogleButton(
  parent: HTMLElement,
  onCredential: (idToken: string) => void,
): Promise<void> {
  const google = await loadGoogleIdentity();
  credentialHandler = onCredential;
  // Initialise once: Google warns when it is initialised again, and the
  // handler above lets a later caller take over the callback anyway.
  if (!initialised) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) credentialHandler?.(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    initialised = true;
  }
  parent.replaceChildren();
  google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'center',
    // Google's button takes a fixed width between 200 and 400 pixels.
    width: Math.min(400, Math.max(200, parent.clientWidth || 320)),
  });
}

export interface SessionResult {
  ok: boolean;
  /** Ready to show the delegate as-is. */
  error?: string;
}

/**
 * Hand the ID token to the server and let it decide. A 403 here is the
 * wrong-domain case: someone signed in with a personal Google account.
 */
export async function exchangeCredential(idToken: string): Promise<SessionResult> {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: idToken }),
    });

    if (response.ok) return { ok: true };

    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? 'Sign-in failed. Please try again.' };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection.' };
  }
}
