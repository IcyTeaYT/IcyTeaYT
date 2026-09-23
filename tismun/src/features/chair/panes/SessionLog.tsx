import { Download, ScrollText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CONFERENCE } from '@/config/conference';
import { cn } from '@/lib/cn';
import { downloadFile, timestampedName, toCsv } from '@/lib/export';
import { formatDateTime, formatTimeOfDay } from '@/lib/time';
import { Pane } from '../components/Pane';
import { useChair, useChairContext } from '../context';
import { LOG_LABEL, type LogType } from '../types';

const TYPE_TONE: Record<LogType, 'neutral' | 'teal' | 'warning' | 'success'> = {
  session: 'neutral',
  'roll-call': 'teal',
  speaker: 'neutral',
  caucus: 'teal',
  motion: 'warning',
  resolution: 'neutral',
  vote: 'success',
  presentation: 'neutral',
  award: 'success',
};

const FILTERS: (LogType | 'all')[] = [
  'all',
  'roll-call',
  'speaker',
  'caucus',
  'motion',
  'presentation',
  'resolution',
  'vote',
  'award',
  'session',
];

export function SessionLog() {
  const { committee } = useChairContext();
  const log = useChair((state) => state.log);
  const [filter, setFilter] = useState<LogType | 'all'>('all');

  const entries = useMemo(
    () => (filter === 'all' ? log : log.filter((entry) => entry.type === filter)),
    [log, filter],
  );

  const exportTxt = () => {
    const lines = [
      `${CONFERENCE.edition} — ${committee.name} (${committee.abbreviation})`,
      `Session log exported ${formatDateTime(Date.now())}`,
      '='.repeat(72),
      '',
      // Oldest first reads like a transcript of the session.
      ...[...log]
        .reverse()
        .map((entry) =>
          [
            `[${formatTimeOfDay(entry.at)}] ${LOG_LABEL[entry.type].toUpperCase()}`,
            `  ${entry.summary}`,
            entry.detail ? `  ${entry.detail}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        ),
    ];
    downloadFile(
      timestampedName([CONFERENCE.name, committee.abbreviation, 'session-log'], 'txt'),
      lines.join('\n') + '\n',
      'text/plain',
    );
  };

  const exportCsv = () => {
    const rows = [
      ['Time', 'Type', 'Summary', 'Detail'],
      ...[...log]
        .reverse()
        .map((entry) => [
          formatDateTime(entry.at),
          LOG_LABEL[entry.type],
          entry.summary,
          entry.detail ?? '',
        ]),
    ];
    downloadFile(
      timestampedName([CONFERENCE.name, committee.abbreviation, 'session-log'], 'csv'),
      toCsv(rows),
      'text/csv',
    );
  };

  return (
    <Pane
      title="Session Log"
      description="Everything the committee has done, timestamped as it happened."
      actions={
        <>
          <Button variant="secondary" onClick={exportTxt} disabled={log.length === 0}>
            <Download size={15} strokeWidth={1.5} />
            Export .txt
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={log.length === 0}>
            <Download size={15} strokeWidth={1.5} />
            Export .csv
          </Button>
        </>
      }
    >
      <Card>
        {/* On a phone the filters drop below the title and scroll sideways. */}
        <CardHeader
          className="flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:gap-4"
          label="Timeline"
          title={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
          action={
            <div className="no-scrollbar flex min-w-0 max-w-full gap-1.5 overflow-x-auto">
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200',
                    filter === option
                      ? 'bg-ink-800 text-white'
                      : 'bg-ink-50 text-muted hover:bg-ink-100 hover:text-ink-700',
                  )}
                >
                  {option === 'all' ? 'All' : LOG_LABEL[option]}
                </button>
              ))}
            </div>
          }
        />

        {entries.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={log.length === 0 ? 'Nothing logged yet' : 'No entries of this kind'}
            body={
              log.length === 0
                ? 'Roll calls, speakers, caucuses, motions, resolutions and votes are recorded here automatically.'
                : 'Try a different filter.'
            }
          />
        ) : (
          <ol className="divide-y divide-hairline">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-4 px-5 py-3.5">
                <time
                  dateTime={new Date(entry.at).toISOString()}
                  className="tabular w-16 shrink-0 pt-0.5 text-xs text-muted"
                >
                  {formatTimeOfDay(entry.at)}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TYPE_TONE[entry.type]}>{LOG_LABEL[entry.type]}</Badge>
                    <p className="text-sm text-ink-900">{entry.summary}</p>
                  </div>
                  {entry.detail ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{entry.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </Pane>
  );
}
