import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside `ref` while active, closes on Escape and restores focus
 * afterwards. If the element that opened the dialog was unmounted meanwhile
 * (shared-layout cards are), focus goes to `returnFocus` instead.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, onClose: () => void, returnFocus?: string) {
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusFirst = () => {
      const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus({ preventScroll: true });
    };
    const t = window.setTimeout(focusFirst, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const target = previouslyFocused?.isConnected
        ? previouslyFocused
        : returnFocus
          ? document.querySelector<HTMLElement>(returnFocus)
          : null;
      target?.focus?.({ preventScroll: true });
    };
  }, [active, onClose, ref, returnFocus]);
}
