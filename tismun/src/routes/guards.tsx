import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isChair, isSecretariat, useAuth } from '@/store/auth';

/** Logged-out visitors are sent to the login page, remembering where they were. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((state) => state.status);
  const location = useLocation();

  if (status === 'booting') return null;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
