import { motion } from 'framer-motion';
import { Gavel, Info, Landmark, Loader2, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GlobeLines } from '@/components/GlobeLines';
import { HostedBy } from '@/components/HostedBy';
import { Logo, Wordmark } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { CONFERENCE, COPY, SCHOOL_DOMAIN } from '@/config/conference';
import { dataSource, isDemoMode } from '@/data/source';
import type { User } from '@/data/source/types';
import { formatDateRange } from '@/lib/conferenceDates';
import { exchangeCredential, isGoogleConfigured, renderGoogleButton } from '@/lib/googleAuth';
import { useAuth } from '@/store/auth';
import { useConference } from '@/store/conference';

export function Login() {
  const status = useAuth((state) => state.status);
  const restore = useAuth((state) => state.restore);
  const signInAs = useAuth((state) => state.signInAs);
  const navigate = useNavigate();
  const committees = useConference((state) => state.committees);

  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleSlot = useRef<HTMLDivElement>(null);
  const [google, setGoogle] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [testLogins, setTestLogins] = useState(false);
  const [googleAttempt, setGoogleAttempt] = useState(0);

  // Shared test accounts, while the Secretariat has TEST_LOGINS switched on.
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    fetch('/api/test-login', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? (response.json() as Promise<{ enabled?: boolean }>) : null))
      .then((body) => {
        if (!cancelled) setTestLogins(Boolean(body?.enabled));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDemoMode || !dataSource.listDemoUsers) return;
    void dataSource.listDemoUsers().then((users) => {
      setDemoUsers(users);
      setSelectedEmail((current) => current || users[0]?.email || '');
    });
  }, []);

  // Google's button is rendered by Google's own script into this slot. It is
  // drawn at a fixed width, so it is drawn again when the slot's width changes
  // (a phone turning sideways), and a failed load can be retried.
  useEffect(() => {
    if (!isGoogleConfigured() || !googleSlot.current) return;
    const slot = googleSlot.current;
    let cancelled = false;
    let drawnWidth = 0;

    const onCredential = async (idToken: string) => {
      setSigningIn(true);
      setError(null);
      const result = await exchangeCredential(idToken);
      if (result.ok) {
        await restore();
        navigate('/', { replace: true });
      } else {
        setError(result.error ?? COPY.login.wrongDomain);
        setSigningIn(false);
      }
    };

    const draw = () => {
      drawnWidth = slot.clientWidth;
      renderGoogleButton(slot, onCredential)
        .then(() => {
          if (!cancelled) setGoogle('ready');
        })
        .catch(() => {
          if (!cancelled) setGoogle('failed');
        });
    };

    setGoogle('loading');
    draw();

    const observer = new ResizeObserver(() => {
      if (Math.abs(slot.clientWidth - drawnWidth) > 8) draw();
    });
    observer.observe(slot);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [restore, navigate, googleAttempt]);

  const { defaultDelegate, defaultChair, defaultSecretariat, grouped } = useMemo(() => {
    const groups = new Map<string, User[]>();
    for (const user of demoUsers) {
      // The list arrives already ordered, so Map insertion order carries it.
      const key = user.committeeId ?? (user.role === 'SECRETARIAT' ? 'Secretariat' : 'Unassigned');
      const bucket = groups.get(key);
      if (bucket) bucket.push(user);
      else groups.set(key, [user]);
    }
    return {
      defaultDelegate: demoUsers.find((u) => u.role === 'DELEGATE' && u.committeeId) ?? null,
      defaultChair: demoUsers.find((u) => u.role === 'CHAIR') ?? null,
      defaultSecretariat: demoUsers.find((u) => u.role === 'SECRETARIAT') ?? null,
      grouped: [...groups.entries()],
    };
  }, [demoUsers]);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const signIn = async (email: string | undefined) => {
    if (!email) return;
    setSigningIn(true);
    setError(null);
    const ok = await signInAs(email);
    if (ok) navigate('/', { replace: true });
    else {
      setError('That account is not on the conference roster.');
      setSigningIn(false);
    }
  };

  const testSignIn = async (role: 'delegate' | 'chair' | 'secretariat') => {
    setSigningIn(true);
    setError(null);
    try {
      const response = await fetch('/api/test-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (response.ok) {
        await restore();
        navigate('/', { replace: true });
        return;
      }
      setError('Test sign-in is switched off.');
    } catch {
      setError('Test sign-in could not reach the server.');
    }
    setSigningIn(false);
  };

  const groupLabel = (key: string): string =>
    committees.find((committee) => committee.id === key)?.abbreviation ?? key.toUpperCase();

  const optionLabel = (user: User): string => {
    if (user.role === 'SECRETARIAT') return `${user.title ?? 'Secretariat'} — ${user.fullName}`;
    if (user.role === 'CHAIR') return `Chair — ${user.fullName}`;
    if (user.country) return `${user.country} — ${user.fullName}`;
    return `Unassigned — ${user.fullName}`;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Identity panel */}
      {/* On a phone this panel is kept short, so "Sign in with Google" is on the
          first screen rather than below a full-height title. */}
      <div className="relative isolate flex flex-col justify-between overflow-hidden bg-canvas px-6 py-6 sm:px-12 sm:py-10 lg:py-14">
        <GlobeLines className="absolute -right-24 top-1/2 -z-10 h-[520px] w-[520px] -translate-y-1/2 opacity-[0.07] lg:-right-32 lg:h-[640px] lg:w-[640px]" />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* A phone keeps the short wide logo, so "Sign in with Google" stays on
              the first screen; larger screens have room for the stacked one. */}
          <Logo className="h-auto w-[150px] sm:hidden" priority />
          <Logo variant="stacked" className="hidden h-auto w-[104px] sm:block lg:w-[124px]" priority />
        </motion.div>

        <motion.div
          className="mt-5 max-w-md sm:mt-12 lg:mt-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="label-micro sm:text-[13px]">{CONFERENCE.edition}</p>
          <h1 className="mt-2 font-serif text-[22px] leading-[1.2] text-ink-900 sm:mt-3 sm:text-[40px] sm:leading-[1.16] lg:text-[46px]">
            {CONFERENCE.fullName}
          </h1>
          <p className="mt-2 text-sm text-muted sm:mt-4 sm:text-base">
            {formatDateRange()} · {CONFERENCE.venue}
          </p>
          <HostedBy className="mt-4 sm:mt-7" />
        </motion.div>

        <p className="mt-12 hidden text-sm text-muted lg:block">
          Delegates, chairs and the Secretariat sign in with their school Google account.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-start justify-center border-t border-hairline bg-surface px-6 py-7 sm:items-center sm:px-12 sm:py-12 lg:border-l lg:border-t-0">
        <motion.div
          className="w-full max-w-sm sm:max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-serif text-2xl text-ink-900 sm:text-[32px] sm:leading-tight">{COPY.login.heading}</h2>
          <p className="mt-2 text-sm text-muted sm:text-base">{COPY.login.subtext}</p>

          <div className="mt-7">
            {isGoogleConfigured() ? (
              <>
                <div ref={googleSlot} className="min-h-[44px] [color-scheme:light]" />
                {google === 'loading' ? (
                  <p className="-mt-[44px] flex h-[44px] items-center justify-center gap-2 rounded-control border border-hairline text-sm text-muted">
                    <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                    Loading Google sign-in…
                  </p>
                ) : null}
                {google === 'failed' ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-control border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger">
                    Google sign-in could not load.
                    <Button variant="secondary" size="sm" onClick={() => setGoogleAttempt((n) => n + 1)}>
                      Try again
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-control border border-dashed border-hairline bg-canvas px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink-500 sm:text-base">{COPY.login.googleButton}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-muted">
                    {COPY.login.googleNotConfigured}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                  {COPY.login.googleNotConfiguredHint}
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted sm:text-sm">
            <Info size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            {SCHOOL_DOMAIN ? (
              <span>
                Sign in with your school Google account —{' '}
                <span className="font-medium text-ink-700">@{SCHOOL_DOMAIN}</span>.
              </span>
            ) : (
              <span>
                Sign in with your school Google account — the one the Secretariat registered you
                with.
              </span>
            )}
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-control border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          {testLogins ? (
            <div className="mt-9 border-t border-hairline pt-7">
              <h3 className="label-micro sm:text-[13px]">Testing</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                Try the site with a shared test account in GA 2. No Google sign-in needed.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-auto flex-col gap-1 whitespace-normal py-2 text-center leading-tight sm:py-3 sm:text-[15px]"
                  disabled={signingIn}
                  onClick={() => void testSignIn('delegate')}
                >
                  <Users size={16} strokeWidth={1.5} />
                  Test Delegate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-auto flex-col gap-1 whitespace-normal py-2 text-center leading-tight sm:py-3 sm:text-[15px]"
                  disabled={signingIn}
                  onClick={() => void testSignIn('chair')}
                >
                  <Gavel size={16} strokeWidth={1.5} />
                  Test Chair
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-auto flex-col gap-1 whitespace-normal py-2 text-center leading-tight sm:py-3 sm:text-[15px]"
                  disabled={signingIn}
                  onClick={() => void testSignIn('secretariat')}
                >
                  <Landmark size={16} strokeWidth={1.5} />
                  Test Secretariat
                </Button>
              </div>
            </div>
          ) : null}

          {isDemoMode ? (
            <div className="mt-9 border-t border-hairline pt-7">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="label-micro sm:text-[13px]">{COPY.login.demoHeading}</h3>
                <span className="text-[11px] text-ink-300">VITE_DATA_MODE=demo</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">{COPY.login.demoSubtext}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-col gap-1 py-2 h-auto sm:py-3 sm:text-[15px]"
                  disabled={signingIn || !defaultDelegate}
                  onClick={() => void signIn(defaultDelegate?.email)}
                >
                  <Users size={16} strokeWidth={1.5} />
                  Delegate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-col gap-1 py-2 h-auto sm:py-3 sm:text-[15px]"
                  disabled={signingIn || !defaultChair}
                  onClick={() => void signIn(defaultChair?.email)}
                >
                  <Gavel size={16} strokeWidth={1.5} />
                  Chair
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-col gap-1 py-2 h-auto sm:py-3 sm:text-[15px]"
                  disabled={signingIn || !defaultSecretariat}
                  onClick={() => void signIn(defaultSecretariat?.email)}
                >
                  <Landmark size={16} strokeWidth={1.5} />
                  Secretariat
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <label className="label-micro block" htmlFor="demo-user">
                  Or pick any account
                </label>
                <Select
                  id="demo-user"
                  value={selectedEmail}
                  onChange={(event) => setSelectedEmail(event.target.value)}
                  disabled={demoUsers.length === 0}
                >
                  {grouped.map(([committeeId, users]) => (
                    // Show the committee's own abbreviation rather than a
                    // shouted version of its id — "HRC 1", not "HRC-1".
                    <optgroup key={committeeId} label={groupLabel(committeeId)}>
                      {users.map((user) => (
                        <option key={user.email} value={user.email}>
                          {optionLabel(user)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={signingIn || !selectedEmail}
                  onClick={() => void signIn(selectedEmail)}
                >
                  {signingIn ? (
                    <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                  ) : null}
                  Continue
                </Button>
              </div>
            </div>
          ) : null}

          <p className="mt-10 text-xs text-muted sm:text-sm">
            <span className="lg:hidden">
              <Wordmark className="text-ink-700" /> · {CONFERENCE.edition} ·{' '}
            </span>
            <Link to="/privacy" className="rounded underline-offset-4 hover:text-teal-700 hover:underline">
              Privacy policy and terms
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
