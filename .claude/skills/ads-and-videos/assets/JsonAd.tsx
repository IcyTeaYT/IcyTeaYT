// JsonAd.tsx — render a whole ad from one JSON spec, so Claude Code can go script → ad.json → mp4 in one command:
//   npx remotion render Ad out/ad.mp4 --props=ad.json
// Relative paths ("clips/03_t1.mp4") resolve to public/ via staticFile(); http(s) URLs are used as-is.
import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, Series, staticFile} from 'remotion';
import {
  BigStat, Caption, ChartDraw, ClickButton, Footage, Glitch, Hook, KineticWord, LogoMark, Odometer,
  SafeZones, Sfx, SiteShowcase, Strobe, TypingField, WordCaptions, theme, type Grade, type WordToken,
} from './LaunchKit';

type Common = {dur: number; caption?: string; captionTop?: string; audio?: string; volume?: number; words?: WordToken[]; wordsTop?: string};
export type BeatSpec = Common & (
  | {type: 'hook'; src?: string; kind?: 'video' | 'image'; text: string; grade?: Grade}
  | {type: 'footage'; src?: string; kind?: 'video' | 'image'; label?: string; fullBleed?: boolean; grade?: Grade; push?: number; trimBefore?: number;
      stat?: {to: number; decimals?: number; prefix?: string; suffix?: string}; glitchAt?: number[]}
  | {type: 'strobe'; srcs: (string | null)[]; framesEach?: number; kind?: 'video' | 'image'; grade?: Grade}
  | {type: 'kinetic'; text: string; size?: number}
  | {type: 'odometer'; value: string; label?: string}
  | {type: 'chart'; title?: string; value?: string}
  | {type: 'typing'; text: string}
  | {type: 'click'; label: string; clickAt?: number}
  | {type: 'site'; src?: string; url: string; title: string; subtitle?: string}
  | {type: 'text'}
  | {type: 'logo'}
  | {type: 'blank'}
);

export type AdSpec = {
  fps?: number; width?: number; height?: number; bg?: string;
  voiceover?: string; music?: string; musicVolume?: number;
  /** Word timings (e.g. public/vo.words.json contents) for TikTok-style captions over the whole video. */
  words?: WordToken[]; wordsTop?: string;
  sfx?: {src: string; at: number; volume?: number}[];
  beats: BeatSpec[];
  showSafeZones?: boolean;
};

const asset = (p?: string | null) => (!p ? undefined : /^https?:\/\//.test(p) ? p : staticFile(p.replace(/^\/?public\//, '')));

const renderBeat = (b: BeatSpec): React.ReactNode => {
  switch (b.type) {
    case 'hook': return <Hook src={asset(b.src)} kind={b.kind} text={b.text} dur={b.dur} grade={b.grade} />;
    case 'footage': {
      const shot = <Footage src={asset(b.src)} kind={b.kind} dur={b.dur} label={b.label} fullBleed={b.fullBleed} grade={b.grade} push={b.push} trimBefore={b.trimBefore} />;
      return (
        <>
          {b.glitchAt?.length ? <Glitch at={b.glitchAt}>{shot}</Glitch> : shot}
          {b.stat ? <BigStat {...b.stat} dur={b.dur} /> : null}
        </>
      );
    }
    case 'strobe': return <Strobe srcs={b.srcs.map((s) => asset(s))} framesEach={b.framesEach} kind={b.kind} grade={b.grade} />;
    case 'kinetic': return <KineticWord text={b.text} dur={b.dur} size={b.size} />;
    case 'odometer': return <Odometer value={b.value} label={b.label} dur={b.dur} />;
    case 'chart': return <ChartDraw dur={b.dur} title={b.title} value={b.value} />;
    case 'typing': return <TypingField text={b.text} dur={b.dur} />;
    case 'click': return <ClickButton label={b.label} dur={b.dur} clickAt={b.clickAt} />;
    case 'site': return <SiteShowcase src={asset(b.src)} url={b.url} title={b.title} subtitle={b.subtitle} dur={b.dur} />;
    default: return null; // 'text' | 'logo' | 'blank' handled below / caption-only
  }
};

export const JsonAd: React.FC<AdSpec> = (spec) => (
  <AbsoluteFill style={{background: spec.bg ?? theme.bg}}>
    <Series>
      {spec.beats.map((b, i) => (
        <Series.Sequence key={i} durationInFrames={b.dur}>
          <AbsoluteFill>{b.type === 'logo' ? <LogoMark dur={b.dur} /> : renderBeat(b)}</AbsoluteFill>
          {b.caption ? <Caption text={b.caption} dur={b.dur} top={b.captionTop ?? (b.type === 'text' ? '49%' : undefined)} /> : null}
          {b.words?.length ? <WordCaptions words={b.words} top={b.wordsTop} /> : null}
          {b.audio ? <Audio src={asset(b.audio)!} volume={b.volume ?? 1} /> : null}
        </Series.Sequence>
      ))}
    </Series>
    {spec.words?.length ? <WordCaptions words={spec.words} top={spec.wordsTop} /> : null}
    {spec.voiceover ? <Audio src={asset(spec.voiceover)!} /> : null}
    {spec.music ? <Audio src={asset(spec.music)!} volume={spec.musicVolume ?? 0.35} /> : null}
    {(spec.sfx ?? []).map((s, i) => <Sfx key={i} src={asset(s.src)!} at={s.at} volume={s.volume} />)}
    {spec.showSafeZones !== false ? <SafeZones /> : null}
  </AbsoluteFill>
);

export const calculateAdMetadata: CalculateMetadataFunction<AdSpec> = ({props}) => ({
  durationInFrames: Math.max(1, props.beats.reduce((a, b) => a + b.dur, 0)),
  fps: props.fps ?? 30,
  width: props.width ?? 1080,
  height: props.height ?? 1920,
});
