/**
 * A request came back "not signed in" while this tab thought someone was:
 * their sign-in has expired (it lasts one conference day). The auth store
 * listens and sends them to sign in again, rather than letting every request
 * fail quietly — a chair's dashboard would otherwise keep running on screen
 * while nothing reached the server.
 *
 * An event rather than a direct call, so the data layer need not import the
 * auth store that imports it.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onSignedOut(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function signedOut(): void {
  for (const listener of listeners) listener();
}
