import { useState, type FormEvent } from 'react';
import { SUGGESTION_MAX, SUGGESTION_MIN, type CategoryId } from '@/data/categories';

export type SuggestionStatus = 'idle' | 'sending' | 'sent' | 'error';

/**
 * State, validation and sending for the suggestion form, shared by every
 * design of the form. `onInvalid` lets a design react (shake, focus) when a
 * submit is refused; it receives which field to focus.
 */
export function useSuggestionForm({ onInvalid, onError }: { onInvalid?: (field: 'text' | 'category') => void; onError?: () => void } = {}) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<SuggestionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

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
    onError?.();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (textError || categoryError) {
      // Field problems show next to the field; the banner is for server errors.
      setError(null);
      setStatus('idle');
      onInvalid?.(textError ? 'text' : 'category');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, category, name: anonymous ? '' : name.trim(), grade: anonymous ? '' : grade.trim(), website }),
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

  const clearError = () => {
    if (status === 'error') setStatus('idle');
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

  return {
    text,
    setText: (v: string) => {
      setText(v);
      clearError();
    },
    category,
    setCategory: (v: CategoryId) => {
      setCategory(v);
      clearError();
    },
    anonymous,
    setAnonymous,
    name,
    setName,
    grade,
    setGrade,
    website,
    setWebsite,
    status,
    error,
    touched,
    textError,
    categoryError,
    sending: status === 'sending',
    submit,
    reset,
  };
}

/** Days/hours/minutes/seconds until `start`, and which phase the event is in. */
export function countdownParts(now: number, start: string, end: string) {
  const phase: 'before' | 'during' | 'after' = now < Date.parse(start) ? 'before' : now < Date.parse(end) ? 'during' : 'after';
  const s = Math.floor(Math.max(0, Date.parse(start) - now) / 1000);
  return { phase, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
}
