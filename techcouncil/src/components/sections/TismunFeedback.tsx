import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useId, useState, type FormEvent } from 'react';
import { FEEDBACK_COMMENT_MAX, FEEDBACK_NAME_MAX, FEEDBACK_ROLES, type FeedbackRole } from '@/data/feedback';
import { Arrow } from '../ui/Arrow';
import { Eyebrow } from '../brand/Shapes';
import { EASE_OUT, SPRING_SNAPPY } from '@/lib/motion';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const field =
  'block w-full rounded-nav border border-line-dark bg-transparent px-4 text-body text-paper placeholder:text-fog/70 transition-colors duration-300 focus:border-paper focus:outline-none';

const WORDS = ['', 'Poor', 'Okay', 'Good', 'Great', 'Amazing'];

function Star({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden>
      <path
        d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
        fill={on ? '#F2942C' : 'none'}
        stroke={on ? '#F2942C' : 'rgba(255,255,255,0.4)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Feedback on TISMUN 2026: a rating, who you are, and anything you'd like to say. */
export function TismunFeedback() {
  const reduce = useReducedMotion();
  const uid = useId();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState<FeedbackRole | null>(null);
  const [comment, setComment] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const shake = useAnimationControls();

  const errors = {
    rating: rating ? null : 'Pick a rating.',
    name: name.trim() ? null : 'Add your name.',
    role: role ? null : 'Pick your role.',
    comment: comment.trim().length > FEEDBACK_COMMENT_MAX ? `Please keep it under ${FEEDBACK_COMMENT_MAX} characters.` : null,
  };

  const nudge = () => {
    if (!reduce) void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (errors.rating || errors.name || errors.role || errors.comment) {
      setError(null);
      setStatus('idle');
      nudge();
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/tismun-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, name: name.trim(), role, comment: comment.trim(), website }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong on our side. Please try again in a minute.');
        setStatus('error');
        nudge();
        return;
      }
      setStatus('sent');
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
      setStatus('error');
      nudge();
    }
  };

  const reset = () => {
    setRating(0);
    setName('');
    setRole(null);
    setComment('');
    setTouched(false);
    setError(null);
    setStatus('idle');
  };

  const shown = hover || rating;
  const sending = status === 'sending';

  return (
    <section id="tismun-feedback" data-surface="dark" aria-labelledby="feedback-title" className="border-t border-line-dark bg-obsidian py-20 text-paper sm:py-28">
      <div className="container-x grid gap-14 md:grid-cols-2 md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <Eyebrow tone="dark">TISMUN 2026</Eyebrow>
          <h2 id="feedback-title" className="type-heading mt-4 text-[clamp(2.25rem,4.4vw,3.25rem)]">
            How was TISMUN?
          </h2>
          <p className="mt-8 max-w-[44ch] text-body-lg">Delegate, chair, staff or guest: tell us what worked and what didn’t. It shapes next year’s conference and the platform behind it.</p>
          <ul className="mt-10 border-t border-line-dark">
            {[
              ['Takes a minute', 'A rating, your name and role. The comment is optional.'],
              ['Read by the team', 'Every response goes straight to the organisers.'],
              ['Private', 'Feedback is never posted publicly.'],
            ].map(([t, b]) => (
              <li key={t} className="border-b border-line-dark py-5">
                <span className="block text-body">{t}</span>
                <span className="mt-1 block text-body-sm text-fog">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <motion.div animate={shake} className="grid">
          <AnimatePresence initial={false} mode="wait">
            {status === 'sent' ? (
              <motion.div key="done" className="flex flex-col items-start justify-center py-10" role="status" aria-live="polite" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
                <div className="flex gap-1" aria-hidden>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.span key={i} initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...SPRING_SNAPPY, delay: i * 0.07 }}>
                      <Star on={i <= rating} />
                    </motion.span>
                  ))}
                </div>
                <h3 className="type-heading mt-8 text-heading-sm sm:text-[44px]">Thank you.</h3>
                <p className="mt-3 max-w-sm text-body-lg text-fog">Your feedback is with the TISMUN team. It helps make next year even better.</p>
                <button type="button" onClick={reset} className="pill-ghost mt-8">
                  Send more feedback
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} noValidate className="flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <fieldset>
                  <legend className="text-body">Your rating</legend>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex" onMouseLeave={() => setHover(0)}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <label key={i} className="cursor-pointer p-1" onMouseEnter={() => setHover(i)}>
                          <input type="radio" name="rating" value={i} checked={rating === i} onChange={() => setRating(i)} className="peer sr-only" aria-label={`${i} out of 5: ${WORDS[i]}`} />
                          <span className="block rounded-[6px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-paper">
                            <Star on={i <= shown} />
                          </span>
                        </label>
                      ))}
                    </div>
                    <span className="text-body text-fog" aria-hidden>
                      {WORDS[shown]}
                    </span>
                  </div>
                  {touched && errors.rating && <p className="mt-2 text-caption text-danger-dark">{errors.rating}</p>}
                </fieldset>

                <div className="mt-8">
                  <label htmlFor={`${uid}-name`} className="text-body">
                    Your name
                  </label>
                  <input
                    id={`${uid}-name`}
                    name="name"
                    autoComplete="name"
                    maxLength={FEEDBACK_NAME_MAX}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={touched && !!errors.name}
                    className={`${field} mt-3 h-12 aria-[invalid=true]:border-danger-dark`}
                  />
                  {touched && errors.name && <p className="mt-2 text-caption text-danger-dark">{errors.name}</p>}
                </div>

                <fieldset className="mt-8">
                  <legend className="text-body">You were a</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FEEDBACK_ROLES.map((r) => {
                      const selected = role === r.id;
                      return (
                        <label key={r.id} className="relative cursor-pointer">
                          <input type="radio" name="role" value={r.id} checked={selected} onChange={() => setRole(r.id)} className="peer sr-only" />
                          <span
                            className={`relative z-10 inline-flex min-h-[44px] items-center rounded-pill border px-5 text-body-sm transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper ${
                              selected ? 'border-paper text-obsidian' : 'border-line-dark text-paper hover:border-paper'
                            }`}
                          >
                            {selected && <motion.span layoutId={`${uid}-role`} className="absolute inset-0 -z-10 rounded-pill bg-paper" transition={SPRING_SNAPPY} />}
                            {r.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {touched && errors.role && <p className="mt-2 text-caption text-danger-dark">{errors.role}</p>}
                </fieldset>

                <div className="mt-8">
                  <div className="flex items-end justify-between gap-4">
                    <label htmlFor={`${uid}-comment`} className="text-body">
                      Anything to tell us? <span className="text-fog">(optional)</span>
                    </label>
                    <span className="text-caption tabular text-fog">
                      {comment.length}/{FEEDBACK_COMMENT_MAX}
                    </span>
                  </div>
                  <textarea
                    id={`${uid}-comment`}
                    name="comment"
                    rows={5}
                    maxLength={FEEDBACK_COMMENT_MAX + 200}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. The committee sessions ran smoothly, but the schedule was hard to find"
                    className={`${field} mt-3 resize-none py-3.5`}
                  />
                  {touched && errors.comment && <p className="mt-2 text-caption text-danger-dark">{errors.comment}</p>}
                </div>

                <AnimatePresence>
                  {status === 'error' && error && (
                    <motion.p role="alert" className="mt-6 rounded-nav border border-danger-dark/60 px-4 py-3 text-body-sm text-paper" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="pt-8">
                  <button type="submit" disabled={sending} className="pill-solid-dark w-full disabled:cursor-wait sm:w-auto sm:min-w-[220px]">
                    {sending ? 'Sending…' : (
                      <span className="flex items-center gap-3">
                        Send feedback
                        <Arrow />
                      </span>
                    )}
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
