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
      // The clock that is in play right now — or none, when nothing is running.
      const activeTimer: TimerKey | null = state.speech.active
        ? 'speech'
        : state.reading.active
          ? 'reading'
          : state.presentation.active
            ? 'present'
            : state.unmoderated.active
              ? 'unmod'
              : state.gsl.currentId
                ? 'gsl'
                : null;

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          if (activeTimer) state.timerToggle(activeTimer);
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          if (activeTimer) state.timerReset(activeTimer);
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          openProjector();
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
  { keys: 'F', action: 'Projector' },
];
