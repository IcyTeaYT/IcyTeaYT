import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { isDemoMode } from './data/source';
import { initDeviceId } from './features/live/device';
import { startAutoUpdate } from './lib/autoUpdate';
import { isGoogleConfigured, loadGoogleIdentity } from './lib/googleAuth';
import './index.css';

// Settle this tab's device id before anything asks for it.
initDeviceId();

// Start fetching Google's sign-in script now, while the splash screen plays,
// so the button is ready the moment the sign-in page appears.
if (isGoogleConfigured() && !isDemoMode) void loadGoogleIdentity().catch(() => undefined);

// An open tab picks up a new deploy by itself.
startAutoUpdate();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
