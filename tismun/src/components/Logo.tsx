import { CONFERENCE } from '@/config/conference';
import { cn } from '@/lib/cn';

const SOURCES = {
  /** The emblem beside the wordmark: the top bar, the projector. */
  wide: '/logo.png',
  /** The emblem above the wordmark: the loading and sign-in screens. */
  stacked: '/logo-stacked.png',
} as const;

/**
 * The TISMUN logo, wide or stacked, on a transparent background, so it sits
 * directly on any light surface.
 *
 * The slate wordmark disappears on a dark background, so there `chip` puts it
 * on a white card instead, and `Wordmark` is the text-only lockup for places
 * where even a chip would be wrong.
 */
export function Logo({
  className,
  width,
  chip = false,
  priority = false,
  variant = 'wide',
}: {
  className?: string;
  variant?: keyof typeof SOURCES;
  width?: number;
  chip?: boolean;
  priority?: boolean;
}) {
  const image = (
    <img
      src={SOURCES[variant]}
      alt={`${CONFERENCE.name} — ${CONFERENCE.fullName}`}
      width={width}
      decoding="async"
      // Lowercase: React 18 forwards unknown lowercase attributes verbatim,
      // where the camelCase `fetchPriority` prop is React 19 and warns here.
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={cn('block object-contain', !chip && className)}
      style={width ? { width } : undefined}
    />
  );

  if (!chip) return image;

  return (
    <span className={cn('inline-flex items-center justify-center rounded-card bg-white px-3 py-2', className)}>
      {image}
    </span>
  );
}

/** Text-only lockup for dark backgrounds and tight spaces. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-serif font-semibold tracking-tight', className)}>{CONFERENCE.name}</span>
  );
}
