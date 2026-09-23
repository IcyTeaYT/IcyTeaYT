import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HostedBy } from '@/components/HostedBy';
import { Wordmark } from '@/components/Logo';
import { CONFERENCE } from '@/config/conference';
import { formatDateRange } from '@/lib/conferenceDates';

/**
 * Public privacy policy and terms of use. Google requires both links before
 * the sign-in consent screen can be published, and they have to open without
 * signing in, so this page lives outside the authenticated shell.
 */
export function Privacy() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded text-sm text-muted transition-colors duration-200 hover:text-teal-700"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          <Wordmark className="text-ink-700" />
        </Link>

        <p className="label-micro mt-10">
          {CONFERENCE.edition} · {formatDateRange()}
        </p>
        <h1 className="mt-3 font-serif text-[30px] leading-tight text-ink-900 sm:text-[36px]">
          Privacy policy and terms of use
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated September 23, 2026.</p>

        <Section id="privacy" title="Privacy policy">
          <p>
            This website is run by the {CONFERENCE.fullName} Secretariat for delegates, chairs and
            the Secretariat of {CONFERENCE.edition}, hosted by {CONFERENCE.host}.
          </p>
          <h3>What we collect</h3>
          <ul>
            <li>
              <strong>Your Google account email address and name,</strong> received from Google when
              you sign in. We use them only to check that you are on the conference roster.
            </li>
            <li>
              <strong>Conference roster details</strong> (name, role, committee and delegation) that
              the Secretariat enters in the conference registration sheet.
            </li>
            <li>
              <strong>Committee session records</strong> that chairs enter during the conference,
              such as the Roll Call, the Speakers' List, motions, draft resolutions and voting
              results.
            </li>
          </ul>
          <h3>How it is used and stored</h3>
          <ul>
            <li>
              Signing in sets one secure cookie that holds your email address, so you stay signed
              in. We do not use advertising or analytics cookies.
            </li>
            <li>
              Committee session records are stored in the chair's browser and on Cloudflare so the
              Secretariat can follow every committee live.
            </li>
            <li>
              We do not sell or share your information, and we do not use it for anything other
              than running the conference.
            </li>
            <li>
              The site is hosted on Cloudflare Pages. Sign-in is provided by Google, and fonts are
              loaded from Google Fonts.
            </li>
          </ul>
          <h3>Keeping and deleting data</h3>
          <p>
            Session records are kept until the conference ends and are then deleted. To ask what
            we hold about you or to have it removed, email{' '}
            <a href={`mailto:${CONFERENCE.secretariatEmail}`}>{CONFERENCE.secretariatEmail}</a>.
          </p>
        </Section>

        <Section id="terms" title="Terms of use">
          <ul>
            <li>
              This website is only for registered participants of {CONFERENCE.edition}. Sign in with
              the school Google account you were registered with.
            </li>
            <li>
              Do not share your account, and do not try to reach pages or data meant for another
              role or committee.
            </li>
            <li>
              Background papers and conference materials are for use at the conference only.
            </li>
            <li>
              The Secretariat may remove access for anyone who breaks these terms or the conference
              code of conduct.
            </li>
            <li>
              The website is provided as is. The Rules of Procedure and the decisions of the
              chairs and the Secretariat take priority over anything shown here.
            </li>
          </ul>
        </Section>

        <HostedBy className="mt-14" />
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="mt-12 scroll-mt-8 border-t border-hairline pt-8 text-sm leading-relaxed text-ink-700 [&_a]:text-teal-700 [&_a]:underline [&_a]:underline-offset-4 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-ink-900 [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
    >
      <h2 className="font-serif text-2xl text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
