import { isValidLocalDate, type LocalDate } from '../core/localDate';
import { isCategoryId, type CategoryId } from '../content/categories';

/**
 * Règles métier des projets et objectifs (fonctions pures, sans base ni interface).
 *
 * Un « projet » de l'onglet Projets EST un objectif : une seule entité, avec son Pourquoi,
 * sa vision, ses étapes et ses tâches. Une idée est un objectif au statut `idea`, sans Pourquoi obligatoire.
 */
export type GoalStatus = 'idea' | 'active' | 'paused' | 'done' | 'archived';
export type Priority = 1 | 2 | 3; // 1 = haute, 2 = normale, 3 = basse

export const GOAL_LIMITS = { title: 120, why: 600, vision: 600, description: 1000, task: 160, milestone: 120 };

export interface Goal {
  id: string;
  title: string;
  description: string;
  why: string;
  category: CategoryId;
  status: GoalStatus;
  priority: Priority;
  target_date: LocalDate | null;
  vision_text: string;
  vision_art: string | null;
  vision_media_id: string | null;
  template_id: string | null;
  template_version: number | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  position: number;
}

export interface Task {
  id: string;
  goal_id: string | null;
  milestone_id: string | null;
  title: string;
  priority: Priority;
  due_date: LocalDate | null;
  estimate_minutes: number | null;
  pinned_on: LocalDate | null;
  position: number;
  done_at: number | null;
  created_at: number;
}

export interface GoalInput {
  title: string;
  why: string;
  category: CategoryId;
  status: GoalStatus;
  priority: Priority;
  targetDate: LocalDate | null;
  visionText: string;
  description?: string;
}

export type GoalField = 'title' | 'why' | 'category' | 'targetDate' | 'visionText';
export type GoalFieldError = { code: 'required' } | { code: 'tooLong'; max: number } | { code: 'invalid' };

const len = (v: string | undefined) => [...(v ?? '').trim()].length;

/** Le Pourquoi est obligatoire dès que l'objectif n'est plus une simple idée. */
export function requiresWhy(status: GoalStatus): boolean {
  return status !== 'idea';
}

export function validateGoal(input: GoalInput): Partial<Record<GoalField, GoalFieldError>> {
  const errors: Partial<Record<GoalField, GoalFieldError>> = {};
  if (len(input.title) === 0) errors.title = { code: 'required' };
  else if (len(input.title) > GOAL_LIMITS.title) errors.title = { code: 'tooLong', max: GOAL_LIMITS.title };
  if (requiresWhy(input.status) && len(input.why) === 0) errors.why = { code: 'required' };
  else if (len(input.why) > GOAL_LIMITS.why) errors.why = { code: 'tooLong', max: GOAL_LIMITS.why };
  if (!isCategoryId(input.category)) errors.category = { code: 'invalid' };
  if (input.targetDate !== null && !isValidLocalDate(input.targetDate)) errors.targetDate = { code: 'invalid' };
  if (len(input.visionText) > GOAL_LIMITS.vision) errors.visionText = { code: 'tooLong', max: GOAL_LIMITS.vision };
  return errors;
}

/**
 * Avancement d'un projet — règle explicite et affichée : tâches terminées ÷ tâches prévues.
 * Sans tâche, il n'y a PAS de pourcentage (`ratio: null`) : PISTIS n'invente jamais un avancement.
 */
export interface Progress {
  done: number;
  total: number;
  ratio: number | null;
}

export function progressOf(tasks: Pick<Task, 'done_at'>[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done_at !== null).length;
  return { done, total, ratio: total === 0 ? null : done / total };
}

/** Tâches dans l'ordre du plan : étapes dans leur ordre, puis tâches sans étape, puis position. */
export function orderTasks<T extends Pick<Task, 'milestone_id' | 'position'>>(
  tasks: T[],
  milestones: Pick<Milestone, 'id' | 'position'>[],
): T[] {
  const rank = new Map(milestones.map((m) => [m.id, m.position]));
  const milestoneRank = (t: T) =>
    t.milestone_id !== null && rank.has(t.milestone_id) ? (rank.get(t.milestone_id) as number) : Number.MAX_SAFE_INTEGER;
  return [...tasks].sort((a, b) => milestoneRank(a) - milestoneRank(b) || a.position - b.position);
}

/** Prochaine action : la première tâche non terminée dans l'ordre du plan. */
export function nextAction<T extends Pick<Task, 'milestone_id' | 'position' | 'done_at'>>(
  tasks: T[],
  milestones: Pick<Milestone, 'id' | 'position'>[],
): T | null {
  return orderTasks(tasks, milestones).find((t) => t.done_at === null) ?? null;
}

/** Une étape est franchie quand elle a des tâches et qu'elles sont toutes terminées. */
export function milestoneReached(tasks: Pick<Task, 'done_at'>[]): boolean {
  return tasks.length > 0 && tasks.every((t) => t.done_at !== null);
}

/** Statuts que l'utilisateur peut choisir, et ce que chaque transition impose. */
export const GOAL_STATUSES: GoalStatus[] = ['idea', 'active', 'paused', 'done', 'archived'];

export function canChangeStatus(goal: Pick<Goal, 'why'>, to: GoalStatus): { ok: true } | { ok: false; reason: 'whyRequired' } {
  if (requiresWhy(to) && len(goal.why) === 0) return { ok: false, reason: 'whyRequired' };
  return { ok: true };
}
