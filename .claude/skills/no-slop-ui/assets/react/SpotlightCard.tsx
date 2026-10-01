'use client';
// SpotlightCard.tsx — a surface whose top edge catches light and follows the cursor.
// Use for things people can act on (a form, a project, a plan) — not as the default container for all content.
import type {ReactNode, PointerEvent} from 'react';

export function SpotlightCard({children, className = '', as: Tag = 'div'}: {children: ReactNode; className?: string; as?: 'div' | 'article' | 'li' | 'form' | 'section'}) {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <Tag onPointerMove={onMove} className={`spot edge rounded-lg ${className}`}>
      {children}
    </Tag>
  );
}
