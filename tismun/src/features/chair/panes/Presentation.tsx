import { CheckCircle2, MessageCircleQuestion, Mic, SkipForward, Siren } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Field';
import { flowFor } from '@/config/flows';
import { PRESENTATION } from '@/config/rules';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/time';
import { DelegationPicker } from '../components/DelegationPicker';
import { DurationInput } from '../components/DurationInput';
import { DurationPresets } from '../components/DurationPresets';
import { Pane } from '../components/Pane';
import { TimerPanel } from '../components/TimerPanel';
import { useChair, useChairContext, useDelegationLookup } from '../context';
import type { PresentationState } from '../types';

/**
 * Presentations to the committee, each followed by an optional question-and-
 * answer period on a clock of its own:
 *
 * - the Presentation of the Draft Resolution, by its Main Submitter; and
 * - in the Emergency Session, the Crisis Briefing, where the chairs present
 *   the topic before debate opens.
 */
export function Presentation() {
  const { roster, committee } = useChairContext();
  const { nameOf } = useDelegationLookup();

  const presentation = useChair((state) => state.presentation);
  const resolutions = useChair((state) => state.resolutions);
  const attendance = useChair((state) => state.attendance);
  const held = useChair((state) => state.presentationsHeld);
  const briefingsHeld = useChair((state) => state.briefingsHeld);
  const start = useChair((state) => state.presentStart);
  const openQuestions = useChair((state) => state.presentOpenQuestions);
  const finish = useChair((state) => state.presentEnd);

  // Only a committee whose flow has a crisis briefing offers one — and until
  // it has been given, that is what this screen sets up first.
  const hasBriefing = flowFor(committee.id).steps.some((step) => step.id === 'crisis-briefing');
  const [kind, setKind] = useState<PresentationState['kind']>(() =>
    hasBriefing && briefingsHeld === 0 ? 'briefing' : 'draft',
  );
  const [resolutionId, setResolutionId] = useState<string>(() => resolutions[0]?.id ?? '');
  const [presenterId, setPresenterId] = useState<string | null>(
    () => resolutions[0]?.mainSubmitters[0] ?? null,
  );
  const [durationSec, setDurationSec] = useState<number>(PRESENTATION.draftSec);
  const [briefingSec, setBriefingSec] = useState<number>(PRESENTATION.briefingSec);
  const [questionsSec, setQuestionsSec] = useState<number>(PRESENTATION.qaSec);

  const presentRoster = roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent');
  const current = resolutions.find((entry) => entry.id === presentation.resolutionId) ?? null;

  if (presentation.active) {
    const questions = presentation.phase === 'questions';
    const isBriefing = presentation.kind === 'briefing';
    return (
      <Pane
        title={
          questions
            ? 'Question-and-Answer Period'
            : isBriefing
              ? 'Crisis Briefing'
              : 'Presentation of the Draft Resolution'
        }
        description={
          isBriefing
            ? 'The chairs present the Emergency Session topic to the committee.'
            : current
              ? `${current.number} — ${current.title}`
              : 'The Main Submitter presents the draft resolution.'
        }
      >
        <Card className="max-w-2xl">
          <CardBody className="space-y-6 py-7">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Mic size={15} strokeWidth={1.5} className="text-teal-600" />
              {isBriefing
                ? 'The chairs have the floor'
                : `${nameOf(presentation.presenterId)} has the floor`}
            </div>
            <TimerPanel
              timerKey="present"
              timer={presentation.timer}
              label={questions ? 'Questions' : isBriefing ? 'Briefing time' : 'Presentation time'}
              size="lg"
            />
          </CardBody>
        </Card>

        <Card className="max-w-2xl">
          <CardBody className="space-y-4 py-5">
            {questions ? (
              <Button variant="primary" className="h-12 w-full" onClick={finish}>
                <CheckCircle2 size={17} strokeWidth={1.5} />
                End the question-and-answer period
              </Button>
            ) : (
              <>
                <DurationInput
                  label="Question-and-answer period"
                  valueSec={questionsSec}
                  onChange={setQuestionsSec}
                />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Button
                    variant="primary"
                    className="h-12"
                    disabled={questionsSec === 0}
                    onClick={() => openQuestions(questionsSec)}
                  >
                    <MessageCircleQuestion size={17} strokeWidth={1.5} />
                    Open questions ({formatClock(questionsSec * 1000)})
                  </Button>
                  <Button variant="secondary" className="h-12" onClick={finish}>
                    <SkipForward size={17} strokeWidth={1.5} />
                    {isBriefing ? 'Finish the briefing' : 'Skip questions and finish'}
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </Pane>
    );
  }

  return (
    <Pane
      title={kind === 'briefing' ? 'Crisis Briefing' : 'Presentation of the Draft Resolution'}
      description={
        kind === 'briefing'
          ? 'The chairs present the Emergency Session topic to the committee, followed by optional questions.'
          : 'The Main Submitter presents the draft resolution to the committee, followed by an optional question-and-answer period.'
      }
      actions={
        held > 0 || briefingsHeld > 0 ? (
          <Badge tone="success">
            {[briefingsHeld > 0 ? 'Briefing given' : '', held > 0 ? `${held} presented` : '']
              .filter(Boolean)
              .join(' · ')}
          </Badge>
        ) : null
      }
    >
      {hasBriefing ? (
        <div className="flex max-w-2xl gap-2" role="group" aria-label="What is being presented">
          {(
            [
              ['briefing', 'Crisis Briefing', Siren],
              ['draft', 'Draft Resolution', Mic],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-control border px-3.5 text-sm font-medium transition-colors duration-150',
                kind === value
                  ? 'border-teal-500 bg-teal-50 text-teal-800'
                  : 'border-hairline bg-surface text-ink-700 hover:border-ink-300',
              )}
            >
              <Icon size={15} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {kind === 'briefing' ? (
        <Card className="max-w-2xl">
          <CardHeader label="Set up" />
          <CardBody className="space-y-5 py-5">
            <DurationPresets
              label="Briefing time"
              valueSec={briefingSec}
              onChange={setBriefingSec}
              presetsSec={PRESENTATION.briefingPresetsSec}
            />
            <Button
              variant="primary"
              className="h-12"
              disabled={briefingSec === 0}
              onClick={() =>
                start({
                  kind: 'briefing',
                  resolutionId: null,
                  presenterId: null,
                  durationSec: briefingSec,
                })
              }
            >
              <Siren size={17} strokeWidth={1.5} />
              Start the crisis briefing
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader label="Set up" />
          <CardBody className="space-y-5 py-5">
            {resolutions.length > 0 ? (
              <Field label="Draft resolution" htmlFor="presentation-resolution">
                <Select
                  id="presentation-resolution"
                  value={resolutionId}
                  onChange={(event) => {
                    const next = resolutions.find((entry) => entry.id === event.target.value);
                    setResolutionId(event.target.value);
                    // The Main Submitter presents, unless the chair says otherwise.
                    if (next?.mainSubmitters[0]) setPresenterId(next.mainSubmitters[0]);
                  }}
                >
                  {resolutions.map((resolution) => (
                    <option key={resolution.id} value={resolution.id}>
                      {resolution.number} — {resolution.title}
                    </option>
                  ))}
                  <option value="">Not on file yet</option>
                </Select>
              </Field>
            ) : (
              <p className="rounded-control border border-hairline bg-canvas px-3 py-2.5 text-sm text-muted">
                No draft resolution is on file yet. You can present without one, or{' '}
                <Link
                  to="/chair/resolutions"
                  state={{ create: true }}
                  className="font-medium text-teal-700 hover:underline"
                >
                  register it in Resolutions
                </Link>{' '}
                first.
              </p>
            )}

            <div>
              <span className="label-micro mb-1.5 block">Presented by</span>
              <DelegationPicker
                delegations={presentRoster}
                value={presenterId}
                onChange={setPresenterId}
                placeholder="The Main Submitter"
                emptyLabel="Take roll call first"
              />
            </div>

            <DurationPresets
              label="Presentation time"
              valueSec={durationSec}
              onChange={setDurationSec}
              presetsSec={PRESENTATION.draftPresetsSec}
            />

            <Button
              variant="primary"
              className="h-12"
              disabled={!presenterId || durationSec === 0}
              onClick={() =>
                start({
                  kind: 'draft',
                  resolutionId: resolutionId || null,
                  presenterId,
                  durationSec,
                })
              }
            >
              <Mic size={17} strokeWidth={1.5} />
              Start the presentation
            </Button>
          </CardBody>
        </Card>
      )}
    </Pane>
  );
}
