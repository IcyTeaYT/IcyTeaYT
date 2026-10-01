'use client';
// Tabs.tsx — segmented control; the indicator slides with a spring (layoutId). Accessible tablist semantics.
import {useId, useState, type ReactNode} from 'react';
import {motion} from 'motion/react';
import {springs} from './motion';

export function Tabs({tabs}: {tabs: {label: string; content: ReactNode}[]}) {
  const [i, setI] = useState(0);
  const id = useId();
  return (
    <div>
      <div role="tablist" aria-label="Views" className="inline-flex rounded-full bg-surface-1 p-1 edge">
        {tabs.map((t, k) => (
          <button
            key={t.label}
            role="tab"
            id={`${id}-tab-${k}`}
            aria-selected={i === k}
            aria-controls={`${id}-panel-${k}`}
            tabIndex={i === k ? 0 : -1}
            onClick={() => setI(k)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setI((k + 1) % tabs.length);
              if (e.key === 'ArrowLeft') setI((k - 1 + tabs.length) % tabs.length);
            }}
            className={`relative h-9 rounded-full px-4 text-sm transition-colors ${i === k ? 'text-fg' : 'text-fg-3 hover:text-fg-2'}`}
          >
            {i === k && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 -z-10 rounded-full bg-surface-3" transition={springs.ui} />}
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, k) => (
        <div key={t.label} role="tabpanel" id={`${id}-panel-${k}`} aria-labelledby={`${id}-tab-${k}`} hidden={i !== k} className="mt-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
