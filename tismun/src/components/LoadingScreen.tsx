import { AnimatePresence, motion } from 'framer-motion';
import { HostedBy } from './HostedBy';
import { Logo } from './Logo';

/**
 * First-open splash. Held for a minimum beat by the caller so it reads as a
 * deliberate opening rather than a flash of logo on a fast connection.
 */
export function LoadingScreen({ visible, complete }: { visible: boolean; complete: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="loading"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          role="status"
          aria-live="polite"
          aria-label="Loading TISMUN"
        >
          {/* Two layers: framer handles the entrance, CSS handles the idle pulse. */}
          <div className="animate-logo-pulse">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Logo priority variant="stacked" className="h-auto w-[170px] sm:w-[220px]" />
            </motion.div>
          </div>

          <motion.div
            className="mt-10 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.35 }}
          >
            <p className="flex items-baseline text-[13px] font-medium uppercase tracking-label text-muted">
              Loading
              <span aria-hidden="true" className="ml-1 inline-flex gap-0.5">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="animate-dot-bounce"
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    .
                  </span>
                ))}
              </span>
            </p>

            <div className="mt-5 h-px w-40 overflow-hidden rounded-full bg-ink-200">
              <motion.div
                className="h-full bg-teal-500"
                initial={{ width: '0%' }}
                animate={{ width: complete ? '100%' : '88%' }}
                transition={{ duration: complete ? 0.3 : 1.2, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <HostedBy />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
