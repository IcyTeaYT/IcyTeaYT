import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { LoadingScreen } from '@/components/LoadingScreen';
import { CommitteeDetail } from '@/pages/CommitteeDetail';
import { Committees } from '@/pages/Committees';
import { AccessDenied, NotFound } from '@/pages/ErrorPages';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { RequireAuth, RequireChair, RequireSecretariat } from '@/routes/guards';
import { useAuth } from '@/store/auth';
import { useConference } from '@/store/conference';

/**
 * The chair tools are a large slice of the app that only chairs ever open, so
 * they load on demand: a delegate checking their country never downloads the
 * timers, the voting engine or the drag-and-drop library.
 */
const ChairDashboard = lazy(() =>
  import('@/features/chair/ChairDashboard').then((m) => ({ default: m.ChairDashboard })),
);
const ProjectorDisplay = lazy(() =>
  import('@/features/chair/ProjectorDisplay').then((m) => ({ default: m.ProjectorDisplay })),
);
const SecretariatDashboard = lazy(() =>
  import('@/features/secretariat/SecretariatDashboard').then((m) => ({
    default: m.SecretariatDashboard,
  })),
);
const CommitteeLive = lazy(() =>
  import('@/features/secretariat/CommitteeLive').then((m) => ({ default: m.CommitteeLive })),
);

/** The splash is held at least this long so it reads as an opening, not a flash. */
const MINIMUM_SPLASH_MS = 1200;

export function App() {
  const restore = useAuth((state) => state.restore);
  const loadCommittees = useConference((state) => state.load);

  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), MINIMUM_SPLASH_MS);
    void Promise.all([restore(), loadCommittees()]).finally(() => setDataReady(true));
    return () => window.clearTimeout(timer);
  }, [restore, loadCommittees]);

  const booting = !(minimumElapsed && dataReady);

  return (
    <BrowserRouter
      // Opt in to the v7 behaviours now: every in-app link is already absolute
      // or route-relative, so neither flag changes where anything navigates.
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LoadingScreen visible={booting} complete={dataReady} />
      {booting ? null : (
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* The projector runs outside the shell: no nav, no footer, no chrome. */}
          <Route
            path="/chair/display"
            element={
              <RequireAuth>
                <RequireChair>
                  <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
                    <ProjectorDisplay />
                  </Suspense>
                </RequireChair>
              </RequireAuth>
            }
          />

          <Route
            path="*"
            element={
              <RequireAuth>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/committees" element={<Committees />} />
                    <Route path="/committees/:id" element={<CommitteeDetail />} />
                    <Route
                      path="/chair/*"
                      element={
                        <RequireChair>
                          <Suspense fallback={<ChairSkeleton />}>
                            <ChairDashboard />
                          </Suspense>
                        </RequireChair>
                      }
                    />
                    <Route
                      path="/secretariat"
                      element={
                        <RequireSecretariat>
                          <Suspense fallback={<PaneSkeleton />}>
                            <SecretariatDashboard />
                          </Suspense>
                        </RequireSecretariat>
                      }
                    />
                    <Route
                      path="/secretariat/:committeeId"
                      element={
                        <RequireSecretariat>
                          <Suspense fallback={<PaneSkeleton />}>
                            <CommitteeLive />
                          </Suspense>
                        </RequireSecretariat>
                      }
                    />
                    <Route path="/denied" element={<AccessDenied />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppShell>
              </RequireAuth>
            }
          />
        </Routes>
      )}
    </BrowserRouter>
  );
}

/** Placeholder while a lazily-loaded page arrives. */
function PaneSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-6">
      <div className="h-20 animate-pulse rounded-card bg-ink-50" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-card bg-ink-50" />
        <div className="h-72 animate-pulse rounded-card bg-ink-50" />
        <div className="h-72 animate-pulse rounded-card bg-ink-50" />
      </div>
    </div>
  );
}

/** Placeholder while the chair bundle arrives — matches the dashboard's frame. */
function ChairSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-7 sm:px-6">
      <div className="h-24 animate-pulse rounded-card bg-ink-50" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
        <div className="h-64 animate-pulse rounded-card bg-ink-50" />
        <div className="h-96 animate-pulse rounded-card bg-ink-50" />
      </div>
    </div>
  );
}
