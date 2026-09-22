import { cn } from '@/lib/cn';

/**
 * The meridian wireframe lifted from the logo's globe, used as a background
 * decoration. Deliberately faint: it should register as texture, not artwork.
 */
export function GlobeLines({
  className,
  strokeClassName = 'stroke-ink-800',
}: {
  className?: string;
  strokeClassName?: string;
}) {
  const parallels = [-122, -78, -30, 22, 74, 122];

  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none select-none', className)}
    >
      <g
        className={strokeClassName}
        strokeWidth="0.9"
        vectorEffect="non-scaling-stroke"
        transform="rotate(-14 200 200)"
      >
        <circle cx="200" cy="200" r="160" />
        {/* Meridians: ellipses sharing the poles, narrowing toward the centre. */}
        {[160, 118, 72, 24].map((rx) => (
          <ellipse key={`m${rx}`} cx="200" cy="200" rx={rx} ry="160" />
        ))}
        {/* Parallels: flattened by the globe's tilt, widest at the equator. */}
        {parallels.map((dy) => {
          const rx = Math.sqrt(Math.max(0, 160 * 160 - dy * dy));
          return <ellipse key={`p${dy}`} cx="200" cy={200 + dy} rx={rx} ry={rx * 0.17} />;
        })}
      </g>
    </svg>
  );
}
