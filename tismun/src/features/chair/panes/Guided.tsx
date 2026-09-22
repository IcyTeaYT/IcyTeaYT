import {
  ClipboardCheck,
  Coffee,
  Gavel,
  ListOrdered,
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
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { DEFAULTS, QUORUM } from '@/config/rules';
import { hasQuorum, quorumNeeded, simpleMajority, twoThirdsMajority } from '@/lib/majority';
import { cn } from '@/lib/cn';
import { isRunning } from '@/lib/timer';
import { Pane, Stat } from '../components/Pane';
import { TimerDisplay } from '../components/TimerPanel';
import { useChair, useChairStoreApi } from '../context';
import { guidedStage, type GuidedAction, type GuidedCommand } from '../guide';
import { presentIds, presentAndVotingIds, type ChairState, type TimerKey } from '../store';

const ICONS: Record<GuidedAction['icon'], LucideIcon> = {
  clipboard: ClipboardCheck,
  play: Play,
  pause: Pause,
  skip: SkipForward,
  plus: Plus,
  stop: Square,
  gavel: Gavel,
  list: ListOrdered,
  vote: VoteIcon,
  users: Users,
  coffee: Coffee,
  reset: RotateCcw,
};

function runCommand(state: ChairState, command: GuidedCommand): void {
  switch (command) {
    case 'mark-all-present':
      state.markAllPresent();
      break;
    case 'take-roll-call':
      state.takeRollCall();
      break;
    case 'gsl-next':
      state.gslNext();
      break;
    case 'mod-next':
      state.modNext();
      break;
    case 'mod-extend':
      state.modExtend(DEFAULTS.extensionSec);
      break;
    case 'mod-end':
      state.modEnd();
      break;
    case 'unmod-extend':
      state.unmodExtend(DEFAULTS.extensionSec);
      break;
    case 'unmod-end':
      state.unmodEnd();
      break;
    case 'timer-toggle':
    case 'timer-reset':
      break;
  }
}

/**
 * The chair's default screen: one panel saying where the committee is and what
 * it can do next, with every control a single tap away.
 *
 * Only the layout is simplified. Every label is the official term — a chair
 * reading "Moderated Caucus" here and "Moderated Caucus" in the rules of
 * procedure is reading the same thing.
 */
export function Guided() {
  const store = useChairStoreApi();
  const navigate = useNavigate();

  // Select the state object itself, then derive. `guidedStage` builds a fresh
  // object on every call, and zustand compares what a selector returns by
  // reference — handing it a new object each render reads as a change each
  // render and spins. The identity of `state` only changes when the session
  // actually changes, which is exactly when the guidance should be recomputed.
  const state = useChair((snapshot) => snapshot);
  const guide = useMemo(() => guidedStage(state), [state]);

  const { attendance, names, gsl, moderated, unmoderated, motions, resolutions } = state;
  const timerToggle = state.timerToggle;
  const timerReset = state.timerReset;

  const present = presentIds(attendance).length;
  const presentAndVoting = presentAndVotingIds(attendance).length;
  const total = Object.keys(names).length;
  const quorum = hasQuorum(present, total);
  const onFloor = motions.filter((motion) => motion.status === 'floor').length;

  const timerFor = (key: TimerKey) =>
    key === 'gsl'
      ? gsl.timer
      : key === 'modSpeaker'
        ? moderated.speakerTimer
        : key === 'modTotal'
          ? moderated.totalTimer
          : unmoderated.timer;

  const activeTimer = guide.timer ? timerFor(guide.timer.key) : null;
  const running = activeTimer ? isRunning(activeTimer) : false;

  const perform = (action: GuidedAction) => {
    if (action.to) navigate(action.to);
    else if (action.command) runCommand(store.getState(), action.command);
  };

  const primary = guide.actions.filter((action) => action.emphasis === 'primary');
  const secondary = guide.actions.filter((action) => action.emphasis === 'secondary');

  return (
    <Pane title="Guided Mode" description="Where the committee is, and what it can do next.">
      <Card>
        <CardBody className="space-y-7 px-6 py-7 sm:px-8 sm:py-8">
          <div>
            <p className="label-micro">{guide.stage}</p>
            <h3 className="mt-3 font-serif text-[26px] leading-tight text-ink-900 sm:text-[32px]">
              {guide.headline}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              {guide.hint}
            </p>
          </div>

          {guide.timer && activeTimer ? (
            <div className="flex flex-wrap items-end justify-between gap-6 rounded-card border border-hairline bg-canvas px-5 py-5">
              <div>
                <p className="label-micro">{guide.timer.label}</p>
                <div className="mt-2">
                  <TimerDisplay timer={activeTimer} size="lg" showProgress={false} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={running ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={() => guide.timer && timerToggle(guide.timer.key)}
                >
                  {running ? (
                    <>
                      <Pause size={17} strokeWidth={1.5} />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={17} strokeWidth={1.5} />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  variant="quiet"
                  size="lg"
                  onClick={() => guide.timer && timerReset(guide.timer.key)}
                >
                  <RotateCcw size={17} strokeWidth={1.5} />
                  Reset
                </Button>
              </div>
            </div>
          ) : null}

          {/* Big, obvious next steps. */}
          <div className="space-y-3">
            {primary.map((action) => {
              const Icon = ICONS[action.icon];
              return (
                <Button
                  key={action.label}
                  variant="primary"
                  onClick={() => perform(action)}
                  className="h-14 w-full justify-start gap-3 px-5 text-[15px] sm:h-16 sm:text-base"
                >
                  <Icon size={20} strokeWidth={1.5} />
                  {action.label}
                </Button>
              );
            })}

            {secondary.length > 0 ? (
              <div className={cn('grid gap-3', secondary.length > 2 ? 'sm:grid-cols-2' : '')}>
                {secondary.map((action) => {
                  const Icon = ICONS[action.icon];
                  return (
                    <Button
                      key={action.label}
                      variant="secondary"
                      onClick={() => perform(action)}
                      className="h-auto min-h-[52px] w-full justify-start gap-3 px-5 py-3.5 text-[15px]"
                    >
                      <Icon size={18} strokeWidth={1.5} />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Standing figures the chair is asked for constantly. */}
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
            <Stat label="Simple majority" value={simpleMajority(present)} hint="votes" />
            <Stat label="Two-thirds majority" value={twoThirdsMajority(present)} hint="votes" />
            <Stat label="Motions on the floor" value={onFloor} />
            <Stat label="Draft Resolutions" value={resolutions.length} />
          </dl>
        </CardBody>
      </Card>
    </Pane>
  );
}
