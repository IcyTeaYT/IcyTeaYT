import { Download, ExternalLink } from 'lucide-react';
import { COPY } from '@/config/conference';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

/**
 * In-page background paper viewer. Mobile browsers routinely refuse to render
 * a PDF inside an iframe, so "Open in new tab" is always offered rather than
 * hidden behind a failure.
 */
export function PdfViewer({
  open,
  onClose,
  url,
  title,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={subtitle}
      size="wide"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={15} strokeWidth={1.5} />
            Open in new tab
          </Button>
          <Button variant="primary" onClick={() => { window.location.href = url; }}>
            <Download size={15} strokeWidth={1.5} />
            {COPY.paper.download}
          </Button>
        </>
      }
    >
      <div className="h-[60vh] bg-ink-50 sm:h-[68vh]">
        <iframe
          key={url}
          src={`${url}#view=FitH`}
          title={`${title} — background paper`}
          className="h-full w-full border-0"
        />
      </div>
    </Modal>
  );
}
