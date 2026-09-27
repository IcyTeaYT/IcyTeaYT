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
    <span className="relative inline-block h-[1em] w-[0.6em] overflow-hidden">
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

function Unit({ value, label }: { value: number; label: string }) {
  const digits = String(value).padStart(2, '0').split('');
  return (
    <div className="flex flex-col">
      <span className="flex text-[clamp(2.5rem,5vw,3.5rem)] font-light leading-none tracking-[-0.05em] tabular">
        {digits.map((d, i) => (
          <Digit key={digits.length - i} value={d} />
        ))}
      </span>
      <span className="mt-2 text-caption text-fog">{label}</span>
    </div>
  );
}

interface Props {
  start: string;
  end: string;
  timezoneLabel: string;
}

/** Live countdown to an event; switches to "Happening now" and then "complete". */
export function Countdown({ start, end, timezoneLabel }: Props) {
  const now = useNow();
  const phase = getPhase(now, start, end);

  if (phase !== 'before') {
    return (
      <p className="text-subheading font-light" role="status">
        {phase === 'during' ? 'Happening now' : 'Conference complete'}
      </p>
    );
  }

  const s = Math.floor(Math.max(0, Date.parse(start) - now) / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);

  return (
    <div>
      <p className="sr-only">
        {days} days, {hours} hours and {mins} minutes until the conference ({timezoneLabel}).
      </p>
      <div className="flex gap-8 sm:gap-10" aria-hidden>
        <Unit value={days} label="Days" />
        <Unit value={hours} label="Hours" />
        <Unit value={mins} label="Minutes" />
        <Unit value={s % 60} label="Seconds" />
      </div>
    </div>
  );
}
