import { Loader2, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LiveTimer } from '@/features/secretariat/LiveTimer';
import type { CommitteeControl } from '@/features/live/useControl';
import { cn } from '@/lib/cn';

function ago(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

/**
 * What a chair sees while another chair's device runs the committee: who is
 * running it, what the committee is doing, and the way to take it over.
 */
export function WatchPanel({
  control,
  abbreviation,
}: {
  control: CommitteeControl;
  abbreviation: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const { holder, summary, serverNow, reason, takingOver } = control;
  const who = holder?.name ?? 'Another chair';

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardBody className="flex flex-col gap-5 px-6 py-7">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-teal-50 text-teal-600">
            <MonitorSmartphone size={22} strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="font-serif text-xl text-ink-900">
              {reason === 'taken'
                ? 'Another device took over this committee'
                : 'This committee is being run on another device'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {who} is running {abbreviation}
              {holder ? ` — active ${ago(serverNow - holder.heartbeatAt)}` : ''}. You can watch
              here, or take over to run the committee from this device. Everything carries across
              exactly as it is, and the other device switches to watching.
            </p>
          </div>
          <div>
            <Button variant="primary" onClick={() => setConfirming(true)} disabled={takingOver}>
              {takingOver ? <Loader2 size={15} strokeWidth={1.5} className="animate-spin" /> : null}
              Take over
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <p className="label-micro shrink-0">Right now</p>
          {summary ? <Badge tone="teal">{summary.status}</Badge> : null}
        </div>
        <CardBody className="py-5">
          {!summary ? (
            <p className="text-sm text-muted">Waiting for the first report from {who}’s device…</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-micro">
                    {summary.currentSpeaker ? 'Now speaking' : 'No delegation has the floor'}
                  </p>
                  {summary.currentSpeaker ? (
                    <p className="mt-2 flex items-center gap-2">
                      <Flag
                        code={summary.currentSpeaker.countryCode}
                        country={summary.currentSpeaker.country}
                        size="md"
                      />
                      <span className="truncate font-serif text-lg text-ink-900">
                        {summary.currentSpeaker.country}
                      </span>
                    </p>
                  ) : null}
                </div>
                {summary.primaryTimer ? (
                  <div className="text-right">
                    <p className="label-micro">{summary.primaryTimer.label}</p>
                    <LiveTimer timer={summary.primaryTimer.timer} className="mt-1.5" />
                  </div>
                ) : null}
              </div>
              {summary.detail ? (
                <p className="text-sm leading-relaxed text-ink-700">{summary.detail}</p>
              ) : null}
              <p className="text-sm text-muted">
                <span
                  className={cn('font-semibold', summary.quorum ? 'text-ink-900' : 'text-danger')}
                >
                  {summary.present} of {summary.total}
                </span>{' '}
                present · {summary.quorum ? 'Quorum' : 'No quorum'} · {summary.motionsOnFloor}{' '}
                motions on the floor · {summary.resolutionCount} draft resolutions
              </p>
              <p className="text-xs text-muted">Updates every 10 seconds.</p>
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void control.takeOver()}
        title={`Take over ${abbreviation}?`}
        body={`${who}’s device will switch to watching. The session carries across exactly as it is: timers, speakers, motions, resolutions, votes and awards.`}
        confirmLabel="Take over"
      />
    </div>
  );
}
