import { useCallback, type PointerEvent } from 'react';

/**
 * Pointer handlers that move a radial glow (the `.spotlight` class) under the
 * cursor. Writes CSS variables directly, so React never re-renders on move.
 * Touch pointers are ignored.
 */
export function useSpotlight() {
  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.style.setProperty('--spot-o', '1');
  }, []);
  const onPointerLeave = useCallback((e: PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--spot-o', '0');
  }, []);
  return { onPointerMove, onPointerLeave };
}
