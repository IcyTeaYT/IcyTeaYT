import { ArrowLeft, Lock, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlobeLines } from '@/components/GlobeLines';
import { Wordmark } from '@/components/Logo';
import { CONFERENCE, COPY } from '@/config/conference';

function ErrorLayout({
  code,
  title,
  body,
  icon,
}: {
  code: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-[70vh] items-center overflow-hidden">
      <GlobeLines className="absolute -right-24 top-1/2 -z-10 h-[460px] w-[460px] -translate-y-1/2 opacity-[0.06]" />
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
        <div className="max-w-lg">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-ink-50 text-ink-400">
            {icon}
          </span>
          <p className="label-micro mt-6">{code}</p>
          <h1 className="mt-3 font-serif text-[30px] leading-tight text-ink-900 sm:text-[36px]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
          <Link
            to="/"
            className="group mt-7 inline-flex items-center gap-2 rounded-control bg-teal-500 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors duration-200 hover:bg-teal-600"
          >
            <ArrowLeft
              size={15}
              strokeWidth={1.5}
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            {COPY.errors.backHome}
          </Link>
          <p className="mt-10 text-xs text-muted">
            <Wordmark className="text-ink-600" /> · {CONFERENCE.edition}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <ErrorLayout
      code="404"
      title={COPY.errors.notFoundTitle}
      body={COPY.errors.notFoundBody}
      icon={<SearchX size={20} strokeWidth={1.5} />}
    />
  );
}

export function AccessDenied() {
  return (
    <ErrorLayout
      code="403"
      title={COPY.errors.deniedTitle}
      body={`${COPY.errors.deniedBody} If this is wrong, contact the Secretariat at ${CONFERENCE.secretariatEmail}.`}
      icon={<Lock size={20} strokeWidth={1.5} />}
    />
  );
}
