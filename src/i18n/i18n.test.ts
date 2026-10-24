import { describe, expect, it } from 'vitest';
import { ERROR_CODES, PistisError } from '../core/errors';
import { CATEGORY_IDS } from '../content/categories';
import { ENCOURAGEMENTS, encouragementOfTheDay } from '../content/encouragements';
import { en } from './en';
import { fr } from './fr';
import { createI18n, translate, type MessageKey } from './index';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('traductions', () => {
  it('l’anglais a exactement les mêmes clés que le français', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('aucun texte vide, et les mêmes variables dans les deux langues', () => {
    for (const key of Object.keys(fr) as MessageKey[]) {
      expect(fr[key].trim(), key).not.toBe('');
      expect(en[key].trim(), key).not.toBe('');
      expect(placeholders(en[key]), key).toEqual(placeholders(fr[key]));
    }
  });

  it('chaque code d’erreur a un message', () => {
    for (const code of ERROR_CODES) expect(Object.hasOwn(fr, `errors.${code}`), code).toBe(true);
  });

  it('chaque domaine a un libellé', () => {
    for (const id of CATEGORY_IDS) expect(Object.hasOwn(fr, `category.${id}`), id).toBe(true);
  });

  it('remplace les variables et garde celles qui manquent visibles', () => {
    expect(translate('fr', 'home.greeting', { name: 'JC' })).toBe('Bonjour JC ! 👋');
    expect(translate('en', 'home.greeting', { name: 'JC' })).toBe('Hello JC! 👋');
    expect(translate('fr', 'home.greeting')).toBe('Bonjour {name} ! 👋');
  });

  it('accorde les pluriels selon la langue', () => {
    const f = createI18n('fr');
    expect(f.tn('backup.items', 0)).toBe('0 élément'); // en français, 0 est singulier
    expect(f.tn('backup.items', 1)).toBe('1 élément');
    expect(f.tn('backup.items', 5)).toBe('5 éléments');
    const e = createI18n('en');
    expect(e.tn('backup.items', 0)).toBe('0 items');
    expect(e.tn('backup.items', 1)).toBe('1 item');
  });

  it('traduit les erreurs connues et signale les inconnues', () => {
    const f = createI18n('fr');
    expect(f.formatError(new PistisError('backup.passwordTooShort', { min: 8 }))).toBe(
      'Le mot de passe de sauvegarde fait au moins 8 caractères.',
    );
    expect(f.formatError(new Error('boum'))).toBe('Erreur inattendue : boum');
  });

  it('formate les tailles de fichier selon la langue', () => {
    expect(createI18n('fr').formatBytes(2_621_440)).toBe('2,5 Mo');
    expect(createI18n('en').formatBytes(2_621_440)).toBe('2.5 MB');
    expect(createI18n('fr').formatBytes(null)).toBe('inconnu');
  });
});

describe('encouragements', () => {
  it('autant de messages dans chaque langue, un par jour, stable dans la journée', () => {
    expect(ENCOURAGEMENTS.en).toHaveLength(ENCOURAGEMENTS.fr.length);
    const morning = new Date(2026, 9, 25, 7);
    const evening = new Date(2026, 9, 25, 22);
    expect(encouragementOfTheDay('fr', morning)).toBe(encouragementOfTheDay('fr', evening));
    expect(encouragementOfTheDay('fr', new Date(2026, 9, 26))).not.toBe(encouragementOfTheDay('fr', morning));
  });
});
