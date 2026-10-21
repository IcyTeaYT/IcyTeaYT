/**
 * Preview only: two treatments of the brand to compare, chosen with ?look= on
 * the URL. Once one is chosen the other (and this file) go.
 *   blocks  the arches in solid brand colours on dark blue
 *   calm    the arches drawn as fine brand-colour lines; colour otherwise
 *           only in the photos and the logo
 */
export type Look = 'blocks' | 'calm';
export const LOOKS: { id: Look; label: string }[] = [
  { id: 'blocks', label: 'Bold' },
  { id: 'calm', label: 'Calm' },
];

function read(): Look {
  if (typeof window === 'undefined') return 'blocks';
  return new URLSearchParams(window.location.search).get('look') === 'calm' ? 'calm' : 'blocks';
}

export const LOOK: Look = read();
if (typeof document !== 'undefined') document.documentElement.dataset.look = LOOK;
