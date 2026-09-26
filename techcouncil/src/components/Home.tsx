import { useCallback, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Intro } from './Intro';
import { Navbar } from './Navbar';
import { Hero } from './sections/Hero';
import { Marquee } from './sections/Marquee';
import { About } from './sections/About';
import { Projects } from './sections/Projects';
import { Founders } from './sections/Founders';
import { SuggestionBox } from './sections/SuggestionBox';
import { Footer } from './sections/Footer';
import { IntroContext } from '@/lib/intro';
import { prefersReducedMotion } from '@/lib/media';
import { SmoothScrollProvider } from '@/lib/smoothScroll';

const INTRO_KEY = 'tc-intro-seen';

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
          <a
            href="#main"
            className="fixed left-4 top-4 z-[90] -translate-y-24 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition-transform focus:translate-y-0"
          >
            Skip to content
          </a>
          <Intro show={showIntro} onDone={finishIntro} />
          <Navbar />
          <main id="main">
            <Hero />
            <Marquee />
            <About />
            <Projects />
            <Founders />
            <SuggestionBox />
          </main>
          <Footer />
          <div className="grain" aria-hidden />
        </IntroContext.Provider>
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
