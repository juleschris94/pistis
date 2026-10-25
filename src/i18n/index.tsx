import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { isPistisError } from '../core/errors';
import type { Language } from '../features/settings/settings';
import { en } from './en';
import { fr, type MessageKey } from './fr';

/**
 * Traductions de PISTIS.
 * - Le français (`fr.ts`) est la référence : chaque clé y est définie.
 * - L'anglais (`en.ts`) doit contenir exactement les mêmes clés : TypeScript refuse de compiler sinon.
 * - Variables : `{name}` dans le texte, remplacées par `t('clé', { name: 'JC' })`.
 * - Pluriels : deux clés `….one` et `….other`, choisies par `tn('…', nombre)`.
 */
export type { MessageKey };
export type Params = Record<string, string | number>;

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { fr, en };
const LOCALES: Record<Language, string> = { fr: 'fr-FR', en: 'en-GB' };

export function translate(language: Language, key: MessageKey, params: Params = {}): string {
  const text = DICTIONARIES[language][key] ?? fr[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

type PluralBase<K extends string> = K extends `${infer B}.one` ? B : never;
export type PluralKey = PluralBase<MessageKey>;

export function createI18n(language: Language) {
  const locale = LOCALES[language];
  const plural = new Intl.PluralRules(locale);
  const t = (key: MessageKey, params?: Params) => translate(language, key, params);
  return {
    language,
    locale,
    t,
    /** Pluriel : `tn('home.categories', 3)` → clé `home.categories.other` avec {count} = 3. */
    tn: (base: PluralKey, count: number, params: Params = {}) =>
      t(`${base}.${plural.select(count) === 'one' ? 'one' : 'other'}` as MessageKey, { count, ...params }),
    formatDate: (date: Date | number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(date),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value),
    formatBytes: (n: number | null) => formatBytes(n, locale, language),
    /** Montant en centimes entiers → « 1 234,56 € ». `signed` : « +12,00 € » / « −12,00 € ». */
    formatMoney: (cents: number, currency: string, opts: { signed?: boolean } = {}) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency, signDisplay: opts.signed ? 'exceptZero' : 'auto' }).format(cents / 100),
    /** Message lisible pour n'importe quelle erreur : code connu → texte traduit, sinon texte générique + détail. */
    formatError: (error: unknown) => {
      if (isPistisError(error)) return t(`errors.${error.code}` as MessageKey, error.params);
      const detail = error instanceof Error ? error.message : String(error);
      return t('errors.unexpected', { detail });
    },
  };
}

export type I18n = ReturnType<typeof createI18n>;

const I18nContext = createContext<I18n>(createI18n('fr'));

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo(() => createI18n(language), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

function formatBytes(n: number | null, locale: string, language: Language): string {
  if (n === null) return language === 'fr' ? 'inconnu' : 'unknown';
  const units = language === 'fr' ? ['o', 'Ko', 'Mo', 'Go'] : ['B', 'KB', 'MB', 'GB'];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit >= 2 ? 1 : 0;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}
