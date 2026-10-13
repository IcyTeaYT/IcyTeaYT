import { ArrowRight, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { writesOwnResolution } from '@/config/resolutions';
import type { Committee } from '@/data/source/types';

/** On a delegate's home page: the way into their committee's resolution. */
export function ResolutionCard({ committee }: { committee: Committee }) {
  const navigate = useNavigate();
  const writing = writesOwnResolution(committee.id);
  return (
    <Card className="border-teal-200">
      <CardBody className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-teal-50 text-teal-700">
            <PenLine size={18} strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-medium text-ink-900">{writing ? 'Write the resolution' : 'Draft resolution and amendments'}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {writing
                ? 'Write a draft with your bloc, live, and submit it to the chairs.'
                : `Read ${committee.abbreviation}’s draft resolutions, propose amendments with other countries, and follow every vote.`}
            </p>
          </div>
        </div>
        <Button variant="primary" className="shrink-0" onClick={() => navigate('/resolution')}>
          Open
          <ArrowRight size={15} strokeWidth={1.5} />
        </Button>
      </CardBody>
    </Card>
  );
}
