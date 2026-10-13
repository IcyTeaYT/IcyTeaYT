import { useEffect, type ReactNode } from 'react';
import { CONFERENCE } from '@/config/conference';
import { dataSource } from '@/data/source';
import { formatDateRange } from '@/lib/conferenceDates';
import { TestingBanner } from '@/features/testing/TestingBanner';
import { HostedBy } from './HostedBy';
import { TopNav } from './TopNav';

/** How often an open, visible page tells the server it is still here. */
const HEARTBEAT_MS = 2 * 60 * 1000;

/**
 * Keeps "online now" in the owners' sign-in log honest: a beat every two
 * minutes while the page is visible, and one straight away on coming back.
 * Live mode only; the demo has no server to tell.
 */
function useHeartbeat() {
  useEffect(() => {
    const ping = dataSource.ping;
    if (!ping) return;
    const beat = () => {
      if (document.visibilityState === 'visible') void ping();
    };
    const id = window.setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', beat);
    };
  }, []);
}

export function AppShell({ children }: { children: ReactNode }) {
  useHeartbeat();
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TestingBanner />
      <TopNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <HostedBy variant="compact" />
          <div className="flex flex-col gap-1.5 sm:items-end">
            <p className="text-xs text-muted">
              {CONFERENCE.edition} · {formatDateRange()}
            </p>
            <a
              href={`mailto:${CONFERENCE.secretariatEmail}`}
              className="rounded text-xs text-muted underline-offset-4 transition-colors duration-200 hover:text-teal-700 hover:underline"
            >
              {CONFERENCE.secretariatEmail}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Standard page width and rhythm for every delegate-facing page. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">{children}</div>;
}
