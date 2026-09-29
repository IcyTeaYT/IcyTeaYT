import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { COPY } from '@/config/conference';
import type { Committee } from '@/data/source/types';
import { cn } from '@/lib/cn';
import { papersOf, type Paper } from '@/lib/papers';
import { Button } from './ui/Button';
import { PdfViewer } from './PdfViewer';

/**
 * View / Download for a committee's background papers, plus the viewer. One
 * pair of buttons for a single paper; one labelled row per topic when each
 * topic has its own paper.
 */
export function PaperActions({
  committee,
  size = 'md',
  className,
}: {
  committee: Committee;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [open, setOpen] = useState<Paper | null>(null);
  const papers = papersOf(committee);

  if (papers.length === 0) {
    return <p className="text-sm text-muted">{COPY.paper.missing}</p>;
  }

  const buttons = (paper: Paper) => (
    <>
      <Button variant="primary" size={size} onClick={() => setOpen(paper)}>
        <FileText size={15} strokeWidth={1.5} />
        {COPY.paper.view}
      </Button>
      <Button
        variant="secondary"
        size={size}
        onClick={() => {
          window.location.href = paper.url;
        }}
      >
        <Download size={15} strokeWidth={1.5} />
        {COPY.paper.download}
      </Button>
    </>
  );

  return (
    <>
      {papers.length === 1 && !papers[0]?.topic ? (
        <div className={className}>{buttons(papers[0]!)}</div>
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <div key={paper.url}>
              <p className="label-micro" title={paper.topic ?? undefined}>
                {paper.label} paper
              </p>
              <div className={cn('mt-1.5', className)}>{buttons(paper)}</div>
            </div>
          ))}
        </div>
      )}

      <PdfViewer
        open={open !== null}
        onClose={() => setOpen(null)}
        url={open?.url ?? ''}
        title={open?.topic ?? committee.name}
        subtitle={`${committee.abbreviation} — ${open?.topic ? `${open.label} background paper` : 'background paper'}`}
      />
    </>
  );
}
