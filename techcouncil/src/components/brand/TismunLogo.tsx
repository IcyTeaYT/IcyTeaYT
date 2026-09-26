import { TISMUN_GLOBE, TISMUN_PATHS, TISMUN_VIEWBOX } from './tismunPaths';

interface Props {
  className?: string;
  /** 'light' = original navy artwork for light tiles, 'dark' = white wordmark with a drawn sphere. */
  tone?: 'light' | 'dark';
  /** Only the globe, cropped square. */
  globeOnly?: boolean;
}

/**
 * TISMUN logo as inline SVG. Inside a `.group` it reacts to hover: the
 * continents pulse one after another and the sphere picks up a soft shine.
 */
export function TismunLogo({ className, tone = 'light', globeOnly = false }: Props) {
  const ink = tone === 'light' ? '#2D3748' : '#FFFFFF';
  const land = tone === 'light' ? '#2D3748' : '#CBD5E1';
  const { cx, cy, r } = TISMUN_GLOBE;
  const viewBox = globeOnly ? `${cx - r - 6} ${cy - r - 6} ${2 * r + 12} ${2 * r + 12}` : TISMUN_VIEWBOX;
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label="TISMUN">
      <defs>
        <radialGradient id={`tm-sphere-${tone}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={tone === 'light' ? '#FFFFFF' : '#1B2740'} />
          <stop offset="100%" stopColor={tone === 'light' ? '#EEF1F6' : '#0B1222'} />
        </radialGradient>
        <clipPath id={`tm-clip-${tone}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#tm-sphere-${tone})`}
        stroke={tone === 'light' ? 'rgba(45,55,72,0.08)' : 'rgba(203,213,225,0.18)'}
        strokeWidth={3}
      />
      <g className="tm-land">
        <path d={TISMUN_PATHS.globe} fill={land} className="tm-c tm-c1" />
        <path d={TISMUN_PATHS.orange} fill="#E89A3C" className="tm-c tm-c2" />
        <path d={TISMUN_PATHS.red} fill="#8B2332" className="tm-c tm-c3" />
        <path d={TISMUN_PATHS.teal} fill="#2A7C74" className="tm-c tm-c4" />
      </g>
      {/* Shine sweeping across the sphere on hover. */}
      <g clipPath={`url(#tm-clip-${tone})`}>
        <rect
          x={cx - r * 2.2}
          y={cy - r}
          width={r * 0.7}
          height={r * 2}
          fill="white"
          opacity={tone === 'light' ? 0.5 : 0.12}
          className="tm-shine"
          transform={`skewX(-18)`}
        />
      </g>
      {!globeOnly && <path d={TISMUN_PATHS.word} fill={ink} />}
    </svg>
  );
}
