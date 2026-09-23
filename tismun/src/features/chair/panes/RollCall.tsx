import { CheckCheck, ClipboardCheck } from 'lucide-react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { QUORUM } from '@/config/rules';
import { hasQuorum, quorumNeeded, simpleMajority, twoThirdsMajority } from '@/lib/majority';
import { formatTimeOfDay } from '@/lib/time';
import { Pane, Stat } from '../components/Pane';
import { useChair, useChairContext } from '../context';
import { ATTENDANCE_OPTIONS, type Attendance } from '../types';

const ACTIVE_CLASS: Record<Attendance, string> = {
  present: 'text-teal-700',
  'present-voting': 'text-teal-800',
  absent: 'text-danger',
};

export function RollCall() {
  const { roster } = useChairContext();
  const attendance = useChair((state) => state.attendance);
  const rollCallTakenAt = useChair((state) => state.rollCallTakenAt);
  const setAttendance = useChair((state) => state.setAttendance);
  const markAllPresent = useChair((state) => state.markAllPresent);
  const takeRollCall = useChair((state) => state.takeRollCall);

  const total = roster.length;
  const present = roster.filter((d) => (attendance[d.id] ?? 'absent') !== 'absent').length;
  const voting = roster.filter((d) => attendance[d.id] === 'present-voting').length;
  const quorum = hasQuorum(present, total);

  return (
    <Pane
      title="Roll Call"
      description="Mark each delegation as the committee is called. Delegations answering “Present and Voting” cannot abstain on substantive votes."
      actions={
        <>
          <Button variant="secondary" onClick={markAllPresent}>
            <CheckCheck size={15} strokeWidth={1.5} />
            Mark all present
          </Button>
          <Button variant="primary" onClick={takeRollCall} disabled={total === 0}>
            <ClipboardCheck size={15} strokeWidth={1.5} />
            Take roll call
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader
            label="Delegations"
            title={`${total} on the roster`}
            action={
              rollCallTakenAt ? (
                <Badge tone="neutral">Last taken {formatTimeOfDay(rollCallTakenAt)}</Badge>
              ) : null
            }
          />
          <ul className="divide-y divide-hairline">
            {roster.map((delegation) => {
              const status = attendance[delegation.id] ?? 'absent';
              return (
                <li
                  key={delegation.id}
                  className="flex flex-col gap-3 px-5 py-3 transition-colors duration-150 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Flag code={delegation.countryCode} country={delegation.country} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{delegation.country}</p>
                      <p className="truncate text-xs text-muted">{delegation.delegateName}</p>
                    </div>
                  </div>

                  <Segmented
                    name={`Attendance for ${delegation.country}`}
                    value={status}
                    onChange={(next) => setAttendance(delegation.id, next)}
                    size="sm"
                    options={ATTENDANCE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                      activeClassName: ACTIVE_CLASS[option.value],
                    }))}
                  />
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader label="Summary" title="Committee count" />
            <CardBody className="py-2">
              <dl className="divide-y divide-hairline">
                <Stat label="Present" value={present} hint={`of ${total}`} />
                <Stat label="Present and voting" value={voting} />
                <Stat label="Absent" value={total - present} />
                <Stat label="Simple majority" value={simpleMajority(present)} hint="votes" />
                <Stat label="Two-thirds majority" value={twoThirdsMajority(present)} hint="votes" />
                <Stat
                  label="Quorum"
                  value={quorum ? 'Reached' : 'Not reached'}
                  hint={`needs ${quorumNeeded(total)}`}
                  tone={quorum ? 'success' : 'danger'}
                />
              </dl>
            </CardBody>
          </Card>

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
            Quorum is {QUORUM.label} of the committee. Majorities are calculated on delegations
            present, and update as you take the roll.
          </p>
        </div>
      </div>
    </Pane>
  );
}
