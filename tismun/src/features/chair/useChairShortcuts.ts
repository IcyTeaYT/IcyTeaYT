import { useEffect } from 'react';
import { useChairStoreApi } from './context';
import type { TimerKey } from './store';

/** Typing in a field must never trip a shortcut. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Chair keyboard shortcuts. Which clock they act on follows what the committee
 * is actually doing, so the chair never has to think about which panel has
 * focus: Space always starts the timer that matters right now.
 */
export function useChairShortcuts(openProjector: () => void, enabled = true): void {
  const store = useChairStoreApi();

  useEffect(() => {
    // A device that is only watching must not start another chair's timers.
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const state = store.getState();
      const activeTimer: TimerKey = state.presentation.active
        ? 'present'
        : state.unmoderated.active
          ? 'unmod'
          : 'gsl';

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          state.timerToggle(activeTimer);
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          state.timerReset(activeTimer);
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          openProjector();
          break;
        case 'n':
        case 'N':
          event.preventDefault();
          if (!state.unmoderated.active && !state.presentation.active) state.gslNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, openProjector, enabled]);
}

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Space', action: 'Start / pause' },
  { keys: 'R', action: 'Reset timer' },
  { keys: 'N', action: 'Next speaker' },
  { keys: 'F', action: 'Projector' },
];
