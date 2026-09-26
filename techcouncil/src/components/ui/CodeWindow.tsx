import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { highlightLine, type TokenKind } from '@/lib/highlight';

const COLOR: Record<TokenKind, string> = {
  keyword: 'text-syntax-keyword',
  string: 'text-syntax-string',
  number: 'text-syntax-number',
  comment: 'text-syntax-comment italic',
  fn: 'text-syntax-fn',
  plain: 'text-syntax-plain',
};

interface Props {
  filename: string;
  code: string;
  /** Walk an "execution" highlight down the lines while the window is on screen. */
  trace?: boolean;
  className?: string;
  /** Accessible description of what the code does. */
  label: string;
}

/**
 * An editor window: petal-coloured window dots, a file tab, line numbers and
 * highlighted code. The code is always fully visible; the trace only moves a
 * highlight bar over it.
 */
export function CodeWindow({ filename, code, trace = false, className = '', label }: Props) {
  const lines = useMemo(() => code.replace(/\n$/, '').split('\n').map(highlightLine), [code]);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-10%' });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(-1);

  // Step through the lines that do something (skip blanks and comments).
  const steps = useMemo(
    () => lines.map((l, i) => ({ i, live: l.some(([k, t]) => k !== 'comment' && t.trim() !== '') })).filter((x) => x.live).map((x) => x.i),
    [lines],
  );
  useEffect(() => {
    if (!trace || !inView || reduce || steps.length === 0) return;
    let n = 0;
    setActive(steps[0]!);
    const t = window.setInterval(() => {
      n = (n + 1) % (steps.length + 3); // a short rest after the last line
      setActive(n < steps.length ? steps[n]! : -1);
    }, 520);
    return () => window.clearInterval(t);
  }, [trace, inView, reduce, steps]);

  return (
    <figure ref={ref} className={`overflow-hidden rounded-2xl border rule bg-[#0B111B] shadow-[0_24px_50px_-28px_rgba(0,0,0,0.9)] ${className}`}>
      <div className="flex items-center gap-2 border-b rule px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-orange" />
        <span className="h-2.5 w-2.5 rounded-full bg-maroon" />
        <span className="h-2.5 w-2.5 rounded-full bg-teal" />
        <span className="ml-3 truncate font-mono text-[12px] text-fog-300">{filename}</span>
      </div>
      <div className="overflow-x-auto" data-lenis-prevent-wheel>
        <pre className="relative py-3 font-mono text-[12.5px] leading-[1.75] sm:text-[13px]" aria-label={label}>
          <code>
            {lines.map((tokens, i) => (
              <span key={i} className="relative block pr-6">
                {active === i && (
                  <motion.span
                    layoutId={`trace-${filename}`}
                    className="absolute inset-0 border-l-2 border-cyan-ink bg-cyan-ink/[0.08]"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    aria-hidden
                  />
                )}
                <span className="relative inline-block w-10 select-none pr-4 text-right text-fog-400/70" aria-hidden>
                  {i + 1}
                </span>
                <span className="relative">
                  {tokens.map(([k, t], j) => (
                    <span key={j} className={COLOR[k]}>
                      {t}
                    </span>
                  ))}
                  {tokens.length === 0 && ' '}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
