import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Coffee,
  FileText,
  Gavel,
  Hand,
  Loader2,
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
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { flowFor } from '@/config/flows';
import { DEBATE, PRESENTATION, QUORUM } from '@/config/rules';
import { emergencySession } from '@/config/emergency';
import type { Delegation } from '@/data/source/types';
import { AmendmentCard, ResolutionClauses } from '@/features/resolutions/ResolutionDocument';
import { cn } from '@/lib/cn';
import { hasQuorum, quorumNeeded, simpleMajority, twoThirdsMajority } from '@/lib/majority';
import { countryCode, sameCountryAs, type Amendment } from '@/lib/resolution';
import { formatClock } from '@/lib/time';
import { isRunning, type TimerState } from '@/lib/timer';
import { DurationPresets } from '../components/DurationPresets';
import { Pane, Stat } from '../components/Pane';
import { TimerDisplay } from '../components/TimerPanel';
import { VotePanel } from '../components/VotePanel';
import { useChair, useChairContext, useChairStoreApi } from '../context';
import {
  amendmentUnmodKey,
  closingDoneKey,
  closingStartedKey,
  count,
  currentStepIndex,
  guidedScreen,
  sessionChecklist,
  skipKey,
  writingUnmodKey,
  type GuidedScreen,
} from '../guide';
import { useChairRes } from '../resContext';
import { presentAndVotingIds, presentIds, stepKey, type ChairState, type TimerKey } from '../store';
import type { SpeechPart } from '../types';

/**
 * The chair's default screen: TISMUN's order of events, and one panel at the
 * top saying what to do right now, with the button that does it. Chairs do
 * not need to know where any tool lives — whatever the committee needs next
 * is here.
 */
export function Guided() {
  const { committee } = useChairContext();
  const { res, unsent } = useChairRes();
  const state = useChair((snapshot) => snapshot);
  const store = useChairStoreApi();

  const screen = useMemo(() => guidedScreen(state, committee.id, res), [state, committee.id, res]);
  const steps = useMemo(() => sessionChecklist(state, committee.id, res), [state, committee.id, res]);
  const currentIndex = currentStepIndex(steps);
  const completed = steps.filter((step) => step.done).length;

  const present = presentIds(state.attendance).length;
  const presentAndVoting = presentAndVotingIds(state.attendance).length;
  const total = Object.keys(state.names).length;
  const quorum = hasQuorum(present, total);

  return (
    <Pane
      title="Guided Mode"
      description="Follow the big button. It always shows what the committee does next."
      actions={
        res.topics.length > 1 ? (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
            Topic {res.topic} of {res.topics.length}
          </span>
        ) : null
      }
    >
      {unsent > 0 ? (
        <p className="flex items-center gap-2 rounded-card border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
          <Loader2 size={15} className="animate-spin" />
          A vote result is still being saved — check the internet connection. It keeps trying.
        </p>
      ) : null}

      <Card className="border-teal-200 ring-1 ring-inset ring-teal-100">
        <CardBody className="px-5 py-6 sm:px-7">
          <NowPanel screen={screen} state={state} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          label={res.topics.length > 1 ? `Order of events · Topic ${res.topic}` : 'Order of events'}
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
              <li key={step.id} className={cn('flex gap-4 px-5 py-3.5 sm:px-6', isCurrent && 'bg-teal-50/50')}>
                <StepMarker done={step.done && !isCurrent} current={isCurrent} number={index + 1} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', isCurrent ? 'text-ink-900' : step.done ? 'text-muted' : 'text-ink-700')}>
                    {step.label}
                  </p>
                  {isCurrent ? <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.hint}</p> : null}
                </div>
                {isCurrent && step.id !== 'roll-call' && step.id !== 'result' ? (
                  <button
                    type="button"
                    className="shrink-0 self-start text-xs font-medium text-muted hover:text-ink-900"
                    onClick={() => store.getState().markStep(skipKey(res.topic, step.id))}
                  >
                    Skip
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Card>

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
            <Stat label="Amendments waiting" value={res.pending.length} />
          </dl>
        </CardBody>
      </Card>
    </Pane>
  );
}

function StepMarker({ done, current, number }: { done: boolean; current: boolean; number: number }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
        done && 'bg-success-soft text-success',
        current && 'bg-teal-500 text-white',
        !done && !current && 'border border-hairline bg-surface text-ink-300',
      )}
    >
      {done ? <Check size={13} strokeWidth={2.5} /> : number}
    </span>
  );
}

