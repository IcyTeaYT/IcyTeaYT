import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Coffee, GripVertical, Plus, SkipForward, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Select } from '@/components/ui/Field';
import { formatClock } from '@/lib/time';
import { DelegationPicker } from '../components/DelegationPicker';
import { Pane } from '../components/Pane';
import { TimerPanel } from '../components/TimerPanel';
import { UnmodMotionDialog } from '../components/UnmodMotionDialog';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import type { SpeakerEntry } from '../types';

const SPEAKING_TIMES = [30, 45, 60, 90, 120, 180];

function SortableSpeaker({
  entry,
  index,
  country,
  code,
  onRemove,
}: {
  entry: SpeakerEntry;
  index: number;
  country: string;
  code: string | null;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        isDragging
          ? 'relative z-10 flex items-center gap-3 bg-surface px-5 py-2.5 shadow-raised'
          : 'flex items-center gap-3 px-5 py-2.5'
      }
    >
      <button
        type="button"
        className="cursor-grab rounded text-ink-300 transition-colors duration-200 hover:text-ink-600 active:cursor-grabbing"
        aria-label={`Reorder ${country}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={1.5} />
      </button>
      <span className="tabular w-5 text-xs font-semibold text-ink-300">{index + 1}</span>
      <Flag code={code} country={country} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{country}</span>
      <Button variant="ghost" size="sm" iconOnly onClick={onRemove} aria-label={`Remove ${country}`}>
        <Trash2 size={15} strokeWidth={1.5} />
      </Button>
    </li>
  );
}

export function SpeakersList() {
  const { roster } = useChairContext();
  const { nameOf, codeOf } = useDelegationLookup();

  const gsl = useChair((state) => state.gsl);
  const attendance = useChair((state) => state.attendance);
  const add = useChair((state) => state.gslAdd);
  const remove = useChair((state) => state.gslRemove);
  const setQueue = useChair((state) => state.gslSetQueue);
  const next = useChair((state) => state.gslNext);
  const yieldTo = useChair((state) => state.gslYield);
  const setSpeakingTime = useChair((state) => state.gslSetSpeakingTime);
  const clear = useChair((state) => state.gslClear);

  const [yieldTarget, setYieldTarget] = useState<string | null>(null);
  const [motionOpen, setMotionOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const presentRoster = roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent');
  const current = gsl.queue.find((entry) => entry.id === gsl.currentId) ?? null;
  const upcoming = gsl.queue.filter((entry) => entry.id !== gsl.currentId);
  const queuedIds = gsl.queue.map((entry) => entry.delegationId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = upcoming.findIndex((entry) => entry.id === active.id);
    const to = upcoming.findIndex((entry) => entry.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(upcoming, from, to);
    // The delegate holding the floor stays at the head of the list.
    setQueue(current ? [current, ...reordered] : reordered);
  };

  return (
    <Pane
      title="General Speakers’ List"
      description="Only delegations marked present at roll call can be added."
      actions={
        <>
          <Button variant="ghost" onClick={clear} disabled={gsl.queue.length === 0 && gsl.spoken.length === 0}>
            Clear list
          </Button>
          <Button variant="primary" onClick={next} disabled={upcoming.length === 0 && !current}>
            <SkipForward size={15} strokeWidth={1.5} />
            Next speaker
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Current speaker */}
          <Card>
            <CardHeader label="Now speaking" />
            <CardBody className="py-6">
              {current ? (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Flag code={codeOf(current.delegationId)} country={nameOf(current.delegationId)} size="xl" />
                    <div>
                      <p className="font-serif text-[26px] leading-tight text-ink-900">
                        {nameOf(current.delegationId)}
                      </p>
                      {current.yielded ? (
                        <Badge tone="teal" className="mt-2">
                          Yielded to{' '}
                          {current.yielded.kind === 'chair'
                            ? 'the Chair'
                            : current.yielded.kind === 'questions'
                              ? 'questions'
                              : nameOf(current.yielded.toDelegationId)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No delegation has the floor. Add speakers below, then press Next speaker.
                </p>
              )}
            </CardBody>
          </Card>

          {/* The motion delegates raise most often between speeches — one tap. */}
          <Button
            variant="secondary"
            onClick={() => setMotionOpen(true)}
            className="h-14 w-full justify-start gap-3 border-teal-300 bg-teal-50/50 px-5 text-[15px] text-teal-800 hover:bg-teal-50"
          >
            <Coffee size={19} strokeWidth={1.5} />
            Motion for an Unmoderated Caucus
          </Button>

          {/* Queue */}
          <Card>
            <CardHeader
              label="Speakers’ list"
              title={`${upcoming.length} waiting`}
              action={
                <DelegationPicker
                  className="w-44 sm:w-56"
                  delegations={presentRoster}
                  value={null}
                  onChange={add}
                  disabledIds={queuedIds}
                  placeholder="Add a delegation"
                  emptyLabel={presentRoster.length ? 'All present delegations queued' : 'Take roll call first'}
                  autoClearOnSelect
                />
              }
            />
            {upcoming.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No one is queued"
                body="Search for a delegation above to add it to the list. Drag to reorder."
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={upcoming.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-hairline py-1">
                    {upcoming.map((entry, index) => (
                      <SortableSpeaker
                        key={entry.id}
                        entry={entry}
                        index={index}
                        country={nameOf(entry.delegationId)}
                        code={codeOf(entry.delegationId)}
                        onRemove={() => remove(entry.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </Card>

          {/* Spoken */}
          {gsl.spoken.length > 0 ? (
            <Card>
              <CardHeader label="Spoken" title={`${gsl.spoken.length} delegations`} />
              <ul className="flex flex-wrap gap-2 px-5 py-4">
                {gsl.spoken.map((entry) => (
                  <li
                    key={entry.id}
                    className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-2.5 py-1 opacity-60"
                  >
                    <Flag code={codeOf(entry.delegationId)} country={nameOf(entry.delegationId)} size="xs" />
                    <span className="text-xs text-ink-600">{nameOf(entry.delegationId)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* Timer + yields */}
        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardBody className="py-5">
              <TimerPanel
                timerKey="gsl"
                timer={gsl.timer}
                label="Speaking time"
                size="md"
                hint={formatClock(gsl.speakingTimeSec * 1000)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader label="Settings" />
            <CardBody className="space-y-4 py-4">
              <Field label="Speaking time" htmlFor="gsl-speaking-time">
                <Select
                  id="gsl-speaking-time"
                  value={String(gsl.speakingTimeSec)}
                  onChange={(event) => setSpeakingTime(Number(event.target.value))}
                >
                  {SPEAKING_TIMES.map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {formatClock(seconds * 1000)}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader label="Yield" />
            <CardBody className="space-y-3 py-4">
              <p className="text-xs leading-relaxed text-muted">
                A delegate with time remaining may yield it. Every yield is written to the session log.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" disabled={!current} onClick={() => yieldTo('chair')}>
                  To the Chair
                </Button>
                <Button variant="secondary" size="sm" disabled={!current} onClick={() => yieldTo('questions')}>
                  To questions
                </Button>
              </div>
              <div className="space-y-2 border-t border-hairline pt-3">
                <p className="label-micro">To another delegate</p>
                <DelegationPicker
                  delegations={presentRoster.filter((d) => d.id !== current?.delegationId)}
                  value={yieldTarget}
                  onChange={setYieldTarget}
                  placeholder="Choose a delegation"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={!current || !yieldTarget}
                  onClick={() => {
                    if (yieldTarget) {
                      yieldTo('delegate', yieldTarget);
                      setYieldTarget(null);
                    }
                  }}
                >
                  Yield the floor
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
      <UnmodMotionDialog open={motionOpen} onClose={() => setMotionOpen(false)} />
    </Pane>
  );
}
