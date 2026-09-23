import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Coffee,
  FileText,
  Gavel,
  ListOrdered,
  MessageCircleQuestion,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Square,
  Users,
  Vote as VoteIcon,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DEFAULTS, PRESENTATION, QUORUM } from '@/config/rules';
import { hasQuorum, quorumNeeded, simpleMajority, twoThirdsMajority } from '@/lib/majority';
import { cn } from '@/lib/cn';
import { isRunning } from '@/lib/timer';
import { Pane, Stat } from '../components/Pane';
import { TimerDisplay } from '../components/TimerPanel';
import { UnmodMotionDialog } from '../components/UnmodMotionDialog';
import { useChair, useChairContext, useChairStoreApi } from '../context';
import {
  currentStepIndex,
  guidedStage,
  sessionChecklist,
  type GuidedAction,
  type GuidedCommand,
  type GuidedStage,
} from '../guide';
import { presentAndVotingIds, presentIds, type ChairState, type TimerKey } from '../store';

const ICONS: Record<GuidedAction['icon'], LucideIcon> = {
  clipboard: ClipboardCheck,
  play: Play,
  skip: SkipForward,
  plus: Plus,
  stop: Square,
  gavel: Gavel,
  list: ListOrdered,
  vote: VoteIcon,
  users: Users,
  coffee: Coffee,
  mic: Mic,
  question: MessageCircleQuestion,
  file: FileText,
};

/** Commands that act on the session directly. The one that opens a dialog is handled by the view. */
function runCommand(state: ChairState, command: Exclude<GuidedCommand, 'unmod-motion'>): void {
  switch (command) {
    case 'mark-all-present':
      state.markAllPresent();
      break;
    case 'gsl-next':
      state.gslNext();
      break;
    case 'unmod-extend':
      state.unmodExtend(DEFAULTS.extensionSec);
      break;
    case 'unmod-end':
      state.unmodEnd();
      break;
    case 'present-questions':
      state.presentOpenQuestions(PRESENTATION.qaSec);
      break;
    case 'present-end':
      state.presentEnd();
      break;
  }
}

/**
 * The chair's default screen: the whole session as a list, with the step the
 * committee is actually on opened up and everything it needs one tap away.
 *
 * Steps mark themselves done by reading the session, so the list cannot
 * disagree with what happened. Only the layout is simplified — every label is
 * the official term, so a chair who learns this screen has learned the order
 * of business, not a house dialect of it.
 */
