/**
 * The browser's own lock that only one tab can hold at a time.
 *
 * The server decides which DEVICE runs a committee, but two tabs of the same
 * browser must never both run it either — and telling tabs apart by an id kept
 * in sessionStorage is not enough on its own: a duplicated tab inherits that
 * storage, and a tab the browser has frozen in the background cannot answer
 * to say the id is taken. The Web Locks API has neither problem. The browser
 * holds the lock for the tab (frozen or not), frees it the moment the tab
 * closes, and lets another tab steal it — which is how Take over works between
 * two tabs.
 */

export interface TabLock {
  /** Give the lock up. */
  release: () => void;
  /** Settles if another tab steals the lock. */
  lost: Promise<void>;
}

const never = new Promise<void>(() => undefined);

/** Browsers without Web Locks (very old ones) fall back to the server check alone. */
const unsupported: TabLock = { release: () => undefined, lost: never };

export const lockName = (committeeId: string): string => `tismun-control-${committeeId}`;

/**
 * Take the lock if no other tab holds it — or, with `steal`, take it from
 * whichever tab does. Resolves null when another tab holds it and `steal` is off.
 */
export function acquireTabLock(committeeId: string, steal: boolean): Promise<TabLock | null> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return Promise.resolve(unsupported);

  return new Promise((resolve) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((done) => {
      release = done;
    });
    let markLost: () => void = () => undefined;
    const lost = new Promise<void>((done) => {
      markLost = done;
    });

    locks
      .request(
        lockName(committeeId),
        steal ? { steal: true } : { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            resolve(null);
            return;
          }
          resolve({ release, lost });
          // Hold the lock until release() is called.
          await held;
        },
      )
      // A stolen lock rejects its original request: another tab took over.
      .catch(() => markLost());
  });
}
