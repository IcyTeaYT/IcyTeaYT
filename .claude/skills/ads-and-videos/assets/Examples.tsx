// Examples.tsx — three ready-to-edit ad formats, each driven by a beat list.
// Empty `src` renders a labelled placeholder, so every composition previews before you have assets.
// Register with: registerRoot(RemotionRoot) in src/index.ts (or copy the <Composition>s into your Root.tsx).
import React from 'react';
import {AbsoluteFill, Composition, Series} from 'remotion';
import {JsonAd, calculateAdMetadata, type AdSpec} from './JsonAd';
import exampleAd from './example-ad.json';
import {
  BigStat,
  Caption,
  ChartDraw,
  ClickButton,
  Footage,
  Glitch,
  Hook,
  KineticWord,
  LogoMark,
  Odometer,
  SafeZones,
  SiteShowcase,
  Strobe,
  TypingField,
  WordCaptions,
  theme,
  type WordToken,
} from './LaunchKit';

type Beat = {dur: number; caption?: string; captionTop?: string; render: (dur: number) => React.ReactNode};

const Beats: React.FC<{beats: Beat[]; bg?: string}> = ({beats, bg = theme.bg}) => (
  <AbsoluteFill style={{background: bg}}>
    <Series>
      {beats.map((b, i) => (
        <Series.Sequence key={i} durationInFrames={b.dur}>
          <AbsoluteFill>{b.render(b.dur)}</AbsoluteFill>
          {b.caption ? <Caption text={b.caption} dur={b.dur} top={b.captionTop} /> : null}
        </Series.Sequence>
      ))}
    </Series>
    <SafeZones />
  </AbsoluteFill>
);

const total = (beats: Beat[]) => beats.reduce((a, b) => a + b.dur, 0);

/* ───────── 1. Brand film ("You can't make a tech company look cool") ─────────
   Measured pacing of the reference: 4.9 s hook, then 0.4–1.3 s cuts, two strobe bursts of 0.07–0.1 s shots,
   UI + outro on black for the last ~40%. */
const brandFilm: Beat[] = [
  {dur: 147, render: (d) => <Hook text={'"You can\'t make a tech company look cool"'} dur={d} />},
  {dur: 24, caption: 'Only', render: (d) => <><Footage dur={d} label="ARCHIVE: artist at work" /><BigStat to={0.01} decimals={2} suffix="%" dur={d} /></>},
  {dur: 20, caption: 'of people', render: (d) => <Footage dur={d} label="MACRO: eye" />},
  {dur: 16, render: () => <Strobe srcs={[undefined, undefined, undefined, undefined, undefined]} labels={['FLASH 1', 'FLASH 2', 'FLASH 3', 'FLASH 4', 'FLASH 5']} />},
  {dur: 22, caption: 'actually', render: (d) => <Footage dur={d} label="ROCKET LAUNCH" />},
  {dur: 30, caption: 'change the world.', render: (d) => <Footage dur={d} label="EARTH FROM ORBIT" />},
  {dur: 24, caption: 'The builders.', render: (d) => <Footage dur={d} label="MAKER AT WORK" />},
  {dur: 22, caption: 'Because inside', render: (d) => <Footage dur={d} kind="image" label="MRI BRAIN" />},
  {dur: 30, caption: "a builder's brain,", render: (d) => <Glitch at={[16, 22, 26]}><Footage dur={d} kind="image" label="MRI BRAIN" /></Glitch>},
  {dur: 24, render: () => <Strobe srcs={Array(8).fill(undefined)} framesEach={3} />},
  {dur: 26, caption: 'wired differently.', render: (d) => <Footage dur={d} label="PLASMA BALL" />},
  {dur: 50, caption: 'But even the', captionTop: '66%', render: (d) => <ChartDraw dur={d} />},
  {dur: 55, caption: 'greatest builder', captionTop: '66%', render: (d) => <TypingField text="ship the launch post" dur={d} />},
  {dur: 55, caption: 'needs', captionTop: '66%', render: (d) => <Odometer value="$2,973,795.73" label="EARNED" dur={d} />},
  {dur: 60, caption: 'the right tool.', captionTop: '66%', render: (d) => <ClickButton label="Create Space" dur={d} />},
  {dur: 40, caption: 'yourproduct.com', captionTop: '49%', render: () => null},
  {dur: 40, caption: 'For digital builders.', captionTop: '49%', render: () => null},
  {dur: 50, render: (d) => <LogoMark dur={d} />},
];

