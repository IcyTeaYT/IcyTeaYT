import type { ReactNode } from 'react';

/**
 * The TIS brand's design elements (Visual Standards Manual, 6.0): the lancet
 * arch the rosette's petals are drawn from, the dome, and colour blocks in
 * the six brand colours.
 */
export const TIS = {
  turquoise: '#009CB9',
  green: '#A0C13B',
  apricot: '#F2942C',
  blue: '#2B3744',
  teal: '#006B6E',
  red: '#9C1B30',
} as const;

/**
 * An equilateral lancet arch filling a w×h box: straight sides, then two arcs
 * of radius w meeting in a point at the top (the shape of a rosette petal).
 */
export function archPath(w: number, h: number) {
  const spring = Math.min(h, w * 0.866);
  return `M0 ${h}L0 ${spring}A${w} ${w} 0 0 1 ${w / 2} ${spring - w * 0.866}A${w} ${w} 0 0 1 ${w} ${spring}L${w} ${h}Z`;
}

/** A dome: straight sides under a half circle. */
export function domePath(w: number, h: number) {
  const r = w / 2;
  return `M0 ${h}L0 ${r}A${r} ${r} 0 0 1 ${w} ${r}L${w} ${h}Z`;
}

/** A CSS mask that cuts its element to a shape drawn for that element's own aspect ratio. */
export function shapeMask(d: string, w: number, h: number) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><path d='${d}'/></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return { maskImage: url, WebkitMaskImage: url, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' } as const;
}

/** A small petal (lancet arch), used as the brand's mark beside section labels. */
export function ArchMark({ color = TIS.turquoise, className = 'h-3.5 w-2.5' }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 28" className={className} aria-hidden>
      <path d={archPath(20, 28)} fill={color} />
    </svg>
  );
}

/** Small all-caps section label, led by a petal. Deep teal on white, light on dark. */
export function Eyebrow({ children, tone = 'light', color }: { children: ReactNode; tone?: 'light' | 'dark'; color?: string }) {
  return (
    <p className={`eyebrow flex items-center gap-2.5 ${tone === 'light' ? 'text-tis-teal' : 'text-fog'}`}>
      <ArchMark color={color ?? (tone === 'light' ? TIS.turquoise : TIS.apricot)} />
      {children}
    </p>
  );
}
