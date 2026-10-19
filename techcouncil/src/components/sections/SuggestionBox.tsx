import { AnimatePresence, motion, useAnimationControls, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useId, type ReactNode } from 'react';
import { CATEGORIES, GRADE_MAX, NAME_MAX, SUGGESTION_MAX, SUGGESTION_MIN } from '@/data/categories';
import { useSuggestionForm } from '@/lib/suggestion';
import { Arrow } from '../ui/Arrow';
import { EASE_OUT, SPRING_SNAPPY } from '@/lib/motion';

const field =
  'block w-full rounded-nav border border-line-dark bg-transparent px-4 text-body text-paper placeholder:text-fog/70 transition-colors duration-300 focus:border-paper focus:outline-none';

/* ---------- Character ring ---------- */

function CharRing({ count }: { count: number }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const p = useSpring(0, { stiffness: 200, damping: 26 });
  useEffect(() => p.set(Math.min(1, count / SUGGESTION_MAX)), [count, p]);
  const offset = useTransform(p, (v) => c * (1 - v));
  const over = count > SUGGESTION_MAX;
  return (
    <span className="flex items-center gap-2 text-caption text-fog">
      <svg viewBox="0 0 24 24" className="h-5 w-5 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
        <motion.circle cx="12" cy="12" r={r} fill="none" stroke={over ? '#FF8A8A' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" strokeDasharray={c} style={{ strokeDashoffset: offset }} />
      </svg>
      <span className="tabular" style={{ color: over ? '#FF8A8A' : undefined }}>
        {count}/{SUGGESTION_MAX}
      </span>
    </span>
  );
}

/* ---------- Success: the note drops into the box ---------- */

function SuccessPanel({ onReset }: { onReset: () => void }) {
  const reduce = useReducedMotion();
  const d = reduce ? 0 : 1;
  return (
    <motion.div className="flex flex-col items-start justify-center py-10 [grid-area:1/1]" initial={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
      <motion.div
        className="relative h-32 w-36"
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: [0.6, 1, 1, 1.05, 1], opacity: 1, y: 0 }}
        transition={{ duration: 1.1 * d || 0.2, times: [0, 0.25, 0.62, 0.72, 0.85], ease: EASE_OUT }}
        aria-hidden
      >
        <svg viewBox="0 0 160 144" className="h-full w-full overflow-visible" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M28 62 L80 44 L132 62 L80 80 Z" />
          <path d="M28 62 L80 80 L80 136 L28 118 Z" fill="#000" />
          <path d="M132 62 L80 80 L80 136 L132 118 Z" fill="#000" />
          <motion.path
            d="M28 62 L80 44 L80 20 L28 38 Z"
            fill="#000"
            style={{ transformOrigin: '28px 62px', transformBox: 'view-box' }}
            animate={{ rotate: reduce ? 0 : [0, 0, 118] }}
            transition={{ duration: 0.9 * d, times: [0, 0.6, 1], ease: EASE_OUT }}
          />
          <motion.path
            d="M132 62 L80 44 L80 20 L132 38 Z"
            fill="#000"
            style={{ transformOrigin: '132px 62px', transformBox: 'view-box' }}
            animate={{ rotate: reduce ? 0 : [0, 0, -118] }}
            transition={{ duration: 0.95 * d, times: [0, 0.62, 1], ease: EASE_OUT }}
          />
        </svg>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 * d, duration: 0.6, ease: EASE_OUT }}>
        <h3 className="type-heading mt-8 text-heading-sm sm:text-[44px]">Idea received.</h3>
        <p className="mt-3 max-w-sm text-body-lg text-fog">Thanks for helping build a smarter TIS. The council reads every suggestion.</p>
        <button type="button" onClick={onReset} className="pill-ghost mt-8">
          Send another idea
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Form ---------- */

