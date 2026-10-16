import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './index.css';
import { Home } from './components/Home';

const Admin = lazy(() => import('./pages/Admin'));
// Full-redesign options, previewed beside the live site.
const WORLDS = {
  mosaic: lazy(() => import('./redesign/mosaic/MosaicPage')),
  metro: lazy(() => import('./redesign/metro/MetroPage')),
  keynote: lazy(() => import('./redesign/keynote/KeynotePage')),
  blend: lazy(() => import('./redesign/blend/BlendPage')),
};

const path = window.location.pathname.replace(/\/+$/, '');
const isAdmin = path === '/admin';
const world = /^\/redesign\/(mosaic|metro|keynote|blend)$/.exec(path)?.[1] as keyof typeof WORLDS | undefined;
const World = world ? WORLDS[world] : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : World ? (
      <Suspense fallback={null}>
        <World />
      </Suspense>
    ) : (
      <Home />
    )}
  </StrictMode>,
);
