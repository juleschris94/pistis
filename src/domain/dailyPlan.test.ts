import { describe, expect, it } from 'vitest';
import { buildDailyPlan, canPin, type PlanTask } from './dailyPlan';

const TODAY = '2026-10-25';
let seq = 0;
function task(over: Partial<PlanTask> = {}): PlanTask {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Tâche ${seq}`,
    priority: 2,
    due_date: null,
    pinned_on: null,
    done_at: null,
    created_at: seq,
    position: seq,
    goal_id: 'g',
    goal_status: 'active',
    goal_priority: 2,
    goal_title: 'Projet',
    ...over,
  };
}

describe('plan du jour', () => {
  it('ne propose que des tâches ouvertes de projets en cours, ou des tâches rapides', () => {
    const open = task();
    const quick = task({ goal_id: null, goal_status: null, goal_priority: null });
    const plan = buildDailyPlan(
      [open, quick, task({ done_at: 1 }), task({ goal_status: 'paused' }), task({ goal_status: 'idea' }), task({ goal_status: 'done' })],
      TODAY,
    );
    expect([...plan.priorities, ...plan.others].map((p) => p.task.id).sort()).toEqual([open.id, quick.id].sort());
  });

  it('propose trois priorités au maximum, le reste séparément', () => {
    const plan = buildDailyPlan([task(), task(), task(), task(), task()], TODAY);
    expect(plan.priorities).toHaveLength(3);
    expect(plan.others).toHaveLength(2);
  });

  it('le choix de l’utilisateur passe avant tout, même devant une tâche en retard', () => {
    const overdue = task({ due_date: '2026-10-20', priority: 1 });
    const pinned = task({ pinned_on: TODAY, priority: 3 });
    const plan = buildDailyPlan([overdue, pinned], TODAY);
    expect(plan.priorities.map((p) => [p.task.id, p.reason])).toEqual([
      [pinned.id, 'pinned'],
      [overdue.id, 'overdue'],
    ]);
  });

  it('une épingle d’un autre jour ne compte plus', () => {
    const old = task({ pinned_on: '2026-10-24' });
    expect(buildDailyPlan([old], TODAY).priorities[0].reason).toBe('next');
  });

  it('classe ensuite : en retard, aujourd’hui, bientôt, priorité haute, puis le reste', () => {
    const later = task({ due_date: '2026-11-30' });
    const high = task({ priority: 1 });
    const soon = task({ due_date: '2026-10-27' });
    const today = task({ due_date: TODAY });
    const late = task({ due_date: '2026-10-01' });
    const plan = buildDailyPlan([later, high, soon, today, late], TODAY);
    expect([...plan.priorities, ...plan.others].map((p) => p.reason)).toEqual(['overdue', 'dueToday', 'dueSoon', 'priority', 'next']);
  });

  it('à égalité, la priorité du projet puis l’ancienneté départagent', () => {
    const a = task({ goal_priority: 3 });
    const b = task({ goal_priority: 1 });
    const c = task({ goal_priority: 1 });
    expect(buildDailyPlan([a, c, b], TODAY).priorities.map((p) => p.task.id)).toEqual([b.id, c.id, a.id]);
  });

  it('est déterministe et ne modifie pas les tâches reçues', () => {
    const input = [task({ due_date: '2026-10-26' }), task(), task({ priority: 1 })];
    const copy = structuredClone(input);
    const first = buildDailyPlan(input, TODAY);
    expect(buildDailyPlan([...input].reverse(), TODAY)).toEqual(first);
    expect(input).toEqual(copy);
  });

  it('limite les épingles à trois tâches ouvertes', () => {
    const pinned = [task({ pinned_on: TODAY }), task({ pinned_on: TODAY }), task({ pinned_on: TODAY, done_at: 5 })];
    expect(canPin(pinned, TODAY)).toBe(true);
    expect(canPin([...pinned, task({ pinned_on: TODAY })], TODAY)).toBe(false);
  });
});
