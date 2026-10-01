'use client';
// Button.tsx — three variants, one press feel. The label says exactly what happens ("Share idea", not "Submit").
// No arrow suffix by default; pass an icon only when it adds meaning (external link, download, play).
import type {ReactNode} from 'react';
import {motion} from 'motion/react';
import {springs} from './motion';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.005em] whitespace-nowrap transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none';
const variants: Record<Variant, string> = {
  primary: 'bg-fg text-bg hover:bg-fg/85',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
  ghost: 'text-fg-2 hover:text-fg hover:bg-surface-1',
};
// md meets the 44px touch target; sm is for dense desktop UI only (still ≥ 40px on touch via min-h).
const sizes: Record<Size, string> = {md: 'h-11 px-5 text-sm', sm: 'h-9 px-3.5 text-sm max-md:min-h-10'};

type Common = {children: ReactNode; variant?: Variant; size?: Size; icon?: ReactNode; className?: string};
type AsButton = Common & {href?: undefined; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean};
type AsLink = Common & {href: string; external?: boolean};

export function Button(props: AsButton | AsLink) {
  const {children, variant = 'primary', size = 'md', icon, className = ''} = props;
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const content = (
    <>
      {children}
      {icon}
    </>
  );
  if ('href' in props && props.href) {
    const ext = props.external ? {target: '_blank', rel: 'noreferrer'} : {};
    return (
      <motion.a href={props.href} className={cls} whileTap={{scale: 0.98}} transition={springs.ui} {...ext}>
        {content}
      </motion.a>
    );
  }
  const b = props as AsButton;
  return (
    <motion.button type={b.type ?? 'button'} onClick={b.onClick} disabled={b.disabled} className={cls} whileTap={{scale: 0.98}} transition={springs.ui}>
      {content}
    </motion.button>
  );
}
