import { CATEGORY_IDS, isCategoryId, type CategoryId } from '../../content/categories';
import type { Database, Statement } from '../../data/database';

/**
 * Réglages de l'utilisateur, rangés dans la table clé/valeur `settings`.
 * Une valeur absente ou invalide prend toujours sa valeur par défaut : un réglage ne peut pas casser l'application.
 */
export type ThemePreference = 'dark' | 'light' | 'system';
export type Language = 'fr' | 'en';

export interface Settings {
  theme: ThemePreference;
  language: Language;
  categories: CategoryId[];
  reducedMotion: boolean;
  currency: 'EUR';
}

export const LANGUAGES: Language[] = ['fr', 'en'];
export const THEMES: ThemePreference[] = ['light', 'system', 'dark'];

/** Langue proposée avant tout choix : celle du navigateur si PISTIS la parle, sinon le français. */
export function detectLanguage(navigatorLanguages: readonly string[] = []): Language {
  for (const tag of navigatorLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'fr' || base === 'en') return base;
  }
  return 'fr';
}

export function defaultSettings(language: Language = 'fr'): Settings {
  return { theme: 'light', language, categories: [...CATEGORY_IDS], reducedMotion: false, currency: 'EUR' };
}

/** Lit des valeurs brutes et les rend sûres. Fonction pure, testable. */
export function parseSettings(raw: Record<string, string>, fallbackLanguage: Language = 'fr'): Settings {
  const defaults = defaultSettings(fallbackLanguage);
  let categories = defaults.categories;
  try {
    const parsed: unknown = JSON.parse(raw.categories ?? 'null');
    if (Array.isArray(parsed)) {
      const valid = CATEGORY_IDS.filter((id) => parsed.includes(id));
      if (valid.length > 0 && parsed.every(isCategoryId)) categories = valid;
    }
  } catch {
    // valeur illisible : on garde la valeur par défaut
  }
  return {
    theme: THEMES.includes(raw.theme as ThemePreference) ? (raw.theme as ThemePreference) : defaults.theme,
    language: LANGUAGES.includes(raw.language as Language) ? (raw.language as Language) : defaults.language,
    categories,
    reducedMotion: raw.reduced_motion === 'true',
    currency: 'EUR',
  };
}

export async function getSettings(db: Database, fallbackLanguage: Language = 'fr'): Promise<Settings> {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  return parseSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])), fallbackLanguage);
}

/** Requêtes d'écriture d'une partie des réglages (à exécuter seules ou dans une transaction plus large). */
export function settingsStatements(changes: Partial<Settings>): Statement[] {
  const values: Record<string, string> = {};
  if (changes.theme) values.theme = changes.theme;
  if (changes.language) values.language = changes.language;
  if (changes.categories) {
    if (changes.categories.length === 0) throw new Error('Au moins une catégorie doit rester active.');
    values.categories = JSON.stringify(CATEGORY_IDS.filter((id) => changes.categories?.includes(id)));
  }
  if (changes.reducedMotion !== undefined) values.reduced_motion = String(changes.reducedMotion);
  return Object.entries(values).map(([key, value]) => ({
    sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    params: [key, value],
  }));
}

export async function saveSettings(db: Database, changes: Partial<Settings>): Promise<void> {
  await db.transaction(settingsStatements(changes));
}
