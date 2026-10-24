import { describe, expect, it } from 'vitest';
import { GOAL_LIMITS } from '../domain/goals';
import { isCategoryId } from './categories';
import { TEMPLATES } from './templates';
import { isVisionArtId } from './visionArts';

describe('bibliothèque de modèles', () => {
  it('identifiants uniques et versions valides', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) expect(Number.isInteger(t.version) && t.version >= 1, t.id).toBe(true);
  });

  it('chaque modèle est complet dans les deux langues et respecte les limites', () => {
    for (const tpl of TEMPLATES) {
      expect(isCategoryId(tpl.category), tpl.id).toBe(true);
      expect(isVisionArtId(tpl.art), tpl.id).toBe(true);
      expect(tpl.whyExamples.length, tpl.id).toBeGreaterThanOrEqual(1);
      expect(tpl.milestones.length, tpl.id).toBeGreaterThanOrEqual(2);
      const texts = [tpl.title, tpl.description, tpl.objective, tpl.frequency, tpl.indicator, ...tpl.whyExamples];
      for (const m of tpl.milestones) {
        texts.push(m.title, ...m.tasks);
        expect(m.tasks.length, `${tpl.id} / ${m.title.fr}`).toBeGreaterThanOrEqual(1);
        expect([...m.title.fr].length).toBeLessThanOrEqual(GOAL_LIMITS.milestone);
        for (const task of m.tasks) expect([...task.fr].length, task.fr).toBeLessThanOrEqual(GOAL_LIMITS.task);
      }
      for (const text of texts) {
        expect(text.fr.trim(), tpl.id).not.toBe('');
        expect(text.en.trim(), tpl.id).not.toBe('');
      }
      expect([...tpl.title.fr].length).toBeLessThanOrEqual(GOAL_LIMITS.title);
    }
  });
});
