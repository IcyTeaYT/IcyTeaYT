import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isChair, useAuth } from '@/store/auth';

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
 * The Chair Dashboard is chairs only. In live mode this is belt-and-braces:
 * the roster endpoint enforces the same rule server-side, so a delegate who
 * forced the route would still get a 403 and no data.
 */
export function RequireChair({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);

  if (status === 'booting') return null;
  if (!isChair(user) || !user?.committeeId) return <Navigate to="/denied" replace />;
  return <>{children}</>;
}
