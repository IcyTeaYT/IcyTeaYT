import { cn } from '@/lib/cn';

/**
 * Flag SVGs come from the flag-icons package, but we deliberately do NOT import
 * its stylesheet: that ships ~460 kB of render-blocking CSS naming all 271
 * flags twice (4x3 and 1x1), of which a committee uses fifteen.
 *
 * Globbing the SVGs as URLs instead leaves the bundle with a small map of
 * paths, and the browser fetches only the flags actually on screen.
 */
const FLAG_URLS = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

function flagUrl(code: string): string | null {
  return FLAG_URLS[`/node_modules/flag-icons/flags/4x3/${code}.svg`] ?? null;
}

const SIZES = {
  xs: 'h-3.5 w-[18px]',
  sm: 'h-4 w-[21px]',
  md: 'h-5 w-[27px]',
  lg: 'h-8 w-[43px]',
  xl: 'h-14 w-[75px]',
} as const;

export type FlagSize = keyof typeof SIZES;

/**
 * A country flag — never an emoji flag, which Windows does not render at all
 * and which no classroom projector can be trusted to show.
 */
export function Flag({
  code,
  country,
  size = 'sm',
  className,
}: {
  code: string | null | undefined;
  country?: string | null;
  size?: FlagSize;
  className?: string;
}) {
  const normalised = (code ?? '').trim().toLowerCase();
  const url = normalised ? flagUrl(normalised) : null;

  const shell = cn(
    'inline-block shrink-0 overflow-hidden rounded-[3px] ring-1 ring-inset ring-ink-900/10',
    SIZES[size],
    className,
  );

  // An unknown or missing ISO code degrades to a neutral chip rather than a
  // broken image — live sheet data will eventually contain a typo.
  if (!url) return <span aria-hidden="true" className={cn(shell, 'bg-ink-100')} />;

  return (
    <span className={shell}>
      <img
        src={url}
        alt={country ? `Flag of ${country}` : ''}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </span>
  );
}