/* ───────── 2. Showcase reel ("Cool web devs don't gatekeep… pt 5") ─────────
   Measured: 3–4.5 s per item, series title stays for the first item. */
const sites: Array<[string, string]> = [
  ['basement.studio', 'insane interactive landing page'],
  ['lenis.dev', 'the famous smooth scroll'],
  ['shadergradient.co', '3d animated backgrounds'],
  ['unicorn.studio', 'crazy inspiration sites'],
];
const showcase: Beat[] = [
  {dur: 100, render: (d) => <SiteShowcase url="vela.example" title="Cool web devs don't gatekeep…" subtitle="pt 5" dur={d} />},
  ...sites.map(([url, line]): Beat => ({dur: 110, render: (d) => <SiteShowcase url={url} title={url} subtitle={line} dur={d} />})),
  {dur: 45, render: (d) => <KineticWord text="Save this." dur={d} size={120} />},
];

/* ───────── 3. Hybrid AI ad ("Just made a $3,250 client video for $4") ─────────
   Measured: 3.2 s talking-head hook, then ~1 s AI clips with 2–3 s hero holds, 4 s end card. */
const hookWords: WordToken[] = [
  {text: 'Just', startMs: 100, endMs: 300},
  {text: 'made', startMs: 300, endMs: 520},
  {text: 'a', startMs: 520, endMs: 600},
  {text: '$3,250', startMs: 600, endMs: 1400},
  {text: 'client', startMs: 1450, endMs: 1750},
  {text: 'video', startMs: 1750, endMs: 2050},
  {text: 'for', startMs: 2050, endMs: 2250},
  {text: '$4', startMs: 2250, endMs: 3000},
];
const aiShot = (label: string, dur: number): Beat => ({dur, render: (d) => <Footage dur={d} fullBleed grade="warm" push={0.05} label={label} />});
const hybridAd: Beat[] = [
  {dur: 97, render: (d) => <><Footage dur={d} fullBleed grade="natural" push={0.02} label="YOU: talking to camera" /><WordCaptions words={hookWords} top="14%" /></>},
  aiShot('AI: factory establish', 30),
  aiShot('AI: material macro', 24),
  aiShot('AI: needle stitching macro', 30),
  aiShot('AI: embroidery forming logo', 36),
  aiShot('AI: logo macro, light sweep', 44),
  aiShot('AI: hero on pedestal, orbit', 88),
  aiShot('AI: lifestyle, city walk', 34),
  aiShot('AI: golden hour flare', 88),
  {dur: 120, render: (d) => <><Footage dur={d} fullBleed grade="warm" push={0.03} label="END FRAME" /><KineticWord text={'Comment "KREA"'} dur={d} size={96} /></>},
];

export const BrandFilm: React.FC = () => <Beats beats={brandFilm} />;
export const ShowcaseReel: React.FC = () => <Beats beats={showcase} bg="#0d0d0d" />;
export const HybridAd: React.FC = () => <Beats beats={hybridAd} />;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BrandFilm" component={BrandFilm} durationInFrames={total(brandFilm)} fps={30} width={1080} height={1920} />
    <Composition id="ShowcaseReel" component={ShowcaseReel} durationInFrames={total(showcase)} fps={30} width={1080} height={1920} />
    <Composition id="HybridAd" component={HybridAd} durationInFrames={total(hybridAd)} fps={30} width={1080} height={1920} />
    {/* Data-driven: npx remotion render Ad out/ad.mp4 --props=ad.json */}
    <Composition id="Ad" component={JsonAd} defaultProps={exampleAd as AdSpec} calculateMetadata={calculateAdMetadata} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
