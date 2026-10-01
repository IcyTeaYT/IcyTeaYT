// LaunchKit.tsx — building blocks for ads, reels and launch films in Remotion 4 (tested on 4.0.530).
// Copy into src/ of a Remotion project. Most components take `dur` (frames) so fades
// line up with the <Series.Sequence> they sit in. Typechecks under `strict`.
import React, {useId} from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  getRemotionEnvironment,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont} from '@remotion/fonts';

// Inter variable font shipped in public/fonts by `adkit init` — no network needed at render time.
const fontFamily = 'Inter';
loadFont({family: fontFamily, url: staticFile('fonts/Inter.woff2'), weight: '100 900'}).catch(() => {
  // Missing file → falls back to system sans-serif instead of failing the render.
});

export const theme = {
  bg: '#000000',
  fg: '#EDEDED',
  dim: 'rgba(237,237,237,0.5)',
  line: 'rgba(255,255,255,0.12)',
  card: '#0B0B0C',
  font: `${fontFamily}, "Helvetica Neue", Arial, sans-serif`,
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Opacity that fades in over `inF` frames and out over the last `outF` frames. */
export const useFade = (dur: number, inF = 5, outF = 4) => {
  const f = useCurrentFrame();
  return Math.min(
    interpolate(f, [0, inF], [0, 1], clamp),
    interpolate(f, [dur - outF, dur], [1, 0], clamp),
  );
};

/* ───────────────────────── Captions ───────────────────────── */

/** Tiny, understated caption under the visual. This restraint is the whole look. */
export const Caption: React.FC<{text: string; dur: number; top?: string; size?: number}> = ({
  text,
  dur,
  top = '57%',
  size,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const o = useFade(dur, 5, 4);
  const blur = interpolate(frame, [0, 6], [6, 0], clamp);
  const y = interpolate(frame, [0, 8], [8, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top,
          width: '100%',
          textAlign: 'center',
          color: theme.fg,
          fontFamily,
          fontWeight: 500,
          fontSize: size ?? width * 0.024,
          letterSpacing: '-0.01em',
          opacity: o,
          filter: `blur(${blur}px)`,
          transform: `translateY(${y}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Bold social "hook" caption over full-bleed footage (first 1.5–2.5 s of the video). */
export const Hook: React.FC<{src?: string; kind?: 'video' | 'image'; text: string; dur: number; grade?: Grade}> = ({
  src,
  kind = 'video',
  text,
  dur,
  grade = 'natural',
}) => {
  const {width} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Footage src={src} kind={kind} dur={dur} fullBleed grade={grade} push={0.03} label="HOOK: you on camera / at desk" />
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '10%',
          right: '10%',
          textAlign: 'center',
          color: '#fff',
          fontFamily,
          fontWeight: 700,
          fontSize: width * 0.055,
          lineHeight: 1.15,
          textShadow: '0 2px 14px rgba(0,0,0,0.65)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── Footage ───────────────────────── */

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.16}) => {
  const frame = useCurrentFrame();
  const id = 'grain' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'overlay', opacity}}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
};

export type Grade = 'bw' | 'warm' | 'cool' | 'natural' | 'none';
const GRADES: Record<Grade, string | undefined> = {
  bw: 'grayscale(1) contrast(1.25) brightness(0.92)',
  warm: 'sepia(0.18) saturate(1.12) contrast(1.08)',
  cool: 'saturate(0.88) hue-rotate(-8deg) contrast(1.1) brightness(0.95)',
  natural: 'contrast(1.05) saturate(1.03)',
  none: undefined,
};

type FootageProps = {
  /** staticFile('clips/x.mp4'). Leave empty to render a labelled placeholder. */
  src?: string;
  kind?: 'video' | 'image';
  dur: number;
  /** Width/height of the letterboxed band. 16/9 default, 2.39 for extra-cinematic. */
  aspect?: number;
  fullBleed?: boolean;
  /** Black & white, crushed contrast. On by default: it unifies mismatched stock. Ignored if `grade` is set. */
  bw?: boolean;
  /** One grade for every clip in a video makes mixed sources (stock, AI, phone) feel like one shoot. */
  grade?: Grade;
  /** Set false for very short shots (strobes) so they don't dip to black. */
  fade?: boolean;
  /** Slow push-in amount over the shot. */
  push?: number;
  trimBefore?: number;
  label?: string;
};

export const Footage: React.FC<FootageProps> = ({
  src,
  kind = 'video',
  dur,
  aspect = 16 / 9,
  fullBleed = false,
  bw = true,
  grade,
  fade = true,
  push = 0.06,
  trimBefore,
  label = 'FOOTAGE',
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const scale = interpolate(frame, [0, dur], [1, 1 + push], clamp);
  const fadeO = useFade(dur, 2, 2);
  const o = fade ? fadeO : 1;
  const filter = GRADES[grade ?? (bw ? 'bw' : 'none')];
  const h = width / aspect;
  const cover = {width: '100%', height: '100%', objectFit: 'cover' as const};

  let media: React.ReactNode;
  if (!src) {
    media = (
      <div style={{...cover, background: 'linear-gradient(135deg,#2a2a2a,#111)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777', fontFamily, fontSize: width * 0.028, letterSpacing: '0.08em'}}>
        {label}
      </div>
    );
  } else if (kind === 'image') {
    media = <Img src={src} style={cover} />;
  } else {
    media = <OffthreadVideo src={src} muted trimBefore={trimBefore} style={cover} />;
  }

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: o}}>
      <div style={{position: 'relative', width: fullBleed ? '100%' : width, height: fullBleed ? '100%' : h, overflow: 'hidden'}}>
        <div style={{width: '100%', height: '100%', transform: `scale(${scale})`, filter}}>
          {media}
        </div>
        <Grain />
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)'}} />
      </div>
    </AbsoluteFill>
  );
};

/** Horizontal slice-shift glitch around given frames (e.g. on a VO beat like "wired differently"). */
export const Glitch: React.FC<{at: number[]; children: React.ReactNode; strength?: number; slices?: number}> = ({
  at,
  children,
  strength = 0.06,
  slices = 10,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const g = Math.max(0, ...at.map((a) => 1 - Math.abs(frame - a) / 3));
  if (g <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      {Array.from({length: slices}).map((_, i) => {
        const top = (i / slices) * 100;
        const bottom = 100 - ((i + 1) / slices) * 100;
        const dx = (random(`g-${i}-${frame}`) - 0.5) * 2 * strength * width * g;
        return (
          <AbsoluteFill key={i} style={{clipPath: `inset(${top}% 0 ${bottom}% 0)`, transform: `translateX(${dx}px)`, filter: `brightness(${1 + g * 0.4})`}}>
            {children}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/* ───────────────────────── Numbers ───────────────────────── */

/** Counts a number up (e.g. 0 → 0.01%). Works well centred over footage. */
export const BigStat: React.FC<{to: number; from?: number; decimals?: number; prefix?: string; suffix?: string; dur: number; countFrames?: number; size?: number}> = ({
  to,
  from = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  dur,
  countFrames = 18,
  size,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const v = interpolate(frame, [0, countFrames], [from, to], {...clamp, easing: Easing.out(Easing.exp)});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 2, 3)}}>
      <div style={{color: '#fff', fontFamily, fontWeight: 600, fontSize: size ?? width * 0.075, fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 20px rgba(0,0,0,0.5)'}}>
        {prefix}
        {v.toFixed(decimals)}
        {suffix}
      </div>
    </AbsoluteFill>
  );
};

/** Slot-machine rolling digits, e.g. value="$2,973,795.73" label="EARNED". */
export const Odometer: React.FC<{value: string; label?: string; dur: number; size?: number; stagger?: number}> = ({
  value,
  label,
  dur,
  size,
  stagger = 1.5,
}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const fs = size ?? width * 0.045;
  const lh = fs * 1.15;
  const chars = value.split('');
  const nDigits = chars.filter((c) => /\d/.test(c)).length;
  // Fit the roll inside the beat: every digit lands, then the final number holds for ~0.4 s.
  const hold = Math.min(14, Math.round(dur * 0.3));
  const rollFrames = Math.max(10, dur - hold - (nDigits - 1) * stagger);
  let k = 0;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 4, 5)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: fs * 0.45, fontFamily, color: theme.fg}}>
        <div style={{display: 'flex', fontSize: fs, fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: `${lh}px`, height: lh}}>
          {chars.map((c, i) => {
            if (!/\d/.test(c)) return <span key={i}>{c}</span>;
            const idx = k++;
            const spins = 1 + Math.floor((nDigits - idx) / 3);
            const p = spring({frame: frame - idx * stagger, fps, config: {damping: 28, stiffness: 70}, durationInFrames: rollFrames});
            const pos = interpolate(p, [0, 1], [0, spins * 10 + Number(c)]) % 10;
            return (
              <span key={i} style={{display: 'inline-block', height: lh, overflow: 'hidden'}}>
                <span style={{display: 'block', transform: `translateY(${-pos * lh}px)`, filter: `blur(${(1 - p) * 2}px)`}}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, j) => (
                    <span key={j} style={{display: 'block', height: lh}}>{d}</span>
                  ))}
                </span>
              </span>
            );
          })}
        </div>
        {label ? <div style={{fontSize: fs * 0.42, letterSpacing: '0.1em', color: theme.dim, fontWeight: 500}}>{label}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── Product UI (rebuilt in code, never screenshots) ───────────────────────── */

const Card: React.FC<{children: React.ReactNode; w?: number; style?: React.CSSProperties}> = ({children, w = 0.78, style}) => {
  const {width} = useVideoConfig();
  return (
    <div style={{width: width * w, background: theme.card, border: `1px solid ${theme.line}`, borderRadius: width * 0.018, padding: width * 0.03, fontFamily, color: theme.fg, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', ...style}}>
      {children}
    </div>
  );
};

/** Card slides up + unblurs. Wrap any UI moment in this. */
export const UIReveal: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 200}});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 4, 4)}}>
      <div style={{transform: `translateY(${(1 - p) * height * 0.03}px) scale(${0.97 + p * 0.03})`, filter: `blur(${(1 - p) * 8}px)`}}>{children}</div>
    </AbsoluteFill>
  );
};

/** Area chart that draws itself. `seed` changes the shape. */
export const ChartDraw: React.FC<{dur: number; title?: string; value?: string; seed?: string}> = ({dur, title = 'Revenue', value = '$48,210', seed = 'c'}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const w = width * 0.72;
  const h = width * 0.28;
  const pts = Array.from({length: 24}, (_, i) => {
    const trend = i / 23;
    const y = h * (0.85 - trend * 0.5 - (random(`${seed}${i}`) - 0.5) * 0.35);
    return [(i / 23) * w, Math.max(4, Math.min(h - 4, y))];
  });
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const p = interpolate(frame, [4, 34], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const gid = 'cg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <UIReveal dur={dur}>
      <Card>
        <div style={{fontSize: width * 0.02, color: theme.dim}}>{title}</div>
        <div style={{fontSize: width * 0.04, fontWeight: 600, margin: `${width * 0.006}px 0 ${width * 0.02}px`}}>{value}</div>
        <svg width={w} height={h}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity={0.25} />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} opacity={p} />
          <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray={1} strokeDashoffset={1 - p} />
        </svg>
      </Card>
    </UIReveal>
  );
};

/** Composer box that types text with a blinking caret. */
export const TypingField: React.FC<{text: string; dur: number; cps?: number; delay?: number}> = ({text, dur, cps = 18, delay = 8}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const n = Math.max(0, Math.floor(((frame - delay) * cps) / fps));
  const caret = Math.floor(frame / 8) % 2 === 0;
  const s = width * 0.034;
  return (
    <UIReveal dur={dur}>
      <Card>
        <div style={{display: 'flex', alignItems: 'center', gap: s * 0.5, fontSize: width * 0.026}}>
          <div style={{width: s, height: s, borderRadius: '50%', background: 'linear-gradient(135deg,#888,#333)'}} />
          <span>
            {text.slice(0, n)}
            <span style={{opacity: caret ? 1 : 0, marginLeft: 2}}>|</span>
          </span>
        </div>
        <div style={{display: 'flex', gap: s * 0.45, marginTop: s * 0.8, borderTop: `1px solid ${theme.line}`, paddingTop: s * 0.5}}>
          {Array.from({length: 7}).map((_, i) => (
            <div key={i} style={{width: s * 0.5, height: s * 0.5, borderRadius: 4, border: `1px solid ${theme.line}`}} />
          ))}
        </div>
      </Card>
    </UIReveal>
  );
};

/** Silver pill button; cursor glides in and clicks at `clickAt` with press + ripple. */
export const ClickButton: React.FC<{label: string; dur: number; clickAt?: number}> = ({label, dur, clickAt = 24}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const fs = width * 0.03;
  const move = interpolate(frame, [4, clickAt - 2], [0, 1], {...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1)});
  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 5], [1, 0.93, 1], clamp);
  const ring = interpolate(frame, [clickAt, clickAt + 16], [0, 1], clamp);
  const cx = interpolate(move, [0, 1], [width * 0.22, fs * 0.8]);
  const cy = interpolate(move, [0, 1], [height * 0.12, fs * 0.3]);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 4, 5)}}>
      <div style={{position: 'absolute', width: width * 0.6, height: width * 0.3, background: 'radial-gradient(ellipse, rgba(255,255,255,0.10), transparent 70%)'}} />
      <div style={{position: 'relative', transform: `scale(${press})`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 12, border: '2px solid rgba(255,255,255,0.6)', transform: `scale(${1 + ring * 0.6})`, opacity: ring > 0 ? 1 - ring : 0}} />
        <div style={{fontFamily, fontWeight: 600, fontSize: fs, color: '#111', padding: `${fs * 0.55}px ${fs * 1.1}px`, borderRadius: 12, background: 'linear-gradient(180deg,#f5f5f6,#b9b9be)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 40px rgba(255,255,255,0.12)'}}>
          {label}
        </div>
        <svg width={fs * 1.1} height={fs * 1.1} viewBox="0 0 24 24" style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(${cx}px, ${cy}px)`}}>
          <path d="M4 2l15 10.5-6.8 1.2 3.9 7.3-2.6 1.4-3.9-7.3L4 20z" fill="#fff" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── Outro ───────────────────────── */

/** Two corner brackets that spin and snap together. Swap for your real logo SVG when you have one. */
export const LogoMark: React.FC<{dur: number; size?: number}> = ({dur, size}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const s = size ?? width * 0.07;
  const p = spring({frame, fps, config: {damping: 14, stiffness: 120}});
  const spread = (1 - p) * s * 0.6;
  const rot = interpolate(p, [0, 1], [-90, 0]);
  const b = Math.max(3, s * 0.1);
  const corner: React.CSSProperties = {position: 'absolute', width: s * 0.45, height: s * 0.45, borderColor: '#fff', borderStyle: 'solid'};
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 3, 6)}}>
      <div style={{position: 'relative', width: s, height: s, transform: `rotate(${rot}deg)`}}>
        <div style={{...corner, top: -spread, left: -spread, borderWidth: `${b}px 0 0 ${b}px`}} />
        <div style={{...corner, bottom: -spread, right: -spread, borderWidth: `0 ${b}px ${b}px 0`}} />
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── Showcase-reel format ("devs don't gatekeep") ───────────────────────── */

/** Screen recording in a browser frame with handheld wobble + TikTok-style caption box. */
export const SiteShowcase: React.FC<{src?: string; url: string; title: string; subtitle?: string; dur: number}> = ({src, url, title, subtitle, dur}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const wob = Math.sin(frame / 11) * 0.4;
  const dy = Math.sin(frame / 7) * 3;
  const w = width * 0.94;
  return (
    <AbsoluteFill style={{background: '#0d0d0d', justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 2, 2)}}>
      <div style={{width: w, transform: `rotate(${wob}deg) translateY(${dy}px)`, borderRadius: 14, overflow: 'hidden', border: '1px solid #2a2a2a', boxShadow: '0 40px 120px rgba(0,0,0,0.8)'}}>
        <div style={{height: w * 0.045, background: '#1b1b1d', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{width: 11, height: 11, borderRadius: '50%', background: c}} />
          ))}
          <div style={{flex: 1, textAlign: 'center', color: '#8a8a8a', fontFamily, fontSize: w * 0.018}}>{url}</div>
        </div>
        <div style={{height: w * 0.62, position: 'relative'}}>
          <Footage src={src} dur={dur} fullBleed bw={false} push={0.02} label={url} />
        </div>
      </div>
      <div style={{position: 'absolute', top: '17%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: width * 0.042, color: '#fff', lineHeight: 1.25}}>
        {[title, subtitle].filter(Boolean).map((t) => (
          <div key={t} style={{background: 'rgba(0,0,0,0.85)', padding: '2px 12px', borderRadius: 8, margin: 2}}>
            {t}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── Social-native pieces ───────────────────────── */

/** Word timing, e.g. from Whisper / @remotion/captions. Times are relative to where this component is mounted. */
export type WordToken = {text: string; startMs: number; endMs: number};

/**
 * TikTok-style captions: 1–3 words at a time, current word highlighted with a small pop.
 * Pages break on pauses > 350 ms so captions follow the speaker's phrasing.
 */
export const WordCaptions: React.FC<{words: WordToken[]; maxWords?: number; top?: string; size?: number; highlight?: string; uppercase?: boolean}> = ({
  words,
  maxWords = 3,
  top = '64%',
  size,
  highlight = '#FFE14D',
  uppercase = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const pages: WordToken[][] = [];
  let cur: WordToken[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length >= maxWords || (prev && w.startMs - prev.endMs > 350)) {
      pages.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) pages.push(cur);
  const page = pages.find((p) => ms >= p[0].startMs && ms < p[p.length - 1].endMs + 120);
  if (!page) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top, left: '8%', right: '8%', textAlign: 'center', fontFamily, fontWeight: 800, fontSize: size ?? width * 0.066, lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: uppercase ? 'uppercase' : undefined}}>
        {page.map((w, i) => {
          const active = ms >= w.startMs && ms < w.endMs;
          const pop = spring({frame: frame - Math.round((w.startMs / 1000) * fps), fps, config: {damping: 12, stiffness: 220}, durationInFrames: 8});
          return (
            <span key={i} style={{display: 'inline-block', margin: '0 0.16em', color: active ? highlight : '#fff', transform: `scale(${active ? 0.92 + 0.08 * pop : 1})`, textShadow: '0 4px 14px rgba(0,0,0,0.55), 0 0 3px rgba(0,0,0,0.9)'}}>
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** One huge word per beat — kinetic typography for footage-free ads. */
export const KineticWord: React.FC<{text: string; dur: number; size?: number; color?: string; italic?: boolean}> = ({text, dur, size, color = '#fff', italic = false}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 200}, durationInFrames: 10});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: useFade(dur, 2, 3)}}>
      <div style={{fontFamily, fontWeight: 700, fontStyle: italic ? 'italic' : undefined, fontSize: size ?? width * 0.13, letterSpacing: '-0.05em', color, transform: `scale(${1.08 - 0.08 * p})`, filter: `blur(${(1 - p) * 10}px)`, textAlign: 'center', lineHeight: 0.95, padding: '0 6%'}}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Flicker montage: cycles clips/images every few frames (the 0.07–0.1 s bursts in brand films). */
export const Strobe: React.FC<{srcs: (string | undefined)[]; framesEach?: number; kind?: 'video' | 'image'; grade?: Grade; labels?: string[]}> = ({
  srcs,
  framesEach = 3,
  kind = 'image',
  grade = 'bw',
  labels = [],
}) => {
  const frame = useCurrentFrame();
  const i = Math.floor(frame / framesEach) % Math.max(1, srcs.length);
  return <Footage key={i} src={srcs[i]} kind={kind} dur={framesEach} grade={grade} fade={false} push={0} label={labels[i] ?? `STROBE ${i + 1}`} />;
};

/** Sound effect at a frame offset: <Sfx src={staticFile('sfx/click.mp3')} at={24} /> */
export const Sfx: React.FC<{src: string; at: number; volume?: number}> = ({src, at, volume = 0.8}) => (
  <Sequence from={at} layout="none">
    <Audio src={src} volume={volume} />
  </Sequence>
);

/** Shows where TikTok/Reels UI covers the frame. Visible in Studio only, never in renders. */
export const SafeZones: React.FC = () => {
  if (!getRemotionEnvironment().isStudio) return null;
  const zone = (style: React.CSSProperties) => <div style={{position: 'absolute', background: 'rgba(255,0,80,0.18)', border: '1px dashed rgba(255,0,80,0.6)', ...style}} />;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {zone({left: 0, right: 0, top: 0, height: '8%'})}
      {zone({left: 0, right: 0, bottom: 0, height: '20%'})}
      {zone({right: 0, top: '38%', width: '13%', height: '42%'})}
    </AbsoluteFill>
  );
};
