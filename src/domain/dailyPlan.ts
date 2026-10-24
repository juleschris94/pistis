import { daysBetween, type LocalDate } from '../core/localDate';
import type { GoalStatus, Priority, Task } from './goals';

/**
 * Plan du jour (moteur local, déterministe, sans IA).
 *
 * Entrée : les tâches non terminées, avec le statut et la priorité de leur projet.
 * Sortie : au plus 3 priorités, puis les autres actions éligibles, triées.
 *
 * Règles, dans l'ordre :
 * 1. Éligibles : tâches non terminées, sans projet (tâches rapides) ou dont le projet est « en cours ».
 * 2. Le choix de l'utilisateur passe toujours en premier : une tâche épinglée pour aujourd'hui est
 *    une priorité (le moteur ne retire jamais une tâche épinglée).
 * 3. Puis les échéances : en retard, puis aujourd'hui, puis les plus proches.
 * 4. Puis la priorité de la tâche, puis celle du projet, puis l'ordre de création et l'ordre dans le projet.
 * Le moteur ne modifie aucune donnée : il propose, l'utilisateur décide.
 */
export const MAX_DAILY_PRIORITIES = 3;

export interface PlanTask extends Pick<
  Task,
  'id' | 'title' | 'priority' | 'due_date' | 'pinned_on' | 'done_at' | 'created_at' | 'goal_id' | 'position'
> {
  goal_status: GoalStatus | null;
  goal_priority: Priority | null;
  goal_title: string | null;
}

export type PlanReason = 'pinned' | 'overdue' | 'dueToday' | 'dueSoon' | 'priority' | 'next';

export interface PlannedTask<T extends PlanTask = PlanTask> {
  task: T;
  reason: PlanReason;
}

export interface DailyPlan<T extends PlanTask = PlanTask> {
  priorities: PlannedTask<T>[];
  others: PlannedTask<T>[];
}

/** Échéance considérée comme « proche » (jours). */
export const DUE_SOON_DAYS = 3;

export function isEligible(task: PlanTask): boolean {
  return task.done_at === null && (task.goal_id === null || task.goal_status === 'active');
}

function reasonFor(task: PlanTask, today: LocalDate): PlanReason {
  if (task.pinned_on === today) return 'pinned';
  if (task.due_date !== null) {
    const days = daysBetween(today, task.due_date);
    if (days < 0) return 'overdue';
    if (days === 0) return 'dueToday';
    if (days <= DUE_SOON_DAYS) return 'dueSoon';
  }
  return task.priority === 1 ? 'priority' : 'next';
}

const REASON_RANK: Record<PlanReason, number> = { pinned: 0, overdue: 1, dueToday: 2, dueSoon: 3, priority: 4, next: 5 };

function compare(today: LocalDate) {
  return (a: PlanTask, b: PlanTask) => {
    const ra = REASON_RANK[reasonFor(a, today)];
    const rb = REASON_RANK[reasonFor(b, today)];
    if (ra !== rb) return ra - rb;
    const da = a.due_date ?? '9999-12-31';
    const dbb = b.due_date ?? '9999-12-31';
    if (da !== dbb) return da < dbb ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ga = a.goal_priority ?? 2;
    const gb = b.goal_priority ?? 2;
    if (ga !== gb) return ga - gb;
    if (a.created_at !== b.created_at) return a.created_at - b.created_at;
    if (a.position !== b.position) return a.position - b.position;
    return a.id < b.id ? -1 : 1;
  };
}

export function buildDailyPlan<T extends PlanTask>(tasks: T[], today: LocalDate): DailyPlan<T> {
  const sorted = tasks.filter(isEligible).sort(compare(today));
  const planned = sorted.map((task) => ({ task, reason: reasonFor(task, today) }));
  return { priorities: planned.slice(0, MAX_DAILY_PRIORITIES), others: planned.slice(MAX_DAILY_PRIORITIES) };
}

/** Peut-on épingler une tâche de plus aujourd'hui ? (trois priorités maximum, pour une journée réaliste) */
export function canPin(tasks: Pick<Task, 'pinned_on' | 'done_at'>[], today: LocalDate): boolean {
  return tasks.filter((t) => t.pinned_on === today && t.done_at === null).length < MAX_DAILY_PRIORITIES;
}
