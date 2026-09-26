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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950"
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.45, ease: EASE_IN_OUT }}
          aria-hidden="true"
        >
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(47,111,245,0.35), transparent 65%)' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          />
          <motion.div
            className="relative flex items-center gap-4"
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_IN_OUT }}
          >
            <LogoMark animate className="h-14 w-14 text-white sm:h-16 sm:w-16" />
            <span className="flex overflow-hidden font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
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
          <motion.div
            className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-volt-400 to-transparent"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, ease: EASE_IN_OUT }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
