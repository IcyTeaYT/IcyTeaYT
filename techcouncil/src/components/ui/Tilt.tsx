import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { ReactNode, PointerEvent } from 'react';
import { useFinePointer } from '@/lib/media';
import { useReducedMotion } from 'motion/react';

interface Props {
  children: ReactNode;
  max?: number;
  className?: string;
  /** Adds a soft glare highlight that follows the cursor. */
  glare?: boolean;
}

/** 3D tilt toward the cursor. Desktop pointers only; a plain wrapper elsewhere. */
export function Tilt({ children, max = 8, className, glare = true }: Props) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const enabled = fine && !reduce;
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const cfg = { stiffness: 180, damping: 20, mass: 0.5 };
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), cfg);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), cfg);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(255,255,255,0.13), transparent 45%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <div className={className} style={{ perspective: 1100 }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div className="preserve-3d relative h-full w-full" style={{ rotateX: rx, rotateY: ry }}>
        {children}
        {glare && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-500 [.group:hover_&]:opacity-100"
            style={{ background: glareBg, borderRadius: 'inherit' }}
          />
        )}
      </motion.div>
    </div>
  );
}
