import { AnimatePresence, motion, useAnimationControls, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { CATEGORIES, GRADE_MAX, NAME_MAX, SUGGESTION_MAX, SUGGESTION_MIN, type CategoryId } from '@/data/categories';
import { SectionIntro } from '../ui/SectionIntro';
import { Owl } from '../brand/Owl';
import { EASE_OUT, SPRING_SNAPPY } from '@/lib/motion';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/* ---------- Character ring ---------- */

function CharRing({ count }: { count: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const p = useSpring(0, { stiffness: 200, damping: 26 });
  useEffect(() => p.set(Math.min(1, count / SUGGESTION_MAX)), [count, p]);
  const offset = useTransform(p, (v) => c * (1 - v));
  const tooShort = count > 0 && count < SUGGESTION_MIN;
  const near = count > SUGGESTION_MAX * 0.9;
  const over = count > SUGGESTION_MAX;
  const color = over ? '#F87171' : near ? '#FBBF24' : tooShort ? '#8AB2FF' : '#4DE8FA';
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 28 28" className="h-6 w-6 -rotate-90" aria-hidden>
        <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(160,190,255,0.14)" strokeWidth="2.5" />
        <motion.circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} style={{ strokeDashoffset: offset }} />
      </svg>
      <span className="relative h-4 overflow-hidden font-mono text-xs tabular" style={{ color: over ? '#F87171' : '#A4B1CC' }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={count} className="inline-block" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.18 }}>
            {count}
          </motion.span>
        </AnimatePresence>
        <span>/{SUGGESTION_MAX}</span>
      </span>
    </span>
  );
}

/* ---------- Success: paper drops into the box ---------- */

function SuccessPanel({ onReset }: { onReset: () => void }) {
  const reduce = useReducedMotion();
  const d = reduce ? 0 : 1;
  return (
    <motion.div
      key="success"
      className="flex flex-col items-center justify-center px-6 py-10 text-center [grid-area:1/1]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="polite"
    >
      <motion.div
        className="relative h-36 w-40"
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: [0.6, 1, 1, 1.06, 1], opacity: 1, y: 0 }}
        transition={{ duration: 1.1 * d || 0.2, times: [0, 0.25, 0.62, 0.72, 0.85], ease: EASE_OUT }}
        aria-hidden
      >
        <svg viewBox="0 0 160 144" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="box-front" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2F6FF5" />
              <stop offset="1" stopColor="#1A44A8" />
            </linearGradient>
          </defs>
          {/* back of the box */}
          <path d="M28 62 L80 44 L132 62 L80 80 Z" fill="#0E1629" stroke="rgba(160,190,255,0.35)" />
          {/* front */}
          <path d="M28 62 L80 80 L80 136 L28 118 Z" fill="url(#box-front)" />
          <path d="M132 62 L80 80 L80 136 L132 118 Z" fill="#1F56D6" />
          <path d="M80 80 L80 136" stroke="rgba(255,255,255,0.18)" />
          {/* lid flaps close after the paper lands */}
          <motion.path
            d="M28 62 L80 44 L80 20 L28 38 Z"
            fill="#5B91FF"
            style={{ transformOrigin: '28px 62px', transformBox: 'view-box' }}
            initial={{ rotate: 0 }}
            animate={{ rotate: reduce ? 0 : [0, 0, 118] }}
            transition={{ duration: 0.9 * d, times: [0, 0.6, 1], ease: EASE_OUT }}
          />
          <motion.path
            d="M132 62 L80 44 L80 20 L132 38 Z"
            fill="#8AB2FF"
            style={{ transformOrigin: '132px 62px', transformBox: 'view-box' }}
            initial={{ rotate: 0 }}
            animate={{ rotate: reduce ? 0 : [0, 0, -118] }}
            transition={{ duration: 0.95 * d, times: [0, 0.62, 1], ease: EASE_OUT }}
          />
        </svg>
        <motion.span
          className="absolute -right-1 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-volt-400 text-ink-950 shadow-[0_0_30px_rgba(77,232,250,0.7)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING_SNAPPY, delay: 1.0 * d }}
        >
          <svg viewBox="0 0 16 16" className="h-5 w-5">
            <path d="m3.5 8.3 2.8 2.8 6.2-6.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 * d, duration: 0.6, ease: EASE_OUT }}>
        <h3 className="mt-6 text-3xl font-semibold tracking-tight text-white">Idea received.</h3>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-mist-300">
          Thanks for helping build a smarter TIS. The council reads every suggestion, and the best ones become projects.
        </p>
        <button type="button" onClick={onReset} className="btn-ghost mt-7">
          Send another idea
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Form ---------- */

