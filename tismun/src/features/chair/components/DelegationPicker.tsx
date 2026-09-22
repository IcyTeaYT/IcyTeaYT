import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Flag } from '@/components/Flag';
import { cn } from '@/lib/cn';
import type { Delegation } from '@/data/source/types';

/**
 * A searchable delegation picker.
 *
 * Built as a real combobox rather than a styled <select> because a chair adding
 * speakers mid-debate needs to type three letters of a country and hit Enter,
 * and because a native select cannot show a flag.
 */
export function DelegationPicker({
  delegations,
  value,
  onChange,
  placeholder = 'Search delegations',
  disabledIds = [],
  emptyLabel = 'No delegations available',
  className,
  autoClearOnSelect = false,
}: {
  delegations: Delegation[];
  value: string | null;
  onChange: (delegationId: string) => void;
  placeholder?: string;
  disabledIds?: string[];
  emptyLabel?: string;
  className?: string;
  /** Speakers' list behaviour: pick, add, and be ready for the next name. */
  autoClearOnSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = delegations.find((delegation) => delegation.id === value) ?? null;
  const blocked = useMemo(() => new Set(disabledIds), [disabledIds]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return delegations.filter(
      (delegation) =>
        !blocked.has(delegation.id) &&
        (!needle ||
          delegation.country.toLowerCase().includes(needle) ||
          delegation.delegateName.toLowerCase().includes(needle)),
    );
  }, [delegations, query, blocked]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Close on an outside click, the way every other dropdown on the web behaves.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const choose = (delegation: Delegation) => {
    onChange(delegation.id);
    setOpen(false);
    setQuery('');
    if (autoClearOnSelect) inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-control border bg-surface px-3 transition-colors duration-200',
          open ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-hairline hover:border-ink-300',
        )}
      >
        {open ? (
          <Search size={15} strokeWidth={1.5} className="shrink-0 text-ink-400" />
        ) : selected ? (
          <Flag code={selected.countryCode} country={selected.country} size="xs" />
        ) : (
          <Search size={15} strokeWidth={1.5} className="shrink-0 text-ink-400" />
        )}

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-300"
          placeholder={placeholder}
          value={open ? query : (selected?.country ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setHighlight((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlight((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const target = results[highlight];
              if (target) choose(target);
            } else if (event.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
        />

        <ChevronDown
          size={15}
          strokeWidth={1.5}
          className={cn('shrink-0 text-ink-400 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-card border border-hairline bg-surface py-1 shadow-raised"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">{emptyLabel}</li>
          ) : (
            results.map((delegation, index) => (
              <li key={delegation.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={delegation.id === value}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(delegation)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-150',
                    index === highlight ? 'bg-teal-50 text-ink-900' : 'text-ink-700',
                  )}
                >
                  <Flag code={delegation.countryCode} country={delegation.country} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{delegation.country}</span>
                  <span className="hidden truncate text-xs text-muted sm:block">
                    {delegation.delegateName}
                  </span>
                  {delegation.id === value ? (
                    <Check size={14} strokeWidth={1.5} className="shrink-0 text-teal-600" />
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
