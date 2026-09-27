export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;
export const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 34 } as const;