export function SuggestionBox() {
  const reduce = useReducedMotion();
  const uid = useId();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const shake = useAnimationControls();

  const trimmed = text.trim();
  const textError =
    trimmed.length < SUGGESTION_MIN
      ? `Please write at least ${SUGGESTION_MIN} characters.`
      : trimmed.length > SUGGESTION_MAX
        ? `Please keep it under ${SUGGESTION_MAX} characters.`
        : null;
  const categoryError = category ? null : 'Pick the category that fits best.';

  const fail = (msg: string) => {
    setError(msg);
    setStatus('error');
    if (!reduce) void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (textError || categoryError) {
      fail(textError ?? categoryError!);
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          category,
          name: anonymous ? '' : name.trim(),
          grade: anonymous ? '' : grade.trim(),
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        fail(data.error ?? 'Something went wrong on our side. Please try again in a minute.');
        return;
      }
      setStatus('sent');
    } catch {
      fail('Couldn’t reach the server. Check your connection and try again.');
    }
  };

  const reset = () => {
    setText('');
    setCategory(null);
    setName('');
    setGrade('');
    setTouched(false);
    setError(null);
    setStatus('idle');
  };

  const sending = status === 'sending';

  return (
    <section id="suggestions" aria-labelledby="suggest-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,111,245,0.2),transparent)] blur-2xl" />
      <div className="container-x grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionIntro
            id="suggest-title"
            index="04"
            label="Suggestion box"
            size="md"
            title={
              <>
                What tech does <span className="text-gradient">TIS</span> need?
              </>
            }
            kicker="Slow Wi-Fi in the library? An app you wish existed? Tell us. The council reads every idea, and the best ones become real projects."
          />
          <ul className="mt-10 space-y-4">
            {[
              ['Anonymous by default', 'Add your name only if you want us to follow up.'],
              ['Private', 'Suggestions are read by the council. They’re never posted publicly.'],
              ['Taken seriously', 'Popular ideas go straight into our project pipeline.'],
            ].map(([t, b], i) => (
              <motion.li
                key={t}
                className="flex gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 + i * 0.1 }}
              >
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-volt-400/30 bg-volt-400/10 text-volt-300">
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                    <path d="m2.5 6.2 2.2 2.2 4.8-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <span className="block font-medium text-white">{t}</span>
                  <span className="block text-[15px] text-mist-400">{b}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: 1, ease: EASE_OUT }}
        >
          <motion.div animate={shake} className="glass relative grid min-h-[640px] overflow-hidden rounded-[32px] shadow-2xl shadow-black/40" style={{ perspective: 1200 }}>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt-400/60 to-transparent" />
            <AnimatePresence initial={false}>
              {status === 'sent' ? (
                <SuccessPanel key="success" onReset={reset} />
              ) : (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  noValidate
                  className="flex flex-col p-6 [grid-area:1/1] sm:p-9"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={
                    reduce
                      ? { opacity: 0, transition: { duration: 0.2 } }
                      : {
                          // Fold the card and drop it into the box.
                          rotateX: [0, 0, 62],
                          scaleX: [1, 0.9, 0.18],
                          scaleY: [1, 0.55, 0.12],
                          y: [0, -30, 150],
                          opacity: [1, 1, 0],
                          borderRadius: [32, 40, 12],
                          transition: { duration: 0.75, times: [0, 0.35, 1], ease: [0.55, 0, 0.75, 0.3] },
                        }
                  }
                  style={{ transformOrigin: '50% 60%', background: 'transparent' }}
                  aria-describedby={error ? `${uid}-error` : undefined}
                >
                  {/* Honeypot: invisible to people, irresistible to bots. */}
                  <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                    <label htmlFor={`${uid}-website`}>Website</label>
                    <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <label htmlFor={`${uid}-text`} className="text-sm font-medium text-white">
                      Your idea <span className="text-volt-300">*</span>
                    </label>
                    <CharRing count={text.length} />
                  </div>
                  <div className="group relative mt-3">
                    <textarea
                      id={`${uid}-text`}
                      name="text"
                      required
                      minLength={SUGGESTION_MIN}
                      maxLength={SUGGESTION_MAX + 200}
                      rows={6}
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        if (status === 'error') setStatus('idle');
                      }}
                      aria-invalid={touched && !!textError}
                      aria-describedby={`${uid}-text-hint`}
                      placeholder="e.g. A live board outside the gym showing which courts are free…"
                      className="block w-full resize-none rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3.5 text-[16px] leading-relaxed text-white placeholder:text-mist-500 transition-[border-color,box-shadow] duration-300 focus:border-volt-400/60 focus:shadow-[0_0_0_4px_rgba(77,232,250,0.12)] focus:outline-none aria-[invalid=true]:border-red-400/60"
                    />
                  </div>
                  <p id={`${uid}-text-hint`} className={`mt-2 text-xs ${touched && textError ? 'text-red-300' : 'text-mist-500'}`}>
                    {touched && textError ? textError : `Between ${SUGGESTION_MIN} and ${SUGGESTION_MAX} characters.`}
                  </p>

                  <fieldset className="mt-7">
                    <legend className="text-sm font-medium text-white">
                      Category <span className="text-volt-300">*</span>
                    </legend>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
                      {CATEGORIES.map((c) => {
                        const selected = category === c.id;
                        return (
                          <label key={c.id} className="relative cursor-pointer">
                            <input
                              type="radio"
                              name="category"
                              value={c.id}
                              checked={selected}
                              onChange={() => {
                                setCategory(c.id);
                                if (status === 'error') setStatus('idle');
                              }}
                              className="peer sr-only"
                            />
                            <motion.span
                              whileTap={{ scale: 0.95 }}
                              className={`relative z-10 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-volt-400 ${
                                selected ? 'border-transparent font-medium text-ink-950' : 'border-white/12 text-mist-200 hover:border-white/25 hover:text-white'
                              } ${touched && categoryError ? 'border-red-400/40' : ''}`}
                            >
                              {selected && (
                                <motion.span layoutId={`${uid}-chip`} className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-volt-300 to-tis-300" transition={SPRING_SNAPPY} />
                              )}
                              <AnimatePresence initial={false}>
                                {selected && (
                                  <motion.svg viewBox="0 0 12 12" className="h-3 w-3" initial={{ width: 0, opacity: 0 }} animate={{ width: 12, opacity: 1 }} exit={{ width: 0, opacity: 0 }} aria-hidden>
                                    <path d="m2.5 6.2 2.2 2.2 4.8-4.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </motion.svg>
                                )}
                              </AnimatePresence>
                              {c.label}
                            </motion.span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="mt-7 rounded-2xl border border-white/10 bg-ink-950/40 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span id={`${uid}-anon`} className="text-sm">
                        <span className="block font-medium text-white">Send anonymously</span>
                        <span className="block text-xs text-mist-400">{anonymous ? 'No name attached.' : 'We’ll see your name and grade.'}</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={anonymous}
                        aria-labelledby={`${uid}-anon`}
                        onClick={() => setAnonymous((a) => !a)}
                        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300 ${anonymous ? 'border-volt-400/50 bg-volt-400/25' : 'border-white/15 bg-white/5'}`}
                      >
                        <motion.span className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow" animate={{ left: anonymous ? 24 : 3 }} transition={SPRING_SNAPPY} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {!anonymous && (
                        <motion.div
                          className="overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.45, ease: EASE_OUT }}
                        >
                          <div className="grid gap-3 pt-4 sm:grid-cols-[1fr_120px]">
                            <div>
                              <label htmlFor={`${uid}-name`} className="text-xs text-mist-300">
                                Name <span className="text-mist-500">(optional)</span>
                              </label>
                              <input
                                id={`${uid}-name`}
                                name="name"
                                autoComplete="name"
                                maxLength={NAME_MAX}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1.5 block h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-[16px] text-white transition-[border-color,box-shadow] focus:border-volt-400/60 focus:shadow-[0_0_0_4px_rgba(77,232,250,0.12)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label htmlFor={`${uid}-grade`} className="text-xs text-mist-300">
                                Grade <span className="text-mist-500">(optional)</span>
                              </label>
                              <input
                                id={`${uid}-grade`}
                                name="grade"
                                inputMode="numeric"
                                maxLength={GRADE_MAX}
                                placeholder="e.g. 11"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="mt-1.5 block h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-[16px] text-white placeholder:text-mist-500 transition-[border-color,box-shadow] focus:border-volt-400/60 focus:shadow-[0_0_0_4px_rgba(77,232,250,0.12)] focus:outline-none"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {status === 'error' && error && (
                      <motion.div
                        id={`${uid}-error`}
                        role="alert"
                        className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                      >
                        <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
                          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M8 4.8v3.6M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-auto flex flex-col-reverse items-stretch gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-xs text-mist-500">
                      <Owl className="h-6 w-6" />
                      Only the Tech Council can read this.
                    </p>
                    <button type="submit" disabled={sending} className="btn-primary min-w-[190px] disabled:cursor-wait" aria-live="polite">
                      <AnimatePresence mode="wait" initial={false}>
                        {sending ? (
                          <motion.span key="sending" className="flex items-center gap-2.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                            <span className="flex gap-1" aria-hidden>
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="h-1.5 w-1.5 rounded-full bg-ink-950"
                                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                                />
                              ))}
                            </span>
                            Sending
                          </motion.span>
                        ) : (
                          <motion.span key="send" className="flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                            Send suggestion
                            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                              <path d="M2 8.2 14 2.5 10.6 14l-2.4-4.6L2 8.2Z M8.2 9.4 14 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                            </svg>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
