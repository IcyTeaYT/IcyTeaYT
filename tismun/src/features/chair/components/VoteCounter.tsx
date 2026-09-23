import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** A For or Against count on a procedural vote, stepped with − and +. */
export function VoteCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="label-micro w-12">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="quiet"
          size="sm"
          iconOnly
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`One fewer ${label}`}
        >
          <Minus size={13} strokeWidth={1.5} />
        </Button>
        <span className="tabular w-8 text-center text-sm font-semibold text-ink-900">{value}</span>
        <Button
          variant="quiet"
          size="sm"
          iconOnly
          onClick={() => onChange(value + 1)}
          aria-label={`One more ${label}`}
        >
          <Plus size={13} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
