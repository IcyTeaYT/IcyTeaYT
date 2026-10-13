import { Fragment, type ReactNode } from 'react';
import { Flag } from '@/components/Flag';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import {
  clauseLines,
  countryCode,
  diffWords,
  operativeNumber,
  type Amendment,
  type Clause,
  type ClauseKind,
  type ResolutionText,
} from '@/lib/resolution';

/**
 * A resolution set the way delegates know it from paper: preambulatory clauses
 * with their opening phrase in italics, operative clauses numbered with their
 * verb underlined, and sub-clauses indented beneath.
 */

/** The opening phrase: "Deeply concerned", "Recognising", "Encourages". */
function splitOpening(text: string, kind: ClauseKind): [string, string] {
  const match = /^(\S+)(\s+)(\S+)?/.exec(text);
  if (!match) return [text, ''];
  const first = match[1] ?? '';
  // "Deeply concerned", "Fully aware", "Strongly urges": an adverb takes its word with it.
  const two = /ly$/i.test(first) && match[3] && !/[,;:.]$/.test(first);
  const opening = two ? `${first}${match[2]}${match[3]}` : first;
  if (kind === 'operative' || opening.length < text.length) return [opening, text.slice(opening.length)];
  return [text, ''];
}

export function ClauseBody({ clause, className }: { clause: Pick<Clause, 'kind' | 'text'>; className?: string }) {
  const lines = clauseLines(clause.text);
  return (
    <div className={cn('space-y-1.5', className)}>
      {lines.map((line, index) => {
        if (index === 0) {
          const [opening, rest] = splitOpening(line.text, clause.kind);
          return (
            <p key={index} className="leading-relaxed">
              <span className={clause.kind === 'preamble' ? 'italic' : 'underline decoration-ink-300 underline-offset-[3px]'}>
                {opening}
              </span>
              {rest}
            </p>
          );
        }
        return (
          <p key={index} className={cn('flex gap-2 leading-relaxed', line.level === 2 ? 'pl-10' : 'pl-5')}>
            {line.marker ? <span className="shrink-0 text-ink-500">{line.marker}.</span> : null}
            <span>{line.text}</span>
          </p>
        );
      })}
    </div>
  );
}

/** Two versions of a clause, word by word: struck through in red, added in green. */
export function DiffText({ before, after, className }: { before: string; after: string; className?: string }) {
  const parts = diffWords(before, after);
  return (
    <p className={cn('whitespace-pre-wrap leading-relaxed', className)}>
      {parts.map((part, index) =>
        part.type === 'same' ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : part.type === 'added' ? (
          <ins key={index} className="rounded-[3px] bg-success-soft text-success no-underline">
            {part.text}
          </ins>
        ) : (
          <del key={index} className="rounded-[3px] bg-danger-soft text-danger decoration-danger/70">
            {part.text}
          </del>
        ),
      )}
    </p>
  );
}

/** A whole clause added, or struck. */
export function WholeClause({ text, mode, className }: { text: string; mode: 'added' | 'removed'; className?: string }) {
  return (
    <p
      className={cn(
        'whitespace-pre-wrap rounded-[4px] px-1 leading-relaxed',
        mode === 'added' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger line-through decoration-danger/70',
        className,
      )}
    >
      {text}
    </p>
  );
}

export function SubmitterList({ countries, className }: { countries: string[]; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      {countries.map((country) => (
        <span key={country} className="inline-flex items-center gap-1.5">
          <Flag code={countryCode(country)} country={country} size="xs" />
          {country}
        </span>
      ))}
    </span>
  );
}

