import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../design-system/tokens.css';
import '../design-system/components.css';
import { PErrorBoundary, PScreen } from '../design-system/components';
import { detectLanguage } from '../features/settings/settings';
import { translate } from '../i18n';
import { App } from './App';
import { checkEnvironment, readCapabilities } from './environment';
import { watchInstallPrompt } from './install';
import { applyStoredTheme } from './theme';

applyStoredTheme();
watchInstallPrompt();

const language = detectLanguage(navigator.languages);
const problem = checkEnvironment(readCapabilities());
const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    {problem ? (
      <PScreen title={translate(language, `environment.${problem.code}.title`)}>
        <p className="p-subtle">
          {translate(language, `environment.${problem.code}.body`, problem.code === 'insecure' ? { hostname: problem.hostname } : {})}
        </p>
      </PScreen>
    ) : (
      <PErrorBoundary
        texts={{
          title: translate(language, 'crash.title'),
          body: translate(language, 'crash.body'),
          reload: translate(language, 'crash.reload'),
        }}
      >
        <App />
      </PErrorBoundary>
    )}
  </StrictMode>,
);