/** `renderSuccess` swaps the thank-you panel (used by a redesign option); the form is the same. */
export function SuggestionBox({ renderSuccess }: { renderSuccess?: (o: { category: string | null; reset: () => void }) => ReactNode } = {}) {
  const reduce = useReducedMotion();
  const uid = useId();
  const shake = useAnimationControls();
  const wobble = () => {
    if (!reduce) void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
  };
  const f = useSuggestionForm({
    onInvalid: (which) => {
      wobble();
      document.getElementById(which === 'text' ? `${uid}-text` : `${uid}-cat-${CATEGORIES[0].id}`)?.focus();
    },
    onError: wobble,
  });
  const { text, category, anonymous, setAnonymous, name, setName, grade, setGrade, website, setWebsite, status, error, touched, textError, categoryError, submit, reset } = f;
  const sending = status === 'sending';

  return (
    <section id="suggestions" data-surface="dark" aria-labelledby="suggest-title" className="bg-obsidian py-20 text-paper sm:py-28">
      <div className="container-x grid gap-14 md:grid-cols-2 md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <h2 id="suggest-title" className="type-heading text-[clamp(2.25rem,4.4vw,3.25rem)]">
            What tech does TIS need?
          </h2>
          <p className="mt-8 max-w-[44ch] text-body-lg">Slow Wi-Fi in the library? An app you wish existed? Tell us. The best ideas become real projects.</p>
          <ul className="mt-10 border-t border-line-dark">
            {[
              ['Anonymous by default', 'Add your name only if you’d like a reply.'],
              ['Private', 'Only the council reads suggestions. They’re never posted publicly.'],
              ['Taken seriously', 'Popular ideas go straight into our project pipeline.'],
            ].map(([t, b]) => (
              <li key={t} className="border-b border-line-dark py-5">
                <span className="block text-body">{t}</span>
                <span className="mt-1 block text-body-sm text-fog">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <motion.div animate={shake} className="grid min-h-[600px]" style={{ perspective: 1200 }}>
          <AnimatePresence initial={false}>
            {status === 'sent' ? (
              renderSuccess ? (
                <motion.div key="success" className="[grid-area:1/1]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {renderSuccess({ category, reset })}
                </motion.div>
              ) : (
                <SuccessPanel key="success" onReset={reset} />
              )
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                className="flex flex-col [grid-area:1/1]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.2 } }
                    : {
                        // Fold the note and drop it into the box.
                        rotateX: [0, 0, 62],
                        scaleX: [1, 0.9, 0.18],
                        scaleY: [1, 0.55, 0.12],
                        y: [0, -30, 150],
                        opacity: [1, 1, 0],
                        transition: { duration: 0.75, times: [0, 0.35, 1], ease: [0.55, 0, 0.75, 0.3] },
                      }
                }
                style={{ transformOrigin: '50% 60%' }}
                aria-describedby={error ? `${uid}-error` : undefined}
              >
                {/* Honeypot: invisible to people, irresistible to bots. */}
                <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <div className="flex items-end justify-between gap-4">
                  <label htmlFor={`${uid}-text`} className="text-body">
                    Your idea
                  </label>
                  <CharRing count={text.length} />
                </div>
                <textarea
                  id={`${uid}-text`}
                  name="text"
                  required
                  maxLength={SUGGESTION_MAX + 200}
                  rows={6}
                  value={text}
                  onChange={(e) => f.setText(e.target.value)}
                  aria-invalid={touched && !!textError}
                  aria-describedby={`${uid}-text-hint`}
                  placeholder="e.g. A live board outside the gym showing which courts are free"
                  className={`${field} mt-3 resize-none py-3.5 aria-[invalid=true]:border-danger-dark`}
                />
                <p id={`${uid}-text-hint`} className={`mt-2 text-caption ${touched && textError ? 'text-danger-dark' : 'text-fog'}`}>
                  {touched && textError ? textError : `Between ${SUGGESTION_MIN} and ${SUGGESTION_MAX} characters.`}
                </p>

                <fieldset className="mt-8">
                  <legend className="text-body">Category</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const selected = category === c.id;
                      return (
                        <label key={c.id} className="relative cursor-pointer">
                          <input
                            id={`${uid}-cat-${c.id}`}
                            type="radio"
                            name="category"
                            value={c.id}
                            checked={selected}
                            onChange={() => f.setCategory(c.id)}
                            className="peer sr-only"
                          />
                          <span
                            className={`relative z-10 inline-flex min-h-[44px] items-center rounded-pill border px-5 text-body-sm transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper ${
                              selected ? 'border-paper text-obsidian' : 'border-line-dark text-paper hover:border-paper'
                            }`}
                          >
                            {selected && <motion.span layoutId={`${uid}-chip`} className="absolute inset-0 -z-10 rounded-pill bg-paper" transition={SPRING_SNAPPY} />}
                            {c.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {touched && categoryError && <p className="mt-2 text-caption text-danger-dark">{categoryError}</p>}
                </fieldset>

                <div className="mt-8 border-y border-line-dark py-5">
                  <div className="flex items-center justify-between gap-4">
                    <span id={`${uid}-anon`}>
                      <span className="block text-body">Send anonymously</span>
                      <span className="block text-body-sm text-fog">{anonymous ? 'No name attached.' : 'Add your name and grade below.'}</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={anonymous}
                      aria-labelledby={`${uid}-anon`}
                      onClick={() => setAnonymous((a) => !a)}
                      className="relative flex h-11 w-14 shrink-0 items-center justify-center"
                    >
                      <span className={`relative h-7 w-12 rounded-pill border transition-colors duration-300 ${anonymous ? 'border-paper bg-paper' : 'border-line-dark bg-transparent'}`}>
                        <motion.span className={`absolute top-[3px] h-5 w-5 rounded-full ${anonymous ? 'bg-obsidian' : 'bg-fog'}`} animate={{ left: anonymous ? 23 : 3 }} transition={SPRING_SNAPPY} />
                      </span>
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {!anonymous && (
                      <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
                        <div className="grid gap-3 pt-5 sm:grid-cols-[1fr_120px]">
                          <div>
                            <label htmlFor={`${uid}-name`} className="text-body-sm text-fog">
                              Name (optional)
                            </label>
                            <input id={`${uid}-name`} name="name" autoComplete="name" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1.5 h-12`} />
                          </div>
                          <div>
                            <label htmlFor={`${uid}-grade`} className="text-body-sm text-fog">
                              Grade (optional)
                            </label>
                            <input id={`${uid}-grade`} name="grade" inputMode="numeric" maxLength={GRADE_MAX} placeholder="e.g. 11" value={grade} onChange={(e) => setGrade(e.target.value)} className={`${field} mt-1.5 h-12`} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {status === 'error' && error && (
                    <motion.p
                      id={`${uid}-error`}
                      role="alert"
                      className="mt-6 rounded-nav border border-danger-dark/60 px-4 py-3 text-body-sm text-paper"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-auto pt-8">
                  <button type="submit" disabled={sending} className="pill-solid-dark w-full disabled:cursor-wait sm:w-auto sm:min-w-[220px]">
                    <AnimatePresence mode="wait" initial={false}>
                      {sending ? (
                        <motion.span key="sending" className="flex items-center gap-2.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                          <span className="flex gap-1" aria-hidden>
                            {[0, 1, 2].map((i) => (
                              <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-obsidian" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }} />
                            ))}
                          </span>
                          Sending
                        </motion.span>
                      ) : (
                        <motion.span key="send" className="flex items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                          Send suggestion
                          <Arrow />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
