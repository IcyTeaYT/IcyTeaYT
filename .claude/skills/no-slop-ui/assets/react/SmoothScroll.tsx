'use client';
// SmoothScroll.tsx — Lenis at the root, skipped entirely for reduced-motion users.
// Wrap your app once:  <MotionConfig reducedMotion="user"><SmoothScroll>{children}</SmoothScroll></MotionConfig>
import type {ReactNode} from 'react';
import {ReactLenis} from 'lenis/react';
import {useReducedMotion} from 'motion/react';

export function SmoothScroll({children}: {children: ReactNode}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <ReactLenis root options={{lerp: 0.1, autoRaf: true}}>
      {children}
    </ReactLenis>
  );
}
