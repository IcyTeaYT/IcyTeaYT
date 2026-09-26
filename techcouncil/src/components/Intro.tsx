import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { LogoMark } from './brand/LogoMark';
import { EASE_IN_OUT, EASE_OUT } from '@/lib/motion';

const WORD = 'TIS Tech Council';

/**
 * ~1.3 s load sequence: the logo blooms, the wordmark rises, then the curtain
 * lifts to reveal the hero. Any click, key or scroll skips it.
 */
export function Intro({ show, onDone }: { show: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(onDone, 1050);
    const skip = () => onDone();
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchmove', skip, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchmove', skip);
    };
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-night"
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.45, ease: EASE_IN_OUT }}
          aria-hidden="true"
        >
          <motion.div
            className="relative flex items-center gap-4"
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_IN_OUT }}
          >
            <LogoMark animate className="h-14 w-14 text-paper sm:h-16 sm:w-16" />
            <span className="flex overflow-hidden font-display text-3xl font-semibold tracking-display text-paper sm:text-4xl">
              {WORD.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 + i * 0.022 }}
                >
                  {ch === ' ' ? ' ' : ch}
                </motion.span>
              ))}
            </span>
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 flex h-1">
            {['bg-orange', 'bg-maroon', 'bg-teal', 'bg-cyan'].map((c, i) => (
              <motion.span
                key={c}
                className={`flex-1 origin-left ${c}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 + i * 0.12 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
