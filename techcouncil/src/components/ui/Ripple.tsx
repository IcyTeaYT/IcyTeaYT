import { animate, useReducedMotion } from 'motion/react';
import { useId, useRef, type ReactNode } from 'react';

/**
 * Water-ripple hover: an SVG turbulence displacement that swells and settles
 * when the pointer enters. Mouse only; nothing happens under reduced motion.
 */
export function Ripple({ children, className = '' }: { children: ReactNode; className?: string }) {
  const id = `ripple-${useId().replace(/:/g, '')}`;
  const map = useRef<SVGFEDisplacementMapElement>(null);
  const noise = useRef<SVGFETurbulenceElement>(null);
  const reduce = useReducedMotion();
  const running = useRef(false);

  const play = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse' || running.current) return;
    running.current = true;
    const seed = Math.round(Math.random() * 100);
    noise.current?.setAttribute('seed', String(seed));
    void animate(0, 1, {
      duration: 1.4,
      ease: 'linear',
      onUpdate: (t) => {
        const scale = Math.sin(t * Math.PI) * 26 * (1 - t * 0.4);
        map.current?.setAttribute('scale', scale.toFixed(2));
        noise.current?.setAttribute('baseFrequency', `${(0.012 + t * 0.01).toFixed(4)} ${(0.03 + t * 0.02).toFixed(4)}`);
      },
      onComplete: () => {
        map.current?.setAttribute('scale', '0');
        running.current = false;
      },
    });
  };

  return (
    <div className={className} onPointerEnter={play}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence ref={noise} type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="3" />
          <feDisplacementMap ref={map} in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="h-full w-full" style={{ filter: `url(#${id})` }}>
        {children}
      </div>
    </div>
  );
}
