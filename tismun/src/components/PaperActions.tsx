import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { COPY } from '@/config/conference';
import type { Committee } from '@/data/source/types';
import { Button } from './ui/Button';
import { PdfViewer } from './PdfViewer';

/** View / Download pair for a committee's background paper, plus its modal. */
export function PaperActions({
  committee,
  size = 'md',
  className,
}: {
  committee: Committee;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const url = committee.backgroundPaperUrl;

  if (!url) {
    return <p className="text-sm text-muted">{COPY.paper.missing}</p>;
  }

  return (
    <>
      <div className={className}>
        <Button variant="primary" size={size} onClick={() => setOpen(true)}>
          <FileText size={15} strokeWidth={1.5} />
          {COPY.paper.view}
        </Button>
        <Button variant="secondary" size={size} onClick={() => { window.location.href = url; }}>
          <Download size={15} strokeWidth={1.5} />
          {COPY.paper.download}
        </Button>
      </div>

      <PdfViewer
        open={open}
        onClose={() => setOpen(false)}
        url={url}
        title={committee.name}
        subtitle={`${committee.abbreviation} — background paper`}
      />
    </>
  );
}
