import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '../design-system/tokens.css';
import '../design-system/components.css';
import { App } from './App';

// Service worker : met l'application en cache pour qu'elle s'ouvre sans Internet.
registerSW({ immediate: true });

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
