import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { isDemoMode } from './data/source';
import { isGoogleConfigured, loadGoogleIdentity } from './lib/googleAuth';
import './index.css';

// Start fetching Google's sign-in script now, while the splash screen plays,
// so the button is ready the moment the sign-in page appears.
if (isGoogleConfigured() && !isDemoMode) void loadGoogleIdentity().catch(() => undefined);

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
