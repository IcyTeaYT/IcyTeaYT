import { Award as AwardIcon, Check, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AWARDS, type AwardDefinition } from '@/config/awards';
import type { Delegation } from '@/data/source/types';
import { formatTimeOfDay } from '@/lib/time';
import { DelegationPicker } from '../components/DelegationPicker';
import { Pane } from '../components/Pane';
import { useChair, useChairContext } from '../context';
import type { Award } from '../types';

/**
 * One entry per delegation. A double delegation arrives as two roster rows
 * sharing an id; the award goes to the delegation, so it names both delegates.
 */
function delegationsOf(roster: Delegation[]): Delegation[] {
  const byId = new Map<string, Delegation>();
  for (const delegation of roster) {
    const existing = byId.get(delegation.id);
    byId.set(
      delegation.id,
      existing
        ? { ...existing, delegateName: [existing.delegateName, delegation.delegateName].filter(Boolean).join(' & ') }
        : delegation,
    );
  }
  return [...byId.values()];
}

export function Awards() {
  const { roster } = useChairContext();
  const awards = useChair((state) => state.awards);
  const delegations = useMemo(() => delegationsOf(roster), [roster]);
  const given = awards.length;

  return (
    <Pane
      title="Awards"
      description="Give each award to one delegation. The Secretariat sees it on the conference floor as soon as it is given, and you can change it until the closing ceremony."
      actions={
        <Badge tone={given === AWARDS.length ? 'success' : 'neutral'}>
          {given} of {AWARDS.length} given
        </Badge>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        {AWARDS.map((definition) => (
          <AwardCard
            key={definition.type}
            definition={definition}
            award={awards.find((award) => award.type === definition.type) ?? null}
            otherAwards={awards.filter((award) => award.type !== definition.type)}
            delegations={delegations}
          />
        ))}
      </div>
    </Pane>
  );
}

function AwardCard({
  definition,
  award,
  otherAwards,
  delegations,
}: {
  definition: AwardDefinition;
  award: Award | null;
  otherAwards: Award[];
  delegations: Delegation[];
}) {
  const giveAward = useChair((state) => state.giveAward);
  const removeAward = useChair((state) => state.removeAward);

  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // One delegation cannot hold both awards, so the other holder is not offered.
  const blocked = useMemo(() => otherAwards.map((entry) => entry.delegationId), [otherAwards]);
  const chosen = delegations.find((delegation) => delegation.id === choice) ?? null;
  const picking = !award || editing;

  const give = () => {
    if (!chosen) return;
    giveAward(definition.type, chosen);
    setChoice(null);
    setEditing(false);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        label={definition.label}
        title={
          <p className="text-sm text-muted">{definition.description}</p>
        }
        action={
          award && !editing ? (
            <Badge tone="success">
              <Check size={11} strokeWidth={1.5} />
              Given
            </Badge>
          ) : null
        }
      />

      <CardBody className="flex flex-1 flex-col gap-5 py-5">
        {award && !editing ? (
          <div className="flex items-center gap-4">
            <Flag code={award.countryCode} country={award.country} size="xl" />
            <div className="min-w-0">
              <p className="font-serif text-[22px] leading-tight text-ink-900">{award.country}</p>
              {award.delegateName ? (
                <p className="mt-1 truncate text-sm text-ink-700">{award.delegateName}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted">Given at {formatTimeOfDay(award.awardedAt)}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-teal-50 text-teal-600">
              <AwardIcon size={22} strokeWidth={1.5} />
            </span>
            <DelegationPicker
              className="w-full"
              delegations={delegations}
              value={choice}
              onChange={setChoice}
              disabledIds={blocked}
              placeholder="Choose a delegation"
            />
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          {picking ? (
            <>
              <Button variant="primary" disabled={!chosen} onClick={give}>
                <AwardIcon size={15} strokeWidth={1.5} />
                Give {definition.label}
              </Button>
              {editing ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setChoice(null);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <RefreshCw size={15} strokeWidth={1.5} />
                Change
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRemove(true)}>
                <Trash2 size={15} strokeWidth={1.5} />
                Remove
              </Button>
            </>
          )}
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => removeAward(definition.type)}
        title={`Remove ${definition.label}?`}
        body={`${award?.country ?? 'This delegation'} will no longer hold ${definition.label}. The Secretariat will see the change.`}
        confirmLabel="Remove award"
        destructive
      />
    </Card>
  );
}
