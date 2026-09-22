/**
 * A short two-note chime for time-up. Synthesised rather than shipped as an
 * audio file so the whole site stays one bundle with no extra request.
 *
 * Browsers refuse to start audio without a user gesture, so the context is
 * created lazily on the first chime — by which point the chair has already
 * clicked Start.
 */

let context: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function note(ctx: AudioContext, frequency: number, startAt: number, duration: number, peak: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  // Ramped rather than switched, so it reads as a soft chime, not a beep.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.05);
}

export function playChime(): void {
  const ctx = ensureContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  note(ctx, 880, now, 0.42, 0.13); // A5
  note(ctx, 1174.66, now + 0.16, 0.5, 0.1); // D6
}
