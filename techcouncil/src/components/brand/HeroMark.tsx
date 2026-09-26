import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { forwardRef, useEffect } from 'react';
import { LOGO_BACKING, LOGO_COLORS, LOGO_PATHS, LOGO_VIEWBOX } from './logoPaths';
import { EASE_OUT } from '@/lib/motion';

type Petal = 'orange' | 'red' | 'teal' | 'cyan';

// Each petal's outward direction from the centre of the mark.
const DIR: Record<Petal, [number, number]> = {
  orange: [-0.707, -0.707],
  red: [0.707, -0.707],
  teal: [-0.707, 0.707],
  cyan: [0.707, 0.707],
};
const ORDER: Petal[] = ['orange', 'red', 'cyan', 'teal'];
const ORIGIN = { transformOrigin: '296px 302px', transformBox: 'view-box' } as const;

function usePetalLean(enabled: boolean) {
  const spring = { stiffness: 140, damping: 16, mass: 0.6 };
  const lean = {
    orange: { x: useSpring(useMotionValue(0), spring), y: useSpring(useMotionValue(0), spring) },
    red: { x: useSpring(useMotionValue(0), spring), y: useSpring(useMotionValue(0), spring) },
    teal: { x: useSpring(useMotionValue(0), spring), y: useSpring(useMotionValue(0), spring) },
    cyan: { x: useSpring(useMotionValue(0), spring), y: useSpring(useMotionValue(0), spring) },
  };
  return { lean, enabled };
}

interface Props {
  play: boolean;
  className?: string;
}

/**
 * The council mark at poster scale. Petals open on load, then lean toward the
 * cursor: the petal facing the pointer slides out along its own axis.
 */
export const HeroMark = forwardRef<HTMLDivElement, Props>(function HeroMark({ play, className }, ref) {
  const reduce = useReducedMotion();
  const { lean } = usePetalLean(!reduce);

  useEffect(() => {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = r.width * 1.1;
      const near = Math.max(0, 1 - dist / reach);
      const ux = dx / dist;
      const uy = dy / dist;
      const max = r.width * 0.045;
      for (const p of ORDER) {
        const [px, py] = DIR[p];
        const facing = Math.max(0, ux * px + uy * py);
        const amt = facing * facing * near * max;
        lean[p].x.set(px * amt);
        lean[p].y.set(py * amt);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, ref, lean]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <svg viewBox={LOGO_VIEWBOX} className="h-full w-full overflow-visible">
        <motion.path
          d={LOGO_BACKING}
          fill="#0A0F17"
          initial={{ opacity: 0 }}
          animate={play ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, delay: 0.35 }}
        />
        {ORDER.map((k, i) => (
          <motion.g key={k} style={{ x: lean[k].x, y: lean[k].y }}>
            <motion.path
              d={LOGO_PATHS[k]}
              fill={LOGO_COLORS[k]}
              style={ORIGIN}
              initial={reduce ? { opacity: 0 } : { scale: 0.2, rotate: -50, opacity: 0 }}
              animate={play ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
              transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.1 + i * 0.09 }}
            />
          </motion.g>
        ))}
        <motion.path
          d={LOGO_PATHS.navy}
          fill="#EEF1F5"
          style={ORIGIN}
          initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
          animate={play ? { scale: 1, opacity: 1 } : undefined}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.45 }}
        />
      </svg>
    </div>
  );
});