export function Guided() {
  const store = useChairStoreApi();
  const { committee } = useChairContext();
  const navigate = useNavigate();
  const [motionOpen, setMotionOpen] = useState(false);

  // Select the state object itself, then derive. Both helpers build a fresh
  // object on every call, and zustand compares what a selector returns by
  // reference — returning a new object each render reads as a change each
  // render and spins.
  const state = useChair((snapshot) => snapshot);
  const guide = useMemo(() => guidedStage(state, committee.id), [state, committee.id]);
  const steps = useMemo(() => sessionChecklist(state, committee.id), [state, committee.id]);
  const currentIndex = currentStepIndex(steps);
  const completed = steps.filter((step) => step.done).length;

  const { attendance, names, motions, resolutions } = state;
  const present = presentIds(attendance).length;
  const presentAndVoting = presentAndVotingIds(attendance).length;
  const total = Object.keys(names).length;
  const quorum = hasQuorum(present, total);
  const onFloor = motions.filter((motion) => motion.status === 'floor').length;

  const perform = (action: GuidedAction) => {
    if (action.to) navigate(action.to, action.motion ? { state: { motion: action.motion } } : undefined);
    else if (action.command === 'unmod-motion') setMotionOpen(true);
    else if (action.command) runCommand(store.getState(), action.command);
  };

  return (
    <Pane
      title="Guided Mode"
      description="The order of business, and what the committee should do next."
    >
      <Card>
        <CardHeader
          label="Order of business"
          title={`Step ${currentIndex + 1} of ${steps.length}`}
          action={
            <div className="flex items-center gap-3">
              <span className="tabular text-xs text-muted">
                {completed}/{steps.length} done
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
                  style={{ width: `${(completed / steps.length) * 100}%` }}
                />
              </div>
            </div>
          }
        />

        <ol className="divide-y divide-hairline">
          {steps.map((step, index) => {
            const isCurrent = index === currentIndex;
            return (
              <li key={step.id} className={cn(isCurrent && 'bg-teal-50/40')}>
                <div className="flex gap-4 px-5 py-4 sm:px-6">
                  <StepMarker done={step.done} current={isCurrent} number={index + 1} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p
                        className={cn(
                          'font-medium',
                          isCurrent
                            ? 'text-[17px] text-ink-900'
                            : step.done
                              ? 'text-sm text-muted'
                              : 'text-sm text-ink-700',
                        )}
                      >
                        {step.label}
                      </p>
                      {!isCurrent ? (
                        <Link
                          to={step.to}
                          className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                        >
                          Open
                          <ArrowRight
                            size={12}
                            strokeWidth={1.5}
                            className="transition-transform duration-200 group-hover:translate-x-0.5"
                          />
                        </Link>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm leading-relaxed text-muted">{step.hint}</p>

                    {isCurrent ? (
                      <CurrentStep
                        guide={guide}
                        stepLabel={step.label}
                        state={state}
                        onAction={perform}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* The standing figures a chair is asked for constantly. */}
      <Card>
        <CardBody className="py-2">
          <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Present" value={present} hint={`of ${total}`} />
            <Stat label="Present and Voting" value={presentAndVoting} />
            <Stat
              label={`Quorum (${QUORUM.label})`}
              value={quorum ? 'Reached' : 'Not reached'}
              hint={`needs ${quorumNeeded(total)}`}
              tone={quorum ? 'success' : 'danger'}
            />
            <Stat label="Simple Majority" value={simpleMajority(present)} hint="votes" />
            <Stat label="Two-Thirds Majority" value={twoThirdsMajority(present)} hint="votes" />
            <Stat label="Motions on the floor" value={onFloor} />
            <Stat label="Draft Resolutions" value={resolutions.length} />
          </dl>
        </CardBody>
      </Card>

      <UnmodMotionDialog open={motionOpen} onClose={() => setMotionOpen(false)} />
    </Pane>
  );
}

function StepMarker({
  done,
  current,
  number,
}: {
  done: boolean;
  current: boolean;
  number: number;
}) {
  return (
    <span
      className={cn(
        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        done && !current && 'bg-success-soft text-success',
        current && 'bg-teal-500 text-white',
        !done && !current && 'border border-hairline bg-surface text-ink-300',
      )}
    >
      {done && !current ? <Check size={14} strokeWidth={2.5} /> : number}
    </span>
  );
}

/** The open step: the clock that matters, and the buttons that move it on. */
function CurrentStep({
  guide,
  stepLabel,
  state,
  onAction,
}: {
  guide: GuidedStage;
  stepLabel: string;
  state: ChairState;
  onAction: (action: GuidedAction) => void;
}) {
  const timerFor = (key: TimerKey) =>
    key === 'gsl'
      ? state.gsl.timer
      : key === 'present'
        ? state.presentation.timer
        : state.unmoderated.timer;

  const activeTimer = guide.timer ? timerFor(guide.timer.key) : null;
  const running = activeTimer ? isRunning(activeTimer) : false;

  const primary = guide.actions.filter((action) => action.emphasis === 'primary');
  const secondary = guide.actions.filter((action) => action.emphasis === 'secondary');

  // The guidance headline often repeats the step's own name; show it only when
  // it adds something — the caucus topic, or who currently has the floor.
  const showHeadline = guide.headline !== stepLabel;

  return (
    <div className="mt-4 space-y-4">
      {showHeadline ? (
        <div>
          <p className="label-micro text-teal-700">{guide.stage}</p>
          <p className="mt-1.5 font-serif text-[22px] leading-tight text-ink-900">
            {guide.headline}
          </p>
        </div>
      ) : null}

      {guide.timer && activeTimer ? (
        <div className="flex flex-wrap items-end justify-between gap-5 rounded-card border border-hairline bg-surface px-5 py-4">
          <div>
            <p className="label-micro">{guide.timer.label}</p>
            <div className="mt-1.5">
              <TimerDisplay timer={activeTimer} size="md" showProgress={false} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={running ? 'secondary' : 'primary'}
              onClick={() => guide.timer && state.timerToggle(guide.timer.key)}
            >
              {running ? (
                <>
                  <Pause size={16} strokeWidth={1.5} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} strokeWidth={1.5} />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="quiet"
              onClick={() => guide.timer && state.timerReset(guide.timer.key)}
            >
              <RotateCcw size={16} strokeWidth={1.5} />
              Reset
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {primary.map((action) => {
          const Icon = ICONS[action.icon];
          return (
            <Button
              key={action.label}
              variant="primary"
              onClick={() => onAction(action)}
              className="h-14 w-full justify-start gap-3 px-5 text-[15px] sm:h-16 sm:text-base"
            >
              <Icon size={20} strokeWidth={1.5} />
              {action.label}
            </Button>
          );
        })}

        {secondary.length > 0 ? (
          <div className={cn('grid gap-2.5', secondary.length > 2 ? 'sm:grid-cols-2' : '')}>
            {secondary.map((action) => {
              const Icon = ICONS[action.icon];
              return (
                <Button
                  key={action.label}
                  variant="secondary"
                  onClick={() => onAction(action)}
                  className="h-auto min-h-[50px] w-full justify-start gap-3 px-5 py-3 text-[15px]"
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
