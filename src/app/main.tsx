import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../design-system/tokens.css';
import '../design-system/components.css';
import { PErrorBoundary, PScreen } from '../design-system/components';
import { App } from './App';
import { checkEnvironment, readCapabilities } from './environment';
import { UpdateBanner } from './UpdateBanner';

const root = createRoot(document.getElementById('root') as HTMLElement);
const problem = checkEnvironment(readCapabilities());

root.render(
  <StrictMode>
    {problem ? (
      <PScreen title={problem.title}>
        <p className="p-subtle">{problem.detail}</p>
      </PScreen>
    ) : (
      <PErrorBoundary>
        <UpdateBanner />
        <App />
      </PErrorBoundary>
    )}
  </StrictMode>,
);
