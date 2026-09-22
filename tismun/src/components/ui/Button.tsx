import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-teal-500 text-white shadow-card hover:bg-teal-600 active:bg-teal-700 disabled:hover:bg-teal-500',
  secondary:
    'bg-surface text-ink-800 border border-hairline shadow-card hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100',
  ghost: 'text-ink-600 hover:bg-ink-50 hover:text-ink-900 active:bg-ink-100',
  danger:
    'bg-danger text-white shadow-card hover:brightness-95 active:brightness-90 disabled:hover:brightness-100',
  quiet:
    'bg-ink-50 text-ink-700 border border-transparent hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Square button sized for a single icon. */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', iconOnly = false, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-200',
        'disabled:cursor-not-allowed disabled:opacity-45',
        'active:translate-y-px disabled:active:translate-y-0',
        VARIANTS[variant],
        SIZES[size],
        iconOnly && (size === 'sm' ? 'w-8 px-0' : size === 'lg' ? 'w-11 px-0' : 'w-10 px-0'),
        className,
      )}
      {...props}
    />
  );
});
