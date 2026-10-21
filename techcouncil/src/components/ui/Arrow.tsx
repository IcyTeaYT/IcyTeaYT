/** The right arrow that sits inside every pill button. */
export function Arrow({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The arrow set in its own small circle at the end of a pill button, flush
 * with the pill's edge. It nudges up and right when the button is hovered.
 */
export function ArrowChip() {
  return (
    <span
      aria-hidden
      className="-mr-3.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,currentColor_12%,transparent)] transition-transform duration-500 ease-out-expo group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105"
    >
      <Arrow className="h-3.5 w-3.5" />
    </span>
  );
}
