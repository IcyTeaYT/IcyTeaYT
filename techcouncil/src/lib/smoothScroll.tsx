import Lenis from 'lenis';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

interface SmoothScrollApi {
  scrollTo: (target: string | number, opts?: { offset?: number; immediate?: boolean }) => void;
  lock: () => void;
  unlock: () => void;
}

const Ctx = createContext<SmoothScrollApi | null>(null);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);
  const locks = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), touchMultiplier: 1.4 });
    lenisRef.current = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduce]);

  const scrollTo = useCallback<SmoothScrollApi['scrollTo']>((target, opts = {}) => {
    const offset = opts.offset ?? -72;
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset, immediate: opts.immediate, duration: 1.4 });
      return;
    }
    const top =
      typeof target === 'number'
        ? target
        : (document.querySelector(target)?.getBoundingClientRect().top ?? 0) + window.scrollY + offset;
    window.scrollTo({ top, behavior: 'auto' });
  }, []);

  const lock = useCallback(() => {
    locks.current += 1;
    lenisRef.current?.stop();
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.paddingRight = gap ? `${gap}px` : '';
  }, []);

  const unlock = useCallback(() => {
    locks.current = Math.max(0, locks.current - 1);
    if (locks.current > 0) return;
    lenisRef.current?.start();
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
  }, []);

  const api = useMemo(() => ({ scrollTo, lock, unlock }), [scrollTo, lock, unlock]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSmoothScroll() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSmoothScroll must be used inside SmoothScrollProvider');
  return ctx;
}
