import { MotionConfig } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { SmoothScrollProvider } from '@/lib/smoothScroll';

export const OPTIONS = [
  { href: '/', label: 'Current' },
  { href: '/redesign/mosaic', label: 'Mosaic' },
  { href: '/redesign/metro', label: 'Metro' },
  { href: '/redesign/keynote', label: 'Keynote' },
  { href: '/redesign/blend', label: 'Blend' },
] as const;

/**
 * Frame shared by the redesign options: smooth scroll, reduced-motion config,
 * the world's page colours on <html> (so overscroll matches), a skip link and
 * the preview switcher between the options.
 */
export function Shell({ world, children, switcherClass }: { world: string; children: ReactNode; switcherClass: string }) {
  useEffect(() => {
    document.documentElement.dataset.world = world;
    return () => {
      delete document.documentElement.dataset.world;
    };
  }, [world]);

  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>
        <a href="#main" className="fixed left-4 top-4 z-[90] -translate-y-24 bg-white px-4 py-2 text-[14px] text-black transition-transform focus:translate-y-0">
          Skip to content
        </a>
        {children}
        <nav aria-label="Compare design options" className={`fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 p-1 text-[13px] ${switcherClass}`}>
          {OPTIONS.map((o) => {
            const here = o.href === window.location.pathname.replace(/\/+$/, '') || (o.href === '/' && window.location.pathname === '/');
            return (
              <a key={o.href} href={o.href} aria-current={here ? 'page' : undefined} data-here={here || undefined} className="px-3 py-2 transition-opacity hover:opacity-100">
                {o.label}
              </a>
            );
          })}
        </nav>
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
