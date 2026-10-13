import { motion } from 'framer-motion';
import { ArrowRight, Eraser, FileText, FlaskConical, Gavel, Landmark, Siren, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { emergencySession } from '@/config/emergency';
import { dataSource, type TestingSeat } from '@/data/source';
import { removeKey } from '@/lib/storage';
import { TestAsDialog } from '@/features/testing/TestAsDialog';
import { ActivityLog } from './ActivityLog';

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] as const },
});

/** A chair's practice session in this browser, kept apart from any real one. */
const PRACTICE_CHAIR_PREFIX = 'tismun.chair.practice.';

/**
 * The Owner tab: everything only the site's owners can do, in one place —
 * testing the site as any delegate or chair, the conference floor, and the
 * sign-in log.
 */
export function OwnerPage() {
  const [testing, setTesting] = useState<{ role: TestingSeat['role']; committeeId?: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState<'done' | 'failed' | null>(null);

  const clearPractice = async () => {
    try {
      await dataSource.clearPractice();
      try {
        for (const key of Object.keys(window.localStorage)) {
          if (key.startsWith(PRACTICE_CHAIR_PREFIX)) removeKey(key);
        }
      } catch {
        // Storage blocked: nothing was kept here to clear.
      }
      setCleared('done');
    } catch {
      setCleared('failed');
    }
  };

  return (
    <PageContainer>
      <motion.header className="border-b border-hairline pb-6" {...enter(0)}>
        <p className="label-micro">Owner</p>
        <h1 className="mt-2.5 font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">Owner</h1>
        <p className="mt-2 text-sm text-muted">Everything only you can do. Nobody else sees this tab.</p>
      </motion.header>

      <motion.div className="mt-7" {...enter(0.05)}>
        <Card>
          <CardBody className="px-5 py-5 sm:px-6">
            <Heading icon={<FlaskConical size={18} strokeWidth={1.5} />} title="Test the site">
              See every page exactly as a delegate or a chair does. While you test, every committee is a practice
              copy: the real chairs and delegates never see what you do. To see both sides at once, test as a chair
              here and as a delegate on your phone.
            </Heading>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => setTesting({ role: 'delegate' })}>
                <User size={15} strokeWidth={1.5} />
                Test as a delegate
              </Button>
              <Button variant="primary" onClick={() => setTesting({ role: 'chair' })}>
                <Gavel size={15} strokeWidth={1.5} />
                Test as a chair
              </Button>
            </div>

            <div className="mt-5 rounded-control border border-hairline bg-canvas px-4 py-3.5">
              <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                <Siren size={15} strokeWidth={1.5} className="text-teal-700" />
                The Emergency Session, as it will open on Day 2
              </p>
              <p className="mt-1 text-xs text-muted">Only you see it. It stays locked for everyone else until release.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setTesting({ role: 'delegate', committeeId: emergencySession.committeeId })}
                >
                  As a delegate
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setTesting({ role: 'chair', committeeId: emergencySession.committeeId })}
                >
                  As the chair
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-4">
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
                <Eraser size={14} strokeWidth={1.5} />
                Clear practice copies
              </Button>
              <p className="text-xs text-muted">
                {cleared === 'done'
                  ? 'Cleared. Every committee’s practice copy starts empty again.'
                  : cleared === 'failed'
                    ? 'That did not work. Try again.'
                    : 'Empties everything done while testing. Real committees are not touched.'}
              </p>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div className="mt-4 grid gap-4 sm:grid-cols-2" {...enter(0.1)}>
        <Shortcut
          to="/secretariat"
          icon={<Landmark size={18} strokeWidth={1.5} />}
          title="Conference floor"
          body="Every committee live. Release or un-release the Emergency topic, switch to Day 2, reset sessions."
        />
        <Shortcut
          to="/resolution"
          icon={<FileText size={18} strokeWidth={1.5} />}
          title="Resolutions"
          body="Read any committee’s resolution and every amendment, as it stands."
        />
      </motion.div>

      <motion.div className="mt-12" {...enter(0.15)}>
        <ActivityLog embedded />
      </motion.div>

      <TestAsDialog
        open={testing !== null}
        onClose={() => setTesting(null)}
        role={testing?.role}
        committeeId={testing?.committeeId}
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void clearPractice()}
        title="Clear the practice copies?"
        body="Everything done while testing — test sessions, amendments, votes — is deleted. The real committees are not touched."
        confirmLabel="Clear"
      />
    </PageContainer>
  );
}

function Heading({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-teal-50 text-teal-700">
        {icon}
      </span>
      <div>
        <h2 className="font-serif text-xl text-ink-900">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

function Shortcut({ to, icon, title, body }: { to: string; icon: ReactNode; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-card border border-hairline bg-surface px-5 py-4 shadow-card transition-colors duration-200 hover:border-teal-300"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-teal-50 text-teal-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 font-medium text-ink-900">
          {title}
          <ArrowRight size={15} strokeWidth={1.5} className="text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{body}</span>
      </span>
    </Link>
  );
}
