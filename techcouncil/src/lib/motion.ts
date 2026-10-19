export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;
export const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 34 } as const;

/**
 * Pads a scroll-linked range out to 0 and 1, holding its end values. Motion
 * runs plain scroll-to-opacity maps on the browser's scroll timelines, where
 * a range that stops short of 1 drifts back to its first value afterwards.
 */
export function span<T>(input: number[], output: T[]): [number[], T[]] {
  const inp = [...input];
  const out = [...output];
  if (inp[0]! > 0) {
    inp.unshift(0);
    out.unshift(out[0]!);
  }
  if (inp[inp.length - 1]! < 1) {
    inp.push(1);
    out.push(out[out.length - 1]!);
  }
  return [inp, out];
}
