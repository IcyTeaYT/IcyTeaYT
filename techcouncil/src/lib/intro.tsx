import { createContext, useContext } from 'react';

/** True once the page-load intro has finished (or was skipped). Sections wait for it. */
export const IntroContext = createContext(true);
export const useIntroDone = () => useContext(IntroContext);
