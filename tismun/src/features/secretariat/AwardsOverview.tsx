import { Award as AwardIcon, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CONFERENCE } from '@/config/conference';
import { AWARDS } from '@/config/awards';
import type { Committee } from '@/data/source/types';
import type { Award } from '@/features/chair/types';
import type { LiveSummary } from '@/features/live/types';
import { downloadFile, timestampedName, toCsv } from '@/lib/export';
import { formatDateTime } from '@/lib/time';

/**
 * Every committee's awards in one table, for the Secretariat to check before
 * the closing ceremony and to hand to whoever prints the certificates.
 */
export function AwardsOverview({
  rows,
}: {
  rows: { committee: Committee; summary: LiveSummary | null }[];
}) {
  const total = rows.length * AWARDS.length;
  const given = rows.reduce((count, row) => count + (row.summary?.awards?.length ?? 0), 0);

  const exportCsv = () => {
    const lines: string[][] = [['Committee', 'Award', 'Country', 'Delegate', 'Given at']];
    for (const { committee, summary } of rows) {
      for (const definition of AWARDS) {
        const award = summary?.awards?.find((entry) => entry.type === definition.type);
        lines.push([
          committee.name,
          definition.label,
          award?.country ?? '',
          award?.delegateName ?? '',
          award ? formatDateTime(award.awardedAt) : 'Not given yet',
        ]);
      }
    }
    downloadFile(timestampedName([CONFERENCE.name, 'awards'], 'csv'), toCsv(lines), 'text/csv');
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-serif text-xl text-ink-900">Awards</h2>
          <Badge tone={given === total && total > 0 ? 'success' : 'neutral'}>
            {given} of {total} given
          </Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download size={15} strokeWidth={1.5} />
          Download CSV
        </Button>
      </div>

      <Card className="mt-4">
        {/* Column labels only where the columns exist; on a phone each award
            carries its own label instead. */}
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] gap-4 border-b border-hairline px-5 py-3 md:grid">
          <p className="label-micro">Committee</p>
          {AWARDS.map((definition) => (
            <p key={definition.type} className="label-micro">
              {definition.label}
            </p>
          ))}
        </div>

        <ul className="divide-y divide-hairline">
          {rows.map(({ committee, summary }) => (
            <li
              key={committee.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <Link
                  to={`/secretariat/${committee.id}`}
                  className="text-sm font-semibold text-teal-700 hover:underline"
                >
                  {committee.abbreviation}
                </Link>
                <p className="truncate text-xs text-muted">{committee.room}</p>
              </div>
              {AWARDS.map((definition) => (
                <AwardCell
                  key={definition.type}
                  label={definition.label}
                  award={summary?.awards?.find((entry) => entry.type === definition.type) ?? null}
                />
              ))}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function AwardCell({ label, award }: { label: string; award: Award | null }) {
  return (
    <div className="min-w-0">
      <p className="label-micro mb-1.5 md:hidden">{label}</p>
      {award ? (
        <div className="flex items-center gap-2.5">
          <Flag code={award.countryCode} country={award.country} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{award.country}</p>
            {award.delegateName ? (
              <p className="truncate text-xs text-muted">{award.delegateName}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <AwardIcon size={15} strokeWidth={1.5} />
          Not given yet
        </p>
      )}
    </div>
  );
}
