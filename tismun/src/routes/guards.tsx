import { useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ClosedScreen } from '@/components/ClosedScreen';
import { SITE_CLOSED } from '@/config/closed';
import { isDemoMode } from '@/data/source';
import { isChair, isOwner, isSecretariat, useAuth } from '@/store/auth';

/** Answered once per tab: the owner said yes, go into the closed site. */
const PROCEED_KEY = 'tismun.closedProceed';

const proceededHere = (): boolean => {
  try {
    return window.sessionStorage.getItem(PROCEED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Logged-out visitors are sent to the login page, remembering where they were.
 *
 * While the site is closed (src/config/closed.ts) a signed-in account sees
 * that the conference is over instead; the site's owner can choose to go on.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((state) => state.status);
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const location = useLocation();
  const navigate = useNavigate();
  const [proceeded, setProceeded] = useState(proceededHere);

  if (status === 'booting') return null;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (SITE_CLOSED.closed && !isDemoMode && !(isOwner(user) && proceeded)) {
    return (
      <ClosedScreen
        owner={isOwner(user)}
        onProceed={() => {
          try {
            window.sessionStorage.setItem(PROCEED_KEY, '1');
          } catch {
            /* storage blocked — asked again next time */
          }
          setProceeded(true);
        }}
        onSignOut={() => {
          void signOut().then(() => navigate('/login', { replace: true }));
        }}
      />
    );
  }
  return <>{children}</>;
}

/**
 * The Chair Dashboard is for whoever chairs a committee right now — or, from
 * Day 2, a Day 1 chair reading theirs back. In live mode this is belt-and-
 * braces: every endpoint enforces the same rule server-side, so a delegate who
 * forced the route would still get a 403 and no data.
 */
export function RequireChair({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);

  if (status === 'booting') return null;
  if (!isChair(user)) return <Navigate to="/denied" replace />;
  return <>{children}</>;
}

/**
 * The Secretariat dashboard reads every committee's live session, so it is
 * gated on the role the data says you have — and, in live mode, on the server
 * agreeing before it returns a single committee's state.
 */
export function RequireSecretariat({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);

  if (status === 'booting') return null;
  if (!isSecretariat(user)) return <Navigate to="/denied" replace />;
  return <>{children}</>;
}

/**
 * The sign-in log is for the site's owners only. The server refuses everyone
 * else regardless; this just keeps the page from being shown to them.
 */
export function RequireOwner({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);

  if (status === 'booting') return null;
  if (!isOwner(user)) return <Navigate to="/denied" replace />;
  return <>{children}</>;
}
