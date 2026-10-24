import { describe, expect, it } from 'vitest';
import { canChangeStatus, milestoneReached, nextAction, orderTasks, progressOf, validateGoal, type GoalInput } from './goals';

const base: GoalInput = {
  title: 'Créer mon entreprise',
  why: 'Gagner en autonomie',
  category: 'projects',
  status: 'active',
  priority: 2,
  targetDate: null,
  visionText: '',
};

describe('validation d’un objectif', () => {
  it('accepte un objectif complet', () => {
    expect(validateGoal(base)).toEqual({});
  });

  it('exige un Pourquoi dès qu’il n’est plus une idée', () => {
    expect(validateGoal({ ...base, why: ' ' })).toEqual({ why: { code: 'required' } });
    expect(validateGoal({ ...base, why: '', status: 'idea' })).toEqual({});
    expect(validateGoal({ ...base, why: '', status: 'done' }).why).toEqual({ code: 'required' });
  });

  it('refuse un titre vide, trop long, une date ou une catégorie invalide', () => {
    expect(validateGoal({ ...base, title: '' }).title).toEqual({ code: 'required' });
    expect(validateGoal({ ...base, title: 'x'.repeat(121) }).title).toEqual({ code: 'tooLong', max: 120 });
    expect(validateGoal({ ...base, targetDate: '2026-02-30' }).targetDate).toEqual({ code: 'invalid' });
    expect(validateGoal({ ...base, targetDate: '2026-12-31' }).targetDate).toBeUndefined();
    expect(validateGoal({ ...base, category: 'inconnue' as never }).category).toEqual({ code: 'invalid' });
  });

  it('ne laisse passer une idée au statut « en cours » qu’avec un Pourquoi', () => {
    expect(canChangeStatus({ why: '' }, 'active')).toEqual({ ok: false, reason: 'whyRequired' });
    expect(canChangeStatus({ why: '' }, 'idea')).toEqual({ ok: true });
    expect(canChangeStatus({ why: 'Pour ma famille' }, 'active')).toEqual({ ok: true });
  });
});

describe('progression', () => {
  const t = (done: boolean) => ({ done_at: done ? 1 : null });

  it('tâches terminées ÷ tâches prévues', () => {
    expect(progressOf([t(true), t(false), t(true), t(false)])).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('sans tâche, aucun pourcentage n’est inventé', () => {
    expect(progressOf([])).toEqual({ done: 0, total: 0, ratio: null });
  });

  it('une étape sans tâche n’est pas « franchie »', () => {
    expect(milestoneReached([])).toBe(false);
    expect(milestoneReached([t(true), t(true)])).toBe(true);
    expect(milestoneReached([t(true), t(false)])).toBe(false);
  });
});

describe('prochaine action', () => {
  const milestones = [
    { id: 'm2', position: 1 },
    { id: 'm1', position: 0 },
  ];
  const task = (id: string, milestone_id: string | null, position: number, done = false) => ({
    id,
    milestone_id,
    position,
    done_at: done ? 1 : null,
  });

  it('suit l’ordre des étapes, puis des tâches ; les tâches sans étape viennent après', () => {
    const tasks = [task('libre', null, 0), task('b', 'm2', 1), task('a', 'm1', 2), task('a0', 'm1', 1)];
    expect(orderTasks(tasks, milestones).map((x) => x.id)).toEqual(['a0', 'a', 'b', 'libre']);
  });

  it('est la première tâche non terminée', () => {
    const tasks = [task('a0', 'm1', 1, true), task('a', 'm1', 2), task('b', 'm2', 1)];
    expect(nextAction(tasks, milestones)?.id).toBe('a');
    expect(nextAction([task('x', null, 0, true)], [])).toBeNull();
  });
});
