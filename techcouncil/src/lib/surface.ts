import { useEffect, useState } from 'react';

export type Surface = 'dark' | 'light';

/**
 * Which surface ([data-surface="dark|light"]) sits under a given height of
 * the viewport, so fixed chrome (the nav) can flip its colours to match, and
 * whether that surface asks the chrome to stay see-through ([data-nav-clear],
 * e.g. over a full-screen film).
 */
export function useChromeAt(y: number): { surface: Surface; clear: boolean } {
  const [surface, setSurface] = useState<Surface>('dark');
  const [clear, setClear] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const x = window.innerWidth / 2;
      for (const el of document.elementsFromPoint(x, y)) {
        if (el.closest('[data-chrome]')) continue;
        const host = el.closest<HTMLElement>('[data-surface]');
        if (host) {
          setSurface(host.dataset.surface === 'light' ? 'light' : 'dark');
          setClear(host.hasAttribute('data-nav-clear'));
          return;
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [y]);
  return { surface, clear };
}

export function useSurfaceAt(y: number): Surface {
  return useChromeAt(y).surface;
}
