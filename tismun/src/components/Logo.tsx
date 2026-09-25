import { CONFERENCE } from '@/config/conference';
import { cn } from '@/lib/cn';

/**
 * The horizontal TISMUN lockup: the globe and the slate wordmark, on a
 * transparent background, so it sits directly on any light surface.
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
}: {
  className?: string;
  width?: number;
  chip?: boolean;
  priority?: boolean;
}) {
  const image = (
    <img
      src="/logo.png"
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
