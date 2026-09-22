/**
 * A one-way link from the chair's laptop to the projector window.
 *
 * BroadcastChannel carries it where available. Where it isn't, we fall back to
 * writing the message into localStorage: same-origin tabs receive a `storage`
 * event for it, which gets us the same fan-out through a much older API.
 */

export interface Channel<T> {
  post(message: T): void;
  subscribe(listener: (message: T) => void): () => void;
  close(): void;
}

interface Envelope<T> {
  /** Distinguishes two writes with identical payloads, which `storage` would otherwise collapse. */
  n: number;
  message: T;
}

export function createChannel<T>(name: string): Channel<T> {
  if (typeof window === 'undefined') {
    return { post: () => {}, subscribe: () => () => {}, close: () => {} };
  }

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(name);
    return {
      post: (message) => channel.postMessage(message),
      subscribe: (listener) => {
        const handler = (event: MessageEvent<T>) => listener(event.data);
        channel.addEventListener('message', handler);
        return () => channel.removeEventListener('message', handler);
      },
      close: () => channel.close(),
    };
  }

  const key = `bc:${name}`;
  let counter = 0;
  return {
    post: (message) => {
      counter += 1;
      try {
        window.localStorage.setItem(key, JSON.stringify({ n: counter, message } satisfies Envelope<T>));
      } catch {
        /* storage blocked — the projector simply won't update */
      }
    },
    subscribe: (listener) => {
      const handler = (event: StorageEvent) => {
        if (event.key !== key || !event.newValue) return;
        try {
          listener((JSON.parse(event.newValue) as Envelope<T>).message);
        } catch {
          /* ignore malformed payloads */
        }
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
    close: () => {},
  };
}
