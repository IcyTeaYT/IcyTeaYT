import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { EASE_OUT } from '@/lib/motion';

type Phase = 'before' | 'during' | 'after';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function getPhase(now: number, start: string, end: string): Phase {
  if (now < Date.parse(start)) return 'before';
  if (now < Date.parse(end)) return 'during';
  return 'after';
}

function Digit({ value }: { value: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="absolute inset-0 flex items-center justify-center"
          initial={reduce ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Unit({ value, label, pad = 2 }: { value: number; label: string; pad?: number }) {
  const digits = String(value).padStart(pad, '0').split('');
  return (
    <div className="flex flex-col items-center">
      <span className="flex font-mono text-[clamp(1.8rem,3.6vw,2.6rem)] font-medium leading-none tracking-tight text-paper tabular">
        {digits.map((d, i) => (
          <Digit key={digits.length - i} value={d} />
        ))}
      </span>
      <span className="mt-2 font-mono text-[12px] text-fog-300">{label}</span>
    </div>
  );
}

interface Props {
  start: string;
  end: string;
  timezoneLabel: string;
  accent: string;
}

/** Live countdown to an event; switches to "Happening now" and then "complete". */
export function Countdown({ start, end, timezoneLabel, accent }: Props) {
  const now = useNow();
  const phase = getPhase(now, start, end);

  if (phase !== 'before') {
    const live = phase === 'during';
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3" role="status">
        <span className="relative flex h-2.5 w-2.5">
          {live && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: accent }} />}
          <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: live ? accent : '#7C8AA8' }} />
        </span>
        <span className="font-display text-lg font-semibold text-paper">{live ? 'Happening now' : 'Conference complete'}</span>
      </div>
    );
  }

  const diff = Math.max(0, Date.parse(start) - now);
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  return (
    <div>
      <p className="sr-only" aria-live="off">
        {days} days, {hours} hours and {mins} minutes until the conference ({timezoneLabel}).
      </p>
      <div className="flex items-start gap-3 sm:gap-5" aria-hidden>
        <Unit value={days} label="Days" />
        <span className="font-display text-3xl leading-none text-fog-400">:</span>
        <Unit value={hours} label="Hours" />
        <span className="font-display text-3xl leading-none text-fog-400">:</span>
        <Unit value={mins} label="Min" />
        <span className="font-display text-3xl leading-none text-fog-400">:</span>
        <Unit value={secs} label="Sec" />
      </div>
    </div>
  );
}
