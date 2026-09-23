import { Check, Coffee, Gavel, PlayCircle, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { flowFor } from '@/config/flows';
import { DEFAULTS, MAJORITY_LABEL, MOTION_BY_ID } from '@/config/rules';
import { requiredVotes } from '@/lib/majority';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';
import { useChair, useChairContext } from '../context';
import { DurationPresets } from './DurationPresets';
import { VoteCounter } from './VoteCounter';

type Step = 'raise' | 'vote' | 'passed' | 'failed';

/**
 * Motion for an Unmoderated Caucus, start to finish, without leaving the
 * screen: the delegation moves it, the committee votes, and if it carries the
 * caucus opens as moved. It is the motion delegates raise most often, so it is
 * one tap from the General Speakers' List and from Guided Mode.
 */
export function UnmodMotionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { roster, committee } = useChairContext();
  const attendance = useChair((state) => state.attendance);
  const motions = useChair((state) => state.motions);
  const raiseMotion = useChair((state) => state.raiseMotion);
  const setVotes = useChair((state) => state.setMotionVotes);
  const decide = useChair((state) => state.decideMotion);
  const markStarted = useChair((state) => state.markMotionStarted);
  const startCaucus = useChair((state) => state.unmodStart);

  const defaultPurpose = flowFor(committee.id).unmoderatedPurpose;
  const [step, setStep] = useState<Step>('raise');
  const [durationSec, setDurationSec] = useState<number>(DEFAULTS.unmoderatedSec);
  const [proposedBy, setProposedBy] = useState('');
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [motionId, setMotionId] = useState<string | null>(null);

  const present = useMemo(
    () => roster.filter((delegation) => (attendance[delegation.id] ?? 'absent') !== 'absent'),
    [roster, attendance],
  );
  const rule = MOTION_BY_ID['unmoderated-caucus'];
  const required = requiredVotes(rule.majority, present.length);
  const motion = motions.find((entry) => entry.id === motionId) ?? null;

  const reset = () => {
    setStep('raise');
    setDurationSec(DEFAULTS.unmoderatedSec);
    setProposedBy('');
    setPurpose(defaultPurpose);
    setMotionId(null);
  };

  const close = () => {
    onClose();
    // Let the closing animation finish before the form resets underneath it.
    window.setTimeout(reset, 250);
  };

  const raise = () => {
    if (!proposedBy) return;
    setMotionId(
      raiseMotion({
        type: 'unmoderated-caucus',
        proposedBy,
        params: { totalTimeSec: durationSec, purpose: purpose.trim() },
      }),
    );
    setStep('vote');
  };

  const recordVote = () => {
    if (!motion) return;
    decide(motion.id, present.length);
    setStep(motion.votesFor >= required ? 'passed' : 'failed');
  };

  const openCaucus = () => {
    if (!motion) return;
    markStarted(motion.id);
    startCaucus({ purpose: purpose.trim(), proposedBy, durationSec });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Motion for an Unmoderated Caucus"
      description={`${MAJORITY_LABEL[rule.majority]} · ${present.length} present`}
      footer={
        step === 'raise' ? (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!proposedBy || durationSec === 0} onClick={raise}>
              <Gavel size={15} strokeWidth={1.5} />
              Put on the floor
            </Button>
          </>
        ) : step === 'vote' ? (
          <Button variant="primary" onClick={recordVote} disabled={present.length === 0}>
            Record vote
          </Button>
        ) : step === 'passed' ? (
          <>
            <Button variant="ghost" onClick={close}>
              Not now
            </Button>
            <Button variant="primary" onClick={openCaucus}>
              <PlayCircle size={15} strokeWidth={1.5} />
              Open the Unmoderated Caucus
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={close}>
            Back to debate
          </Button>
        )
      }
    >
      <div className="space-y-5 px-5 py-5">
        {step === 'raise' ? (
          <>
            {present.length === 0 ? (
              <p className="rounded-control border border-warning-border bg-warning-soft px-3 py-2.5 text-sm text-warning">
                Take the Roll Call first: only delegations present may move a motion.
              </p>
            ) : null}

            <DurationPresets label="Duration" valueSec={durationSec} onChange={setDurationSec} />

            <Field label="Moved by" htmlFor="unmod-motion-by">
              <Select
                id="unmod-motion-by"
                value={proposedBy}
                onChange={(event) => setProposedBy(event.target.value)}
              >
                <option value="" disabled>
                  Choose a delegation
                </option>
                {present.map((delegation) => (
                  <option key={delegation.id} value={delegation.id}>
                    {delegation.country}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Purpose" htmlFor="unmod-motion-purpose" hint="Shown on the projector.">
              <Input
                id="unmod-motion-purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 'vote' && motion ? (
          <>
            <Summary durationSec={durationSec} purpose={purpose} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <VoteCounter
                label="For"
                value={motion.votesFor}
                onChange={(value) => setVotes(motion.id, value, motion.votesAgainst)}
              />
              <VoteCounter
                label="Against"
                value={motion.votesAgainst}
                onChange={(value) => setVotes(motion.id, motion.votesFor, value)}
              />
            </div>
            <p className="text-sm text-muted">
              <span
                className={cn(
                  'tabular font-semibold',
                  motion.votesFor >= required ? 'text-success' : 'text-ink-900',
                )}
              >
                {motion.votesFor}
              </span>{' '}
              of {required} votes needed to pass.
            </p>
          </>
        ) : null}

        {step === 'passed' ? (
          <div className="space-y-4">
            <Badge tone="success">
              <Check size={11} strokeWidth={2} />
              Motion passed
            </Badge>
            <Summary durationSec={durationSec} purpose={purpose} />
            <p className="text-sm text-muted">
              Opening the caucus starts its clock and puts it on the projector.
            </p>
          </div>
        ) : null}

        {step === 'failed' ? (
          <div className="space-y-3">
            <Badge tone="danger">
              <X size={11} strokeWidth={2} />
              Motion failed
            </Badge>
            <p className="text-sm text-muted">Formal debate continues.</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function Summary({ durationSec, purpose }: { durationSec: number; purpose: string }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-hairline bg-canvas px-4 py-3">
      <Coffee size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-teal-600" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">
          Unmoderated Caucus · {formatClock(durationSec * 1000)}
        </p>
        {purpose.trim() ? <p className="mt-0.5 text-sm text-muted">{purpose.trim()}</p> : null}
      </div>
    </div>
  );
}
