/**
 * Keeps every open tab on the newest version of the site.
 *
 * A page left open — a delegate's phone in a pocket, a chair's laptop — keeps
 * running the code it loaded, so after a deploy it would miss whatever is
 * new until someone thought to refresh. This checks now and then whether the
 * site has a newer build and, if so, reloads — never while someone is typing,
 * and nothing is lost: sessions, copies and the chair's dashboard are all
 * saved as they change.
 *
 * Fetching the page is a plain static file, so this costs no server requests.
 */

const CHECK_EVERY_MS = 2 * 60 * 1000;
const ENTRY = /\/assets\/index-[\w-]+\.js/;

const loadedEntry = (): string | null => {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')) {
    const match = ENTRY.exec(script.getAttribute('src') ?? '');
    if (match) return match[0];
  }
  return null;
};

const isTyping = (): boolean => {
  const active = document.activeElement;
  return active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement || (active instanceof HTMLElement && active.isContentEditable);
};

export function startAutoUpdate(): void {
  const current = loadedEntry();
  // The dev server has no built entry to compare.
  if (!current) return;

  let waiting = false;

  const reloadWhenSafe = () => {
    if (!isTyping()) {
      window.location.reload();
      return;
    }
    if (waiting) return;
    waiting = true;
    document.addEventListener(
      'focusout',
      () => {
        waiting = false;
        window.setTimeout(reloadWhenSafe, 300);
      },
      { once: true },
    );
  };

  const check = async () => {
    try {
      const response = await fetch('/', { cache: 'no-store', headers: { Accept: 'text/html' } });
      if (!response.ok) return;
      const latest = ENTRY.exec(await response.text())?.[0];
      if (latest && latest !== current) reloadWhenSafe();
    } catch {
      // Offline: try again next time.
    }
  };

  window.setInterval(() => {
    if (document.visibilityState === 'visible') void check();
  }, CHECK_EVERY_MS);
  // Coming back to the tab is the most likely moment to be out of date.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
}