/* ── The panel: what to do now ───────────────────────────────────────────── */

function Heading({ stage, title, children }: { stage: string; title: string; children?: ReactNode }) {
  return (
    <div>
      <p className="label-micro text-teal-700">{stage}</p>
      <h2 className="mt-1.5 font-serif text-[24px] leading-tight text-ink-900 sm:text-[28px]">{title}</h2>
      {children ? <div className="mt-2 text-[15px] leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}

function Big({
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      className="h-auto min-h-[56px] w-full justify-start gap-3 whitespace-normal px-5 py-3 text-left text-[16px] sm:min-h-[60px]"
    >
      <Icon size={21} strokeWidth={1.6} className="shrink-0" />
      {children}
    </Button>
  );
}

function Small({ icon: Icon, children, onClick }: { icon: LucideIcon; children: ReactNode; onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="h-auto min-h-[48px] w-full justify-start gap-3 whitespace-normal px-5 py-2.5 text-left text-[15px]"
    >
      <Icon size={18} strokeWidth={1.5} className="shrink-0" />
      {children}
    </Button>
  );
}

function Clock({ timerKey, timer, label }: { timerKey: TimerKey; timer: TimerState; label: string }) {
  const toggle = useChair((state) => state.timerToggle);
  const reset = useChair((state) => state.timerReset);
  const running = isRunning(timer);
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 rounded-card border border-hairline bg-surface px-5 py-4">
      <div>
        <p className="label-micro">{label}</p>
        <div className="mt-1.5">
          <TimerDisplay timer={timer} size="md" showProgress={false} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant={running ? 'secondary' : 'primary'} onClick={() => toggle(timerKey)}>
          {running ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button variant="quiet" onClick={() => reset(timerKey)}>
          <RotateCcw size={16} strokeWidth={1.5} />
          Reset
        </Button>
      </div>
    </div>
  );
}

/** The delegations present, in a grid: tap one to give them the floor. */
function SpeakerChips({
  onPick,
  spokeKey,
  first = [],
}: {
  onPick: (delegation: Delegation) => void;
  /** Progress key whose speakers get a tick. */
  spokeKey?: string;
  /** Countries to list first — an amendment's submitters, the Main Submitter. */
  first?: string[];
}) {
  const { roster } = useChairContext();
  const attendance = useChair((state) => state.attendance);
  const progress = useChair((state) => state.progress);
  const present = roster
    .filter((delegation) => (attendance[delegation.id] ?? 'absent') !== 'absent')
    .sort((a, b) => {
      const ra = first.some((name) => matchesCountry(a, name)) ? 0 : 1;
      const rb = first.some((name) => matchesCountry(b, name)) ? 0 : 1;
      return ra - rb || a.country.localeCompare(b.country);
    });
  if (present.length === 0) {
    return <p className="text-sm text-muted">Nobody is marked present. Take the Roll Call first.</p>;
  }
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-900">Tap the country that speaks:</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {present.map((delegation) => {
          const spoke = spokeKey ? (progress[`${spokeKey}@${delegation.id}`] ?? 0) > 0 : false;
          const highlighted = first.some((name) => matchesCountry(delegation, name));
          return (
            <button
              key={delegation.id}
              type="button"
              onClick={() => onPick(delegation)}
              className={cn(
                'flex min-h-[48px] items-center gap-2.5 rounded-control border px-3 py-2 text-left text-sm font-medium transition-colors duration-150',
                highlighted ? 'border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100' : 'border-hairline bg-surface text-ink-800 hover:border-teal-300 hover:bg-teal-50/50',
              )}
            >
              <Flag code={delegation.countryCode} country={delegation.country} size="sm" />
              <span className="min-w-0 flex-1 truncate">{delegation.country}</span>
              {spoke ? <Check size={14} strokeWidth={2.25} className="shrink-0 text-success" aria-label="has spoken" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * When the order of events already says who speaks — the Main Submitter, an
 * amendment's submitter — the chair should not have to look for them. Present:
 * one big button each. Not here: say so, and offer whoever is next in line.
 * Anyone else stays behind "Someone else", for the unusual case.
 */
function ExpectedSpeaker({
  expected,
  fallback = [],
  role,
  fallbackRole,
  label,
  onPick,
  spokeKey,
}: {
  expected: string[];
  fallback?: string[];
  role: string;
  fallbackRole?: string;
  label: (country: string) => string;
  onPick: (delegation: Delegation) => void;
  spokeKey?: string;
}) {
  const { roster } = useChairContext();
  const attendance = useChair((state) => state.attendance);
  const [anyone, setAnyone] = useState(false);
  const isPresent = (delegation: Delegation) => (attendance[delegation.id] ?? 'absent') !== 'absent';
  const find = (names: string[]) =>
    names
      .map((name) => roster.find((delegation) => matchesCountry(delegation, name)))
      .filter((delegation): delegation is Delegation => Boolean(delegation));

  const expectedHere = find(expected).filter(isPresent);
  const fallbackHere = find(fallback).filter(isPresent);
  const speakers = expectedHere.length ? expectedHere : fallbackHere;
  const missing = expected.filter((name) => !expectedHere.some((delegation) => matchesCountry(delegation, name)));
  const onList = find(missing);

  return (
    <div className="space-y-3">
      {missing.length && expectedHere.length === 0 ? (
        <p className="rounded-control border border-warning-border bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          {missing.join(', ')} ({role}) {onList.length ? 'is marked absent' : 'is not on this committee’s list'}
          {speakers.length && fallbackRole ? `, so ${fallbackRole} speaks instead.` : '. Choose who speaks below.'}
        </p>
      ) : null}
      {speakers.length ? (
        <div className="space-y-2.5">
          {speakers.map((delegation) => (
            <Big key={delegation.id} icon={Mic} onClick={() => onPick(delegation)}>
              {label(delegation.country)}
            </Big>
          ))}
        </div>
      ) : null}
      {speakers.length === 0 || anyone ? (
        <SpeakerChips spokeKey={spokeKey} onPick={onPick} />
      ) : (
        <button
          type="button"
          onClick={() => setAnyone(true)}
          className="text-sm font-medium text-muted underline-offset-2 hover:text-ink-900 hover:underline"
        >
          Someone else speaks instead
        </button>
      )}
    </div>
  );
}

const matchesCountry = (delegation: Delegation, name: string): boolean =>
  sameCountryAs(delegation.country, name) ||
  (Boolean(delegation.countryCode) && countryCode(name) === delegation.countryCode);

function NowPanel({ screen, state }: { screen: GuidedScreen; state: ChairState }) {
  const navigate = useNavigate();
  const { committee, roster } = useChairContext();
  const { res, report, current: paper } = useChairRes();
  const topic = res.topic;
  const [speechSec, setSpeechSec] = useState<number>(DEBATE.speechSec);
  const [poiSec, setPoiSec] = useState<number>(DEBATE.poiSec);
  const [readingSec, setReadingSec] = useState<number>(DEBATE.readingSec);
  const [presentSec, setPresentSec] = useState<number>(PRESENTATION.draftSec);
  const [unmodSec, setUnmodSec] = useState<number>(DEBATE.amendmentUnmodSec);
  const [closingSide, setClosingSide] = useState<SpeechPart>('for');

  const speak = (part: SpeechPart, delegation: Delegation, options: { amendment?: Amendment; closing?: boolean } = {}) =>
    state.speechStart({
      part,
      closing: options.closing ?? false,
      amendmentId: options.amendment?.id ?? null,
      amendmentNumber: options.amendment?.number ?? null,
      speakerId: delegation.id,
      durationSec: speechSec,
    });

  const speakingTime = (
    <DurationPresets label="Speaking time" valueSec={speechSec} onChange={setSpeechSec} presetsSec={DEBATE.speechPresetsSec} />
  );

  switch (screen.kind) {
    case 'vote':
      return (
        <div className="space-y-5">
          <Heading stage="Voting Procedure" title={`Vote on ${state.vote?.subjectLabel ?? 'the motion'}`}>
            <span className="font-medium text-ink-900">Note passing is suspended.</span> Count the placards, then press
            Record the result.
          </Heading>
          <VotePanel
            onClosed={(result) => {
              const votes = result.tally;
              if (result.vote.subjectKind === 'amendment') {
                report({ action: 'decide', amendmentId: result.vote.subjectId, status: result.passed ? 'passed' : 'failed', votes });
              } else if (result.vote.subjectId.startsWith('topic-')) {
                report({ action: 'resolution', topic, status: result.passed ? 'passed' : 'failed', votes });
              }
            }}
          />
        </div>
      );

    case 'speech': {
      const speech = state.speech;
      const speaker = state.names[speech.speakerId ?? ''] ?? 'A delegation';
      const about = speech.amendmentNumber ? `Amendment ${speech.amendmentNumber}` : 'the resolution';
      const stage =
        speech.part === 'submitter'
          ? speech.amendmentId
            ? `Submitter of ${about}`
            : 'Closing remarks'
          : `${speech.part === 'for' ? 'In favour of' : 'Against'} ${about}`;
      if (speech.phase === 'pois') {
        return (
          <div className="space-y-5">
            <Heading stage="Points of Information" title={speaker}>
              Delegates ask {speaker} questions.
            </Heading>
            <Clock timerKey="speech" timer={speech.timer} label="Points of Information" />
            <Big icon={Check} onClick={state.speechEnd}>
              Done — {speaker} yields the floor back to the Chair
            </Big>
          </div>
        );
      }
      return (
        <div className="space-y-5">
          <Heading stage={stage} title={speaker} />
          <Clock timerKey="speech" timer={speech.timer} label="Speaking time" />
          <DurationPresets label="Points of Information" valueSec={poiSec} onChange={setPoiSec} presetsSec={DEBATE.poiPresetsSec} />
          <div className="space-y-2.5">
            <Big icon={Hand} onClick={() => state.speechOpenPois(poiSec)}>
              Speech over — open Points of Information ({formatClock(poiSec * 1000)})
            </Big>
            <Small icon={SkipForward} onClick={state.speechEnd}>
              Speech over — no Points of Information
            </Small>
          </div>
        </div>
      );
    }

    case 'reading':
      return (
        <div className="space-y-5">
          <Heading stage="Reading Time" title="Delegates read the resolution">
            They can read it on their phones: Resolution, in the menu.
          </Heading>
          <Clock timerKey="reading" timer={state.reading.timer} label="Reading Time" />
          <div className="space-y-2.5">
            <Big icon={Check} onClick={state.readingEnd}>
              Reading Time is over
            </Big>
            <Small icon={Plus} onClick={() => state.timerAdjust('reading', 5 * 60 * 1000)}>
              Give 5 more minutes
            </Small>
          </div>
        </div>
      );

    case 'presentation': {
      const presentation = state.presentation;
      const presenter = state.names[presentation.presenterId ?? ''] ?? 'The Main Submitter';
      const briefing = presentation.kind === 'briefing';
      if (presentation.phase === 'questions') {
        return (
          <div className="space-y-5">
            <Heading stage={briefing ? 'Questions' : 'Points of Clarification and Information'} title={briefing ? 'The chairs take questions' : presenter} />
            <Clock timerKey="present" timer={presentation.timer} label="Questions" />
            <Big icon={Check} onClick={state.presentEnd}>
              {briefing ? 'Finish the briefing' : `Done — ${presenter} yields the floor back to the Chair`}
            </Big>
          </div>
        );
      }
      return (
        <div className="space-y-5">
          <Heading stage={briefing ? 'Crisis Briefing' : 'Presentation of the Resolution'} title={briefing ? 'The chairs present the topic' : presenter} />
          <Clock timerKey="present" timer={presentation.timer} label={briefing ? 'Briefing time' : 'Presentation time'} />
          <div className="space-y-2.5">
            <Big icon={Hand} onClick={() => state.presentOpenQuestions(PRESENTATION.qaSec)}>
              {briefing ? 'Open questions' : 'Presentation over — open POCs and POIs'} ({formatClock(PRESENTATION.qaSec * 1000)})
            </Big>
            <Small icon={SkipForward} onClick={state.presentEnd}>
              {briefing ? 'Finish the briefing' : 'No questions — yield the floor back to the Chair'}
            </Small>
          </div>
        </div>
      );
    }

    case 'unmod':
      return (
        <div className="space-y-5">
          <Heading stage="Unmoderated Caucus" title={state.unmoderated.purpose || 'Unmoderated Caucus'}>
            {res.drafting
              ? `Delegates write draft resolutions on the site and submit them. ${res.drafts.length} submitted so far.`
              : `Delegates write amendments on the site and submit them. ${res.pending.length} waiting so far.`}
          </Heading>
          <Clock timerKey="unmod" timer={state.unmoderated.timer} label="Time remaining" />
          <div className="space-y-2.5">
            <Big icon={Square} onClick={state.unmodEnd}>
              Close the Unmoderated Caucus
            </Big>
            <Small icon={Plus} onClick={() => state.unmodExtend(5 * 60)}>
              Extend by 5 minutes
            </Small>
          </div>
        </div>
      );

    case 'roll-call':
      return (
        <div className="space-y-5">
          <Heading stage="Roll Call" title="Take the Roll Call">
            Call each country. Mark them Present, Present and Voting, or Absent.
          </Heading>
          <div className="space-y-2.5">
            <Big icon={ClipboardCheck} onClick={() => navigate('/chair/roll-call')}>
              Open the Roll Call
            </Big>
            <Small
              icon={Users}
              onClick={() => {
                state.markAllPresent();
                state.takeRollCall();
              }}
            >
              Everyone is here — mark all present
            </Small>
          </div>
        </div>
      );

    case 'no-quorum':
      return (
        <div className="space-y-5">
          <Heading stage="Roll Call" title="Not enough delegations yet">
            {screen.present} of {screen.total} present; {quorumNeeded(screen.total)} are needed to start.
          </Heading>
          <Big icon={ClipboardCheck} onClick={() => navigate('/chair/roll-call')}>
            Back to the Roll Call
          </Big>
        </div>
      );

    case 'motions':
      return (
        <div className="space-y-5">
          <Heading stage="Motions" title={`${screen.count} ${screen.count === 1 ? 'motion' : 'motions'} on the floor`} />
          <Big icon={Gavel} onClick={() => navigate('/chair/motions')}>
            Vote on the motions
          </Big>
        </div>
      );

    case 'step':
      break;
  }

  const unmodPurpose = res.drafting ? emergencySession.unmoderatedPurpose : flowFor(committee.id).unmoderatedPurpose;
  const openUnmod = (key: string) => {
    state.unmodStart({ purpose: unmodPurpose, proposedBy: '', durationSec: unmodSec });
    state.markStep(key);
  };

  switch (screen.step) {
    case 'crisis-briefing':
      return (
        <div className="space-y-5">
          <Heading stage="Crisis Briefing" title="Brief the committee on the crisis" />
          <Big
            icon={Mic}
            onClick={() =>
              state.presentStart({ kind: 'briefing', resolutionId: null, presenterId: null, durationSec: PRESENTATION.briefingSec })
            }
          >
            Start the crisis briefing ({formatClock(PRESENTATION.briefingSec * 1000)})
          </Big>
        </div>
      );

    case 'unmod-writing':
      return (
        <div className="space-y-5">
          <Heading stage="Unmoderated Caucus" title="Delegates write the resolution">
            Delegates open <strong>Resolution</strong> on their phones, write a draft with their bloc, and submit it.
          </Heading>
          <DurationPresets label="How long" valueSec={unmodSec} onChange={setUnmodSec} presetsSec={[20 * 60, 30 * 60, 45 * 60]} />
          <Big icon={Coffee} onClick={() => openUnmod(writingUnmodKey(topic))}>
            Open the Unmoderated Caucus ({formatClock(unmodSec * 1000)})
          </Big>
        </div>
      );

    case 'choose-draft':
      return <ChooseDraft unmodSec={unmodSec} onUnmod={() => openUnmod(writingUnmodKey(topic))} />;

    case 'reading':
      return (
        <div className="space-y-5">
          <Heading stage={`Topic ${topic}`} title="Reading Time">
            Delegates read the resolution before it is presented.
          </Heading>
          <DurationPresets label="How long" valueSec={readingSec} onChange={setReadingSec} presetsSec={DEBATE.readingPresetsSec} />
          <Big icon={FileText} onClick={() => state.readingStart(readingSec)}>
            Start Reading Time ({formatClock(readingSec * 1000)})
          </Big>
        </div>
      );

    case 'present-draft': {
      const main = res.mainSubmitters[0] ?? null;
      const replaced = paper?.replacedMainSubmitters;
      return (
        <div className="space-y-5">
          <Heading stage="Presentation of the Resolution" title={main ? `${main} presents the resolution` : 'The Main Submitter presents'}>
            {replaced?.length
              ? `${main} is the Main Submitter in place of ${replaced.join(', ')}, who is not in this committee. `
              : ''}
            Then Points of Clarification and Information, then they yield the floor back to you.
          </Heading>
          <DurationPresets label="Presentation time" valueSec={presentSec} onChange={setPresentSec} presetsSec={PRESENTATION.draftPresetsSec} />
          <ExpectedSpeaker
            expected={res.mainSubmitters}
            fallback={res.coSubmitters}
            role="the Main Submitter"
            fallbackRole="a co-submitter"
            label={(country) => `Start ${country}’s presentation (${formatClock(presentSec * 1000)})`}
            onPick={(delegation) =>
              state.presentStart({ kind: 'draft', resolutionId: null, presenterId: delegation.id, durationSec: presentSec })
            }
          />
        </div>
      );
    }

    case 'speeches-for':
    case 'speeches-against': {
      const part: SpeechPart = screen.step === 'speeches-for' ? 'for' : 'against';
      const key = stepKey.speeches(topic, part, false);
      const held = count(state, key);
      return (
        <div className="space-y-5">
          <Heading stage={part === 'for' ? 'Speeches in Favour' : 'Speeches Against'} title={`${part === 'for' ? 'Speeches for' : 'Speeches against'} the resolution`}>
            {held === 0 ? 'Ask who wishes to speak.' : `${held} so far. Usually ${DEBATE.speechesEachSide} or so.`}
          </Heading>
          {speakingTime}
          <SpeakerChips spokeKey={key} onPick={(delegation) => speak(part, delegation)} />
          <Big icon={ArrowRight} onClick={() => state.markStep(stepKey.movedOn(key))}>
            {part === 'for' ? 'Move on to speeches against' : 'Move on to the Unmoderated Caucus'}
          </Big>
        </div>
      );
    }

    case 'unmod':
      return (
        <div className="space-y-5">
          <Heading stage="Unmoderated Caucus" title="Time to write amendments">
            Delegates open <strong>Resolution → My copy</strong> on their phones, change the clauses, and press Submit.
          </Heading>
          <DurationPresets label="How long" valueSec={unmodSec} onChange={setUnmodSec} presetsSec={[10 * 60, 15 * 60, 20 * 60]} />
          <Big icon={Coffee} onClick={() => openUnmod(amendmentUnmodKey(topic))}>
            Open the Unmoderated Caucus ({formatClock(unmodSec * 1000)})
          </Big>
        </div>
      );

    case 'debate-amendments':
      return screen.amendment ? (
        <AmendmentDebate amendment={screen.amendment} part={screen.part ?? 'submitter'} speakingTime={speakingTime} speak={speak} />
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" />
          Loading the amendments…
        </div>
      );

    case 'more-amendments':
      return (
        <div className="space-y-5">
          <Heading stage="Amendments" title="All amendments have been debated">
            Need more? Open another Unmoderated Caucus. Otherwise, go to the closing speeches.
          </Heading>
          <div className="space-y-2.5">
            <Big icon={ArrowRight} onClick={() => state.markStep(closingStartedKey(topic))}>
              Go to the closing speeches
            </Big>
            <Small icon={Coffee} onClick={() => openUnmod(amendmentUnmodKey(topic))}>
              Another Unmoderated Caucus for more amendments ({formatClock(unmodSec * 1000)})
            </Small>
          </div>
        </div>
      );

    case 'closing-speeches': {
      const key = stepKey.speeches(topic, closingSide, true);
      return (
        <div className="space-y-5">
          <Heading stage="Closing Speeches" title="Speeches on the resolution as amended">
            Anyone may speak for or against. The chairs recommend the Main Submitter makes closing remarks.
          </Heading>
          <Segmented
            name="Speech"
            value={closingSide}
            onChange={setClosingSide}
            options={[
              { value: 'for', label: 'In favour' },
              { value: 'against', label: 'Against' },
              { value: 'submitter', label: 'Closing remarks' },
            ]}
          />
          {speakingTime}
          {closingSide === 'submitter' ? (
            <ExpectedSpeaker
              expected={res.mainSubmitters}
              fallback={res.coSubmitters}
              role="the Main Submitter"
              fallbackRole="a co-submitter"
              label={(country) => `${country} makes closing remarks`}
              spokeKey={key}
              onPick={(delegation) => speak('submitter', delegation, { closing: true })}
            />
          ) : (
            <SpeakerChips spokeKey={key} onPick={(delegation) => speak(closingSide, delegation, { closing: true })} />
          )}
          <Big icon={VoteIcon} onClick={() => state.markStep(closingDoneKey(topic))}>
            Move on to the vote
          </Big>
        </div>
      );
    }

    case 'voting': {
      const eligible = roster.filter((d) => (state.attendance[d.id] ?? 'absent') !== 'absent').map((d) => d.id);
      return (
        <div className="space-y-5">
          <Heading stage="Voting Procedure" title="Vote on the resolution">
            <span className="font-medium text-ink-900">Note passing is suspended</span> until the vote is over.
          </Heading>
          <Big
            icon={VoteIcon}
            onClick={() =>
              state.startVote({
                subjectKind: 'resolution',
                subjectId: `topic-${topic}`,
                subjectLabel: res.topics.length > 1 ? `the resolution (Topic ${topic})` : 'the resolution',
                mode: 'placard',
                eligible,
              })
            }
          >
            Start the vote on the resolution
          </Big>
        </div>
      );
    }

    case 'result': {
      const next = res.topics.find((t) => t > topic);
      return (
        <div className="space-y-5">
          <Heading
            stage="Result"
            title={res.status === 'open' ? 'Waiting for the result' : `The resolution ${res.status}`}
          >
            {res.votes ? `${res.votes.for} for, ${res.votes.against} against, ${res.votes.abstain} abstaining.` : null}
          </Heading>
          {next ? (
            <Big icon={ArrowRight} onClick={() => state.setTopic(next)}>
              Move on to Topic {next}
            </Big>
          ) : (
            <p className="rounded-card border border-hairline bg-canvas px-4 py-3 text-sm text-muted">
              That was the last resolution. Well done!
            </p>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

function AmendmentDebate({
  amendment,
  part,
  speakingTime,
  speak,
}: {
  amendment: Amendment;
  part: 'submitter' | 'for' | 'against' | 'vote';
  speakingTime: ReactNode;
  speak: (part: SpeechPart, delegation: Delegation, options: { amendment?: Amendment }) => void;
}) {
  const state = useChair((snapshot) => snapshot);
  const { roster } = useChairContext();
  const { res, report, current } = useChairRes();
  const after = res.pending.length - 1;
  const clauseNow =
    amendment.kind === 'add' ? undefined : (current?.clauses.find((clause) => clause.id === amendment.clauseId)?.text ?? null);
  const key = (p: SpeechPart) => stepKey.amendment(amendment.id, p);

  const titles = {
    submitter: 'Its submitter explains why it is needed',
    for: 'Speeches for the amendment',
    against: 'Speeches against the amendment',
    vote: 'Vote on the amendment',
  } as const;

  return (
    <div className="space-y-5">
      <Heading stage={`Amendment ${amendment.number}${after > 0 ? ` · ${after} more after this` : ''}`} title={titles[part]}>
        {part === 'vote' ? <span className="font-medium text-ink-900">Note passing is suspended during the vote.</span> : null}
      </Heading>
      <AmendmentCard amendment={amendment} current={clauseNow} debating />

      {part === 'vote' ? (
        <Big
          icon={VoteIcon}
          onClick={() =>
            state.startVote({
              subjectKind: 'amendment',
              subjectId: amendment.id,
              subjectLabel: `Amendment ${amendment.number}`,
              mode: 'placard',
              eligible: roster.filter((d) => (state.attendance[d.id] ?? 'absent') !== 'absent').map((d) => d.id),
            })
          }
        >
          Start the vote on Amendment {amendment.number}
        </Big>
      ) : (
        <>
          {speakingTime}
          {part === 'submitter' ? (
            <ExpectedSpeaker
              expected={amendment.submitters}
              role={amendment.submitters.length > 1 ? 'its submitters' : 'its submitter'}
              label={(country) => `${country} explains Amendment ${amendment.number}`}
              spokeKey={key(part)}
              onPick={(delegation) => speak(part, delegation, { amendment })}
            />
          ) : (
            <SpeakerChips spokeKey={key(part)} onPick={(delegation) => speak(part, delegation, { amendment })} />
          )}
          <Big icon={ArrowRight} onClick={() => state.markStep(stepKey.movedOn(key(part)))}>
            {part === 'submitter'
              ? count(state, key('submitter')) > 0
                ? 'Move on to speeches for'
                : 'No submitter’s speech — move on'
              : part === 'for'
                ? 'Move on to speeches against'
                : 'Move on to the vote'}
          </Big>
        </>
      )}

      <button
        type="button"
        className="text-sm font-medium text-muted underline-offset-2 hover:text-danger hover:underline"
        onClick={() => {
          if (window.confirm(`Withdraw Amendment ${amendment.number}? It will not be debated.`)) {
            report({ action: 'decide', amendmentId: amendment.id, status: 'withdrawn', votes: null });
          }
        }}
      >
        Withdraw this amendment
      </button>
    </div>
  );
}

/** The Emergency Session: pick the draft the committee debates. */
function ChooseDraft({ unmodSec, onUnmod }: { unmodSec: number; onUnmod: () => void }) {
  const { res, report } = useChairRes();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <Heading stage="Draft Resolutions" title={res.drafts.length ? 'Choose the draft to debate' : 'No drafts submitted yet'}>
        {res.drafts.length
          ? 'Read them, then choose one. The committee debates and amends it like any other resolution.'
          : 'Delegates submit drafts from their phones: Resolution → Our draft → Submit.'}
      </Heading>
      <div className="space-y-3">
        {res.drafts.map((draft) => (
          <div key={draft.id} className="rounded-card border border-hairline bg-surface px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-serif text-[17px] text-ink-900">Draft Resolution {draft.number}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setOpen(open === draft.id ? null : draft.id)}>
                  {open === draft.id ? 'Hide' : 'Read it'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (window.confirm(`Debate Draft Resolution ${draft.number}?`)) report({ action: 'adopt', draftId: draft.id });
                  }}
                >
                  Choose this one
                </Button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">{draft.submitters.join(', ')}</p>
            {open === draft.id ? (
              <div className="mt-4 border-t border-hairline pt-4">
                <ResolutionClauses clauses={draft.text.clauses} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <Small icon={Coffee} onClick={onUnmod}>
        Another Unmoderated Caucus to keep writing ({formatClock(unmodSec * 1000)})
      </Small>
    </div>
  );
}
