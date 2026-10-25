import type { ThemePreference } from '../features/settings/settings';

/**
 * Applique le thème à la page : <html data-theme="dark|light">.
 * Une copie du choix est gardée dans le navigateur pour l'appliquer dès le démarrage, avant même
 * l'ouverture de la base (évite un flash de couleur). La base reste la référence.
 */
const STORAGE_KEY = 'pistis-theme';
const THEME_COLORS = { dark: '#081a17', light: '#f8f3ea' } as const;

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): 'dark' | 'light' {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

function apply(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

let unsubscribeSystem: (() => void) | null = null;

export function applyThemePreference(preference: ThemePreference): void {
  unsubscribeSystem?.();
  unsubscribeSystem = null;
  apply(resolveTheme(preference, systemPrefersDark()));
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // stockage du navigateur indisponible : sans conséquence
  }
  if (preference === 'system' && window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply(resolveTheme('system', query.matches));
    query.addEventListener('change', onChange);
    unsubscribeSystem = () => query.removeEventListener('change', onChange);
  }
}

/** Au démarrage : dernier thème connu, ou clair (crème) par défaut. */
export function applyStoredTheme(): void {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  applyThemePreference(stored === 'dark' || stored === 'system' ? stored : 'light');
}

export function applyReducedMotion(reduced: boolean): void {
  if (reduced) document.documentElement.dataset.motion = 'reduced';
  else delete document.documentElement.dataset.motion;
}
