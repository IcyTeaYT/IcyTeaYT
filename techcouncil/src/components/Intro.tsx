import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { LogoMark } from './brand/LogoMark';
import { EASE_IN_OUT, EASE_OUT } from '@/lib/motion';

const WORD = 'TIS Tech Council';

/**
 * ~1.2 s load sequence on black: the logo blooms, the wordmark rises, the
 * petal line draws, then the curtain lifts. Any click, key or scroll skips it.
 */
export function Intro({ show, onDone }: { show: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(onDone, 1100);
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-obsidian text-paper"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 0.5, ease: EASE_IN_OUT }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-6">
            <LogoMark animate className="h-14 w-14 text-paper" />
            <span className="flex overflow-hidden text-[clamp(1.75rem,4vw,2.5rem)] font-light tracking-[-0.05em]">
              {WORD.split('').map((ch, i) => (
                <motion.span key={i} className="inline-block" initial={{ y: '105%' }} animate={{ y: '0%' }} transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 + i * 0.022 }}>
                  {ch === ' ' ? ' ' : ch}
                </motion.span>
              ))}
            </span>
            <motion.span className="h-px w-40 origin-left bg-petal" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.35 }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
