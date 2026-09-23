import { AlertTriangle, Gavel, PlayCircle, Plus, Square } from 'lucide-react';
import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { flowFor } from '@/config/flows';
import { DEFAULTS } from '@/config/rules';
import { formatClock } from '@/lib/time';
import { useTimer } from '@/lib/useTimer';
import { DelegationPicker } from '../components/DelegationPicker';
import { DurationPresets } from '../components/DurationPresets';
import { Pane } from '../components/Pane';
import { TimerPanel } from '../components/TimerPanel';
import { UnmodMotionDialog } from '../components/UnmodMotionDialog';
import { useChair, useChairContext, useDelegationLookup } from '../context';

/**
 * The committee's main debate tool. TISMUN runs a simplified procedure with no
 * Moderated Caucus: between speeches on the General Speakers' List, delegates
 * move Unmoderated Caucuses to work on the draft resolution together.
 */
export function UnmoderatedCaucus() {
  const { roster, committee } = useChairContext();
  const { nameOf } = useDelegationLookup();

  const unmoderated = useChair((state) => state.unmoderated);
  const attendance = useChair((state) => state.attendance);
  const start = useChair((state) => state.unmodStart);
  const extend = useChair((state) => state.unmodExtend);
  const end = useChair((state) => state.unmodEnd);

  const [purpose, setPurpose] = useState(() => flowFor(committee.id).unmoderatedPurpose);
  const [proposedBy, setProposedBy] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(DEFAULTS.unmoderatedSec);
  const [motionOpen, setMotionOpen] = useState(false);

  const presentRoster = roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent');
  const view = useTimer(unmoderated.timer);

  if (!unmoderated.active) {
    return (
      <Pane
        title="Unmoderated Caucus"
        description="Formal debate is suspended while delegates work on the draft resolution together, until the clock runs out."
        actions={
          <Button variant="primary" onClick={() => setMotionOpen(true)}>
            <Gavel size={15} strokeWidth={1.5} />
            Motion for an Unmoderated Caucus
          </Button>
        }
      >
        <Card className="max-w-2xl">
          <CardHeader
            label="Open a caucus"
            title="A motion has passed"
          />
          <CardBody className="space-y-5 py-5">
            <p className="text-sm leading-relaxed text-muted">
              Use this once the committee has voted a Motion for an Unmoderated Caucus through. To
              put a new motion to the committee, use the button above.
            </p>

            <DurationPresets label="Duration" valueSec={durationSec} onChange={setDurationSec} />

            <div>
              <span className="label-micro mb-1.5 block">Moved by</span>
              <DelegationPicker
                delegations={presentRoster}
                value={proposedBy}
                onChange={setProposedBy}
                placeholder="Choose a delegation"
                emptyLabel="Take roll call first"
              />
            </div>

            <Field label="Purpose" htmlFor="unmod-purpose" hint="Shown on the projector.">
              <Input
                id="unmod-purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
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
              Open the Unmoderated Caucus
            </Button>
          </CardBody>
        </Card>

        <UnmodMotionDialog open={motionOpen} onClose={() => setMotionOpen(false)} />
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
            Close the caucus
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
            hint={`Moved by ${nameOf(unmoderated.proposedBy)}`}
          />
        </CardBody>
      </Card>
    </Pane>
  );
}
