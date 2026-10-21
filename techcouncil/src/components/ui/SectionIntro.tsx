import type { ReactNode } from 'react';
import { Eyebrow } from '../brand/Shapes';
import { SplitText } from './SplitText';

interface Props {
  id: string;
  title: string;
  /** Body copy beside or under the heading. */
  children?: ReactNode;
  className?: string;
  /** Small all-caps label above the heading. */
  eyebrow?: string;
  /** The surface the intro sits on, for the label's colours. */
  tone?: 'light' | 'dark';
  /**
   * How the opener is laid out, so sections don't all repeat one template:
   *   split   heading left, body right
   *   stack   a very large heading across the page, body below on the right
   *   center  heading and body centred
   */
  layout?: 'split' | 'stack' | 'center';
}

/** Section opener. The heading rises in word by word as it comes into view. */
export function SectionIntro({ id, title, children, className = '', eyebrow, tone = 'light', layout = 'split' }: Props) {
  const label = eyebrow && (
    <div className={`mb-6 flex ${layout === 'center' ? 'justify-center' : ''}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
    </div>
  );

  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        <h2 id={id} className="type-heading max-w-[16ch] text-[clamp(2.75rem,6.4vw,5.5rem)]">
          <SplitText text={title} play="inView" stagger={0.05} />
        </h2>
        {children && <div className="mt-12 grid gap-[30px] text-body-lg md:ml-[50%] md:max-w-[52ch]">{children}</div>}
      </div>
    );
  }

  if (layout === 'center') {
    return (
      <div className={`mx-auto max-w-[44rem] text-center ${className}`}>
        {label}
        <h2 id={id} className="type-heading text-[clamp(2.5rem,5.4vw,4.5rem)]">
          <SplitText text={title} play="inView" stagger={0.05} />
        </h2>
        {children && <div className="mx-auto mt-8 flex max-w-[46ch] flex-col gap-[30px] text-body-lg">{children}</div>}
      </div>
    );
  }

  return (
    <div className={`grid gap-8 md:grid-cols-2 md:gap-16 ${className}`}>
      <div>
        {label}
        <h2 id={id} className="type-heading text-[clamp(2.4rem,4.8vw,3.75rem)]">
          <SplitText text={title} play="inView" stagger={0.05} />
        </h2>
      </div>
      {children && <div className="flex flex-col gap-[30px] text-body-lg md:pt-12">{children}</div>}
    </div>
  );
}
