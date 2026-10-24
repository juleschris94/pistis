import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../../app/theme';
import { isSameDay, weekDays } from '../../core/week';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { detectLanguage, getSettings, parseSettings, saveSettings, settingsStatements } from './settings';

describe('réglages', () => {
  it('valeurs par défaut : sombre, tous les domaines, langue proposée', async () => {
    const db = await createMemoryDatabase();
    await migrate(db);
    expect(await getSettings(db, 'en')).toEqual({
      theme: 'dark',
      language: 'en',
      categories: ['projects', 'finance', 'habits', 'admin', 'housing', 'family'],
      reducedMotion: false,
      currency: 'EUR',
    });
  });

  it('enregistre puis relit, en gardant l’ordre officiel des domaines', async () => {
    const db = await createMemoryDatabase();
    await migrate(db);
    await saveSettings(db, { theme: 'light', language: 'fr', categories: ['family', 'projects'], reducedMotion: true });
    await saveSettings(db, { theme: 'system' });
    expect(await getSettings(db)).toMatchObject({
      theme: 'system',
      language: 'fr',
      categories: ['projects', 'family'],
      reducedMotion: true,
    });
  });

  it('une valeur abîmée ne casse rien : on revient à la valeur par défaut', () => {
    expect(parseSettings({ theme: 'violet', language: 'de', categories: '{oups', reduced_motion: 'peut-être' })).toMatchObject({
      theme: 'dark',
      language: 'fr',
      categories: ['projects', 'finance', 'habits', 'admin', 'housing', 'family'],
      reducedMotion: false,
    });
    expect(parseSettings({ categories: '["projects","inconnu"]' }).categories).toHaveLength(6);
    expect(parseSettings({ categories: '[]' }).categories).toHaveLength(6);
  });

  it('refuse de masquer tous les domaines', () => {
    expect(() => settingsStatements({ categories: [] })).toThrow();
  });

  it('propose la langue du navigateur quand PISTIS la parle', () => {
    expect(detectLanguage(['en-GB', 'fr'])).toBe('en');
    expect(detectLanguage(['de-DE', 'fr-CA'])).toBe('fr');
    expect(detectLanguage(['de-DE'])).toBe('fr');
    expect(detectLanguage([])).toBe('fr');
  });
});

describe('thème', () => {
  it('« Système » suit l’appareil, les autres choix sont fixes', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('semaine', () => {
  it('commence le lundi, y compris un dimanche et en changeant de mois', () => {
    const days = weekDays(new Date(2026, 10, 1, 15)); // dimanche 1er novembre 2026
    expect(days[0]).toEqual(new Date(2026, 9, 26));
    expect(days[6]).toEqual(new Date(2026, 10, 1));
    expect(days.every((d) => d.getHours() === 0)).toBe(true);
    expect(isSameDay(days[6], new Date(2026, 10, 1, 23, 59))).toBe(true);
  });

  it('reste juste lors du passage à l’heure d’hiver', () => {
    const days = weekDays(new Date(2026, 9, 25)); // dimanche du changement d'heure en Europe
    expect(days.map((d) => d.getDate())).toEqual([19, 20, 21, 22, 23, 24, 25]);
  });
});
