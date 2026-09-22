import { AlertTriangle, PlayCircle, Plus, SkipForward, Square, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input } from '@/components/ui/Field';
import { DEFAULTS } from '@/config/rules';
import { formatClock } from '@/lib/time';
import { remainingOf } from '@/lib/timer';
import { useTimer } from '@/lib/useTimer';
import { DelegationPicker } from '../components/DelegationPicker';
import { DurationInput } from '../components/DurationInput';
import { Pane } from '../components/Pane';
import { TimerPanel } from '../components/TimerPanel';
import { useChair, useChairContext, useDelegationLookup } from '../context';

/** Router state handed over when a passed caucus motion is started. */
export interface CaucusPrefill {
  topic?: string;
  purpose?: string;
  proposedBy?: string;
  totalSec?: number;
  speakingSec?: number;
}

export function ModeratedCaucus() {
  const { roster } = useChairContext();
  const { nameOf, codeOf } = useDelegationLookup();
  const location = useLocation();
  const prefill = (location.state as { prefill?: CaucusPrefill } | null)?.prefill;

  const moderated = useChair((state) => state.moderated);
  const attendance = useChair((state) => state.attendance);
  const start = useChair((state) => state.modStart);
  const addSpeaker = useChair((state) => state.modAddSpeaker);
  const removeSpeaker = useChair((state) => state.modRemoveSpeaker);
  const next = useChair((state) => state.modNext);
  const extend = useChair((state) => state.modExtend);
  const end = useChair((state) => state.modEnd);

  const [topic, setTopic] = useState('');
  const [proposedBy, setProposedBy] = useState<string | null>(null);
  const [totalSec, setTotalSec] = useState<number>(DEFAULTS.moderatedTotalSec);
  const [speakingSec, setSpeakingSec] = useState<number>(DEFAULTS.moderatedSpeakerSec);

  // Arriving from a passed motion: fill the form in from its parameters.
  useEffect(() => {
    if (!prefill) return;
    if (prefill.topic) setTopic(prefill.topic);
    if (prefill.proposedBy) setProposedBy(prefill.proposedBy);
    if (prefill.totalSec) setTotalSec(prefill.totalSec);
    if (prefill.speakingSec) setSpeakingSec(prefill.speakingSec);
  }, [prefill]);

  const presentRoster = roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent');
  const totalView = useTimer(moderated.totalTimer);
  const speakerCount = speakingSec > 0 ? Math.floor(totalSec / speakingSec) : 0;

  if (!moderated.active) {
    return (
      <Pane
        title="Moderated Caucus"
        description="Set the topic and the timing, then open the caucus. Both clocks run together once it starts."
      >
        <Card className="max-w-2xl">
          <CardHeader label="New caucus" title="Set up" />
          <CardBody className="space-y-5 py-5">
            <Field label="Topic" htmlFor="mod-topic">
              <Input
                id="mod-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. Funding mechanisms for early-warning systems"
              />
            </Field>

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

            <div className="flex flex-wrap gap-6">
              <DurationInput label="Total time" valueSec={totalSec} onChange={setTotalSec} />
              <DurationInput label="Speaking time" valueSec={speakingSec} onChange={setSpeakingSec} />
            </div>

            <div className="rounded-control border border-hairline bg-canvas px-4 py-3">
              <p className="text-sm text-ink-700">
                <span className="tabular font-semibold">{speakerCount}</span>{' '}
                {speakerCount === 1 ? 'speaker' : 'speakers'} at {formatClock(speakingSec * 1000)} each
                {totalSec % Math.max(1, speakingSec) !== 0 ? (
                  <span className="text-muted">
                    {' '}
                    · {formatClock((totalSec % speakingSec) * 1000)} left over
                  </span>
                ) : null}
              </p>
            </div>

            <Button
              variant="primary"
              disabled={!topic.trim() || !proposedBy || totalSec === 0 || speakingSec === 0}
              onClick={() => {
                if (!proposedBy) return;
                start({ topic: topic.trim(), proposedBy, totalSec, speakingSec });
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

  const expired = remainingOf(moderated.totalTimer, Date.now()) <= 0 && totalView.expired;

  return (
    <Pane
      title="Moderated Caucus"
      description={moderated.topic}
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
          <Button variant="primary" onClick={next} disabled={moderated.queue.length === 0}>
            <SkipForward size={15} strokeWidth={1.5} />
            Next speaker
          </Button>
        </>
      }
    >
      {expired ? (
        <div className="flex items-start gap-3 rounded-card border border-danger-border bg-danger-soft px-4 py-3.5">
          <AlertTriangle size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-danger">Caucus expired</p>
            <p className="mt-0.5 text-sm text-danger/85">
              The total time has run out. Extend the caucus or close it and return to the speakers’ list.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              label="Now speaking"
              action={<Badge tone="neutral">{moderated.spoken.length} spoken</Badge>}
            />
            <CardBody className="py-6">
              {moderated.currentDelegationId ? (
                <div className="flex items-center gap-4">
                  <Flag
                    code={codeOf(moderated.currentDelegationId)}
                    country={nameOf(moderated.currentDelegationId)}
                    size="xl"
                  />
                  <p className="font-serif text-[26px] leading-tight text-ink-900">
                    {nameOf(moderated.currentDelegationId)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Recognise a delegation from the queue to give it the floor.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              label="Queue"
              title={`${moderated.queue.length} waiting`}
              action={
                <DelegationPicker
                  className="w-56"
                  delegations={presentRoster}
                  value={null}
                  onChange={addSpeaker}
                  disabledIds={[...moderated.queue, ...(moderated.currentDelegationId ? [moderated.currentDelegationId] : [])]}
                  placeholder="Recognise a delegation"
                  autoClearOnSelect
                />
              }
            />
            {moderated.queue.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No delegations recognised"
                body="Add delegations as placards go up. They speak in the order you add them."
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {moderated.queue.map((delegationId, index) => (
                  <li key={delegationId} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="tabular w-5 text-xs font-semibold text-ink-300">{index + 1}</span>
                    <Flag code={codeOf(delegationId)} country={nameOf(delegationId)} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                      {nameOf(delegationId)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => removeSpeaker(delegationId)}
                      aria-label={`Remove ${nameOf(delegationId)}`}
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {moderated.spoken.length > 0 ? (
            <Card>
              <CardHeader label="Spoken" />
              <ul className="flex flex-wrap gap-2 px-5 py-4">
                {moderated.spoken.map((delegationId, index) => (
                  <li
                    key={`${delegationId}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-2.5 py-1 opacity-60"
                  >
                    <Flag code={codeOf(delegationId)} country={nameOf(delegationId)} size="xs" />
                    <span className="text-xs text-ink-600">{nameOf(delegationId)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardBody className="py-5">
              <TimerPanel
                timerKey="modSpeaker"
                timer={moderated.speakerTimer}
                label="Current speaker"
                size="md"
                hint={formatClock(moderated.speakingTimeSec * 1000)}
              />
            </CardBody>
          </Card>

          <Card className={expired ? 'border-danger-border' : undefined}>
            <CardBody className="py-5">
              <TimerPanel
                timerKey="modTotal"
                timer={moderated.totalTimer}
                label="Caucus total"
                size="md"
                hint={`Proposed by ${nameOf(moderated.proposedBy)}`}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </Pane>
  );
}
