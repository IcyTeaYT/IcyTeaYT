import { X } from 'lucide-react';
import { Flag } from '@/components/Flag';
import type { Delegation } from '@/data/source/types';
import { DelegationPicker } from './DelegationPicker';

/** Pick several delegations — main submitters, co-submitters, signatories. */
export function DelegationMultiSelect({
  delegations,
  value,
  onChange,
  label,
  placeholder = 'Add a delegation',
  hint,
}: {
  delegations: Delegation[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  placeholder?: string;
  hint?: string;
}) {
  const byId = new Map(delegations.map((delegation) => [delegation.id, delegation]));

  return (
    <div className="space-y-1.5">
      <span className="label-micro block">{label}</span>
      <DelegationPicker
        delegations={delegations}
        value={null}
        onChange={(id) => {
          if (!value.includes(id)) onChange([...value, id]);
        }}
        disabledIds={value}
        placeholder={placeholder}
        emptyLabel="All delegations added"
        autoClearOnSelect
      />
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {value.map((id) => {
            const delegation = byId.get(id);
            return (
              <li key={id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas py-1 pl-2 pr-1">
                  <Flag code={delegation?.countryCode} country={delegation?.country} size="xs" />
                  <span className="text-xs text-ink-700">{delegation?.country ?? id}</span>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((entry) => entry !== id))}
                    aria-label={`Remove ${delegation?.country ?? 'delegation'}`}
                    className="rounded-full p-0.5 text-ink-400 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-700"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
