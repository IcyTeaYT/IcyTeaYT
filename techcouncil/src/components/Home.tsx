import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Intro } from './Intro';
import { Navbar } from './Navbar';
import { Hero } from './sections/Hero';
import { Statement } from './sections/Statement';
import { Faq } from './sections/Faq';
import { AnnouncementBar, BAR_HEIGHT } from './AnnouncementBar';
import { Marquee } from './sections/Marquee';
import { About } from './sections/About';
import { Projects } from './sections/Projects';
import { Founders } from './sections/Founders';
import { SuggestionBox } from './sections/SuggestionBox';
import { Footer } from './sections/Footer';
import { IntroContext } from '@/lib/intro';
import { prefersReducedMotion } from '@/lib/media';
import { SmoothScrollProvider, useSmoothScroll } from '@/lib/smoothScroll';

const INTRO_KEY = 'tc-intro-seen';

/**
 * Opening a link like /#projects: the browser tries to jump before React has
 * rendered the section, so it lands at the top. Jump once the page (and its
 * fonts, which change the layout) is ready.
 */
function DeepLink() {
  const { scrollTo } = useSmoothScroll();
  useEffect(() => {
    const hash = window.location.hash;
    if (!/^#[\w-]+$/.test(hash)) return;
    let cancelled = false;
    const go = () => {
      if (!cancelled && document.querySelector(hash)) scrollTo(hash, { immediate: true });
    };
    (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(go));
    return () => {
      cancelled = true;
    };
  }, [scrollTo]);
  return null;
}

function shouldPlayIntro() {
  if (prefersReducedMotion()) return false;
  if (window.location.hash) return false; // deep links go straight to content
  try {
    return sessionStorage.getItem(INTRO_KEY) !== '1';
  } catch {
    return true;
  }
}

export function Home() {
  const [showIntro, setShowIntro] = useState(shouldPlayIntro);
  const [introDone, setIntroDone] = useState(!showIntro);
  const [barOpen, setBarOpen] = useState(true);
  const barHeight = barOpen ? BAR_HEIGHT : 0;

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* private mode: the intro simply plays again next time */
    }
    setShowIntro(false);
    // The hero starts building as the curtain lifts.
    window.setTimeout(() => setIntroDone(true), 120);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>
        <IntroContext.Provider value={introDone}>
          <DeepLink />
          <a
            href="#main"
            className="fixed left-4 top-4 z-[90] -translate-y-24 rounded-pill bg-paper px-4 py-2 text-body-sm font-medium text-obsidian transition-transform focus:translate-y-0"
          >
            Skip to content
          </a>
          <Intro show={showIntro} onDone={finishIntro} />
          {barOpen && <AnnouncementBar onClose={() => setBarOpen(false)} />}
          <Navbar offset={barHeight} />
          {/* Above the sticky footer, which is revealed as the page scrolls off it. */}
          <main id="main" className="relative z-10" style={{ ['--bar' as string]: `${barHeight}px` }}>
            <Hero />
            <Marquee />
            <Statement />
            <About />
            <Projects />
            <Founders />
            <SuggestionBox />
            <Faq />
          </main>
          <Footer />
        </IntroContext.Provider>
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
