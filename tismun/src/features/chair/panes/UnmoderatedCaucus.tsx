import { AlertTriangle, PlayCircle, Plus, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { DEFAULTS } from '@/config/rules';
import { formatClock } from '@/lib/time';
import { useTimer } from '@/lib/useTimer';
import { DelegationPicker } from '../components/DelegationPicker';
import { DurationInput } from '../components/DurationInput';
import { Pane } from '../components/Pane';
import { TimerPanel } from '../components/TimerPanel';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import type { CaucusPrefill } from './ModeratedCaucus';

export function UnmoderatedCaucus() {
  const { roster } = useChairContext();
  const { nameOf } = useDelegationLookup();
  const location = useLocation();
  const prefill = (location.state as { prefill?: CaucusPrefill } | null)?.prefill;

  const unmoderated = useChair((state) => state.unmoderated);
  const attendance = useChair((state) => state.attendance);
  const start = useChair((state) => state.unmodStart);
  const extend = useChair((state) => state.unmodExtend);
  const end = useChair((state) => state.unmodEnd);

  const [purpose, setPurpose] = useState('');
  const [proposedBy, setProposedBy] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(DEFAULTS.unmoderatedSec);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.purpose) setPurpose(prefill.purpose);
    if (prefill.proposedBy) setProposedBy(prefill.proposedBy);
    if (prefill.totalSec) setDurationSec(prefill.totalSec);
  }, [prefill]);

  const presentRoster = roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent');
  const view = useTimer(unmoderated.timer);

  if (!unmoderated.active) {
    return (
      <Pane
        title="Unmoderated Caucus"
        description="Formal debate is suspended and delegates lobby freely until the clock runs out."
      >
        <Card className="max-w-2xl">
          <CardHeader label="New caucus" title="Set up" />
          <CardBody className="space-y-5 py-5">
            <DurationInput label="Duration" valueSec={durationSec} onChange={setDurationSec} />

            <div>
              <span className="label-micro mb-1.5 block">Proposed by</span>
              <DelegationPicker
                delegations={presentRoster}
                value={proposedBy}
                onChange={setProposedBy}
                placeholder="Choose a delegation"
                emptyLabel="Take roll call first"
              />
            </div>

            <Field label="Purpose" htmlFor="unmod-purpose" hint="Optional — shown on the projector.">
              <Input
                id="unmod-purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="e.g. Draft resolution writing"
              />
            </Field>

            <Button
              variant="primary"
              disabled={!proposedBy || durationSec === 0}
              onClick={() => {
                if (!proposedBy) return;
                start({ purpose: purpose.trim(), proposedBy, durationSec });
              }}
            >
              <PlayCircle size={15} strokeWidth={1.5} />
              Open caucus
            </Button>
          </CardBody>
        </Card>
      </Pane>
    );
  }

  return (
    <Pane
      title="Unmoderated Caucus"
      description={unmoderated.purpose || 'Formal debate is suspended.'}
      actions={
        <>
          <Button variant="ghost" onClick={() => extend(DEFAULTS.extensionSec)}>
            <Plus size={15} strokeWidth={1.5} />
            Extend {formatClock(DEFAULTS.extensionSec * 1000)}
          </Button>
          <Button variant="secondary" onClick={end}>
            <Square size={15} strokeWidth={1.5} />
            Close caucus
          </Button>
        </>
      }
    >
      {view.expired ? (
        <div className="flex items-start gap-3 rounded-card border border-danger-border bg-danger-soft px-4 py-3.5">
          <AlertTriangle size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-danger">Caucus expired</p>
            <p className="mt-0.5 text-sm text-danger/85">
              Call the committee back to order, or extend the caucus.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="max-w-2xl">
        <CardBody className="py-7">
          <TimerPanel
            timerKey="unmod"
            timer={unmoderated.timer}
            label="Time remaining"
            size="lg"
            hint={`Proposed by ${nameOf(unmoderated.proposedBy)}`}
          />
        </CardBody>
      </Card>
    </Pane>
  );
}
