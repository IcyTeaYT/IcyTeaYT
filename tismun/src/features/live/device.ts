/**
 * An id for this browser TAB, so the server can tell the device running a
 * committee from every other one — including a second tab or window in the
 * same browser, which must count as a separate device too.
 *
 * It lives in sessionStorage, which survives a reload of the same tab: a chair
 * who refreshes mid-session is still recognised as the one in control. A tab
 * duplicated from another inherits that sessionStorage, so on start-up each tab
 * announces its id to the others, and a newcomer whose id is already taken by
 * an open tab picks a fresh one.
 */

const KEY = 'tismun.tabId';
const VALID = /^[\w-]{8,64}$/;

const fresh = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function save(id: string): void {
  try {
    window.sessionStorage.setItem(KEY, id);
  } catch {
    /* storage blocked — the id just lasts as long as the page */
  }
}

function load(): string {
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored && VALID.test(stored)) return stored;
  } catch {
    /* fall through */
  }
  const id = fresh();
  save(id);
  return id;
}

let current: string | null = null;

type TabMessage =
  | { type: 'hello'; id: string; nonce: string }
  | { type: 'in-use'; id: string; nonce: string };

/** Start the duplicate-tab check. Call once, as early as possible. */
export function initDeviceId(): void {
  if (current) return;
  current = load();
  if (typeof BroadcastChannel === 'undefined') return;

  const nonce = fresh();
  const channel = new BroadcastChannel('tismun-tabs');
  channel.onmessage = (event: MessageEvent<TabMessage>) => {
    const message = event.data;
    if (message.type === 'hello' && message.id === current && message.nonce !== nonce) {
      // Another tab has just started with our id: it is a duplicate of us.
      channel.postMessage({
        type: 'in-use',
        id: current,
        nonce: message.nonce,
      } satisfies TabMessage);
    } else if (message.type === 'in-use' && message.nonce === nonce) {
      current = fresh();
      save(current);
    }
  };
  channel.postMessage({ type: 'hello', id: current, nonce } satisfies TabMessage);
}

export function deviceId(): string {
  if (!current) initDeviceId();
  return current as string;
}
