import { motion } from 'framer-motion';
import { ArrowRight, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlobeLines } from '@/components/GlobeLines';
import { HostedBy } from '@/components/HostedBy';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { SITE_CLOSED } from '@/config/closed';
import { CONFERENCE } from '@/config/conference';
import { formatDateRange } from '@/lib/conferenceDates';

/**
 * "The conference is over", for a signed-in account while the site is closed
 * (src/config/closed.ts). The site's owner is asked whether to go in anyway;
 * anyone else can only sign out — the server would refuse them regardless.
 */
export function ClosedScreen({
  owner,
  onProceed,
  onSignOut,
}: {
  owner: boolean;
  onProceed: () => void;
  onSignOut: () => void;
}) {
  return (
    <ClosedLayout>
      {owner ? (
        <div className="mt-8 rounded-card border border-teal-200 bg-surface px-5 py-5 sm:px-6">
          <p className="font-medium text-ink-900">You’re signed in as the site’s owner.</p>
          <p className="mt-1 text-sm text-muted">
            Everyone else sees this page and cannot sign in. Do you want to still proceed to the site?
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={onProceed}>
              Yes, proceed
              <ArrowRight size={15} strokeWidth={1.75} />
            </Button>
            <Button variant="ghost" onClick={onSignOut}>
              <LogOut size={15} strokeWidth={1.5} />
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <Button variant="secondary" onClick={onSignOut}>
            <LogOut size={15} strokeWidth={1.5} />
            Sign out
          </Button>
        </div>
      )}
    </ClosedLayout>
  );
}

/** The page itself: the conference's mark, and that it is over. */
export function ClosedLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen items-center overflow-hidden bg-canvas px-6 py-12 sm:px-12">
      <GlobeLines className="absolute -right-24 top-1/2 -z-10 h-[520px] w-[520px] -translate-y-1/2 opacity-[0.07] lg:-right-32 lg:h-[640px] lg:w-[640px]" />
      <motion.div
        className="mx-auto w-full max-w-xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Logo className="h-auto w-[150px] sm:w-[200px]" priority />
        <p className="label-micro mt-10 sm:text-[13px]">
          {CONFERENCE.fullName} · {formatDateRange()}
        </p>
        <h1 className="mt-3 font-serif text-[32px] leading-[1.15] text-ink-900 sm:text-[46px]">{SITE_CLOSED.title}</h1>
        <p className="mt-4 text-base text-ink-700 sm:text-lg">{SITE_CLOSED.message}</p>
        <HostedBy className="mt-7" />
        {children}
      </motion.div>
    </div>
  );
}