/** The heading block of a resolution, as printed on its first page. */
export function ResolutionHeader({
  text,
  committeeName,
  topicLabel,
}: {
  text: ResolutionText;
  committeeName: string;
  topicLabel: string;
}) {
  const rows: [string, ReactNode][] = [
    ['Committee', committeeName],
    [topicLabel, text.topic],
  ];
  if (text.freezeDate) rows.push(['Freeze date', text.freezeDate]);
  if (text.mainSubmitters.length) {
    rows.push([
      text.mainSubmitters.length > 1 ? 'Main submitters' : 'Main submitter',
      <span key="main">
        <SubmitterList countries={text.mainSubmitters} />
        {text.replacedMainSubmitters?.length ? (
          <span className="mt-0.5 block text-xs text-muted">
            In place of {text.replacedMainSubmitters.join(', ')}, who {text.replacedMainSubmitters.length > 1 ? 'are' : 'is'} not in this committee.
          </span>
        ) : null}
      </span>,
    ]);
  }
  if (text.coSubmitters.length) rows.push(['Co-submitters', <SubmitterList key="co" countries={text.coSubmitters} />]);
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="text-ink-900">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * The resolution's clauses. `marks` labels clauses that amendments have
 * changed or added, so the committee can see what is new.
 */
export function ResolutionClauses({
  clauses,
  marks,
  lang,
}: {
  clauses: Clause[];
  marks?: Map<string, string>;
  lang?: string;
}) {
  const preamble = clauses.filter((clause) => clause.kind === 'preamble');
  const operative = clauses.filter((clause) => clause.kind === 'operative');
  return (
    <div lang={lang} className="space-y-6 text-[15px] text-ink-900">
      {preamble.length ? (
        <div className="space-y-3.5">
          {preamble.map((clause) => (
            <div key={clause.id} className="relative">
              <ClauseBody clause={clause} />
              {marks?.get(clause.id) ? <MarkTag label={marks.get(clause.id) ?? ''} /> : null}
            </div>
          ))}
        </div>
      ) : null}
      {operative.length ? (
        <ol className="space-y-4">
          {operative.map((clause) => (
            <li key={clause.id} className="flex gap-3">
              <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-teal-700">
                {operativeNumber(clauses, clause.id)}.
              </span>
              <div className="min-w-0 flex-1">
                <ClauseBody clause={clause} />
                {marks?.get(clause.id) ? <MarkTag label={marks.get(clause.id) ?? ''} /> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function MarkTag({ label }: { label: string }) {
  return <span className="mt-1.5 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">{label}</span>;
}

const STATUS: Record<Amendment['status'], { label: string; tone: 'neutral' | 'teal' | 'success' | 'danger' | 'outline' }> = {
  pending: { label: 'Waiting', tone: 'neutral' },
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  withdrawn: { label: 'Withdrawn', tone: 'outline' },
};

/** What an amendment does, shown as the change itself. */
export function AmendmentChange({ amendment, current }: { amendment: Amendment; current?: string | null }) {
  if (amendment.kind === 'add') return <WholeClause text={amendment.newText ?? ''} mode="added" />;
  if (amendment.kind === 'remove') return <WholeClause text={amendment.oldText ?? ''} mode="removed" />;
  return (
    <div className="space-y-2">
      <DiffText before={amendment.oldText ?? ''} after={amendment.newText ?? ''} />
      {amendment.status === 'pending' && current !== undefined && current !== amendment.oldText ? (
        <p className="rounded-control border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning">
          {current === null
            ? 'This clause has since been removed by another amendment.'
            : 'Another amendment has changed this clause since. If this one passes, its wording replaces the clause as it now stands.'}
        </p>
      ) : null}
    </div>
  );
}

export function AmendmentCard({
  amendment,
  current,
  debating,
  action,
  className,
}: {
  amendment: Amendment;
  /** The clause as it stands now (null: removed), to warn when it has moved on. */
  current?: string | null;
  debating?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  const status = STATUS[amendment.status];
  return (
    <div
      className={cn(
        'rounded-card border bg-surface px-4 py-4 sm:px-5',
        debating ? 'border-teal-300 ring-1 ring-teal-200' : 'border-hairline',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-serif text-[17px] text-ink-900">Amendment {amendment.number}</span>
        {debating ? <Badge tone="teal">Debating now</Badge> : <Badge tone={status.tone}>{status.label}</Badge>}
        {amendment.votes && amendment.status !== 'pending' && amendment.status !== 'withdrawn' ? (
          <span className="text-xs tabular-nums text-muted">
            {amendment.votes.for} for · {amendment.votes.against} against · {amendment.votes.abstain} abstaining
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm text-ink-700">
        {amendment.kind === 'add' ? amendment.label : `${amendment.kind === 'remove' ? 'Removes' : 'Changes'} ${amendment.label.toLowerCase()}`}
      </p>
      <p className="mt-1 text-xs text-muted">
        <SubmitterList countries={amendment.submitters} />
      </p>
      <div className="mt-3 text-[15px] text-ink-900">
        <AmendmentChange amendment={amendment} current={current} />
      </div>
      {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
