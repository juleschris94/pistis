import { PistisError } from '../../core/errors';
import { newId, systemClock, type Clock } from '../../core/ids';
import { isValidLocalDate, type LocalDate } from '../../core/localDate';
import type { Database, Row, Statement } from '../../data/database';
import { canPin, type PlanTask } from '../../domain/dailyPlan';
import {
  canChangeStatus,
  GOAL_LIMITS,
  milestoneReached,
  nextAction,
  orderTasks,
  progressOf,
  validateGoal,
  type Goal,
  type GoalInput,
  type GoalStatus,
  type Milestone,
  type Priority,
  type Progress,
  type Task,
} from '../../domain/goals';
import { deleteMediaIfUnusedStatement, prepareMediaInsert, type NewMedia } from '../media/mediaRepository';

/**
 * Lecture et écriture des projets, étapes et tâches.
 * Toute écriture qui touche plusieurs lignes passe par une seule transaction.
 */
export interface GoalDraft {
  input: GoalInput;
  visionArt: string | null;
  /** `undefined` = inchangée, `null` = retirer, une image = remplacer. */
  visionPhoto?: NewMedia | null;
  templateId?: string | null;
  templateVersion?: number | null;
  milestones?: { title: string; tasks: string[] }[];
}

export interface GoalSummary {
  goal: Goal;
  progress: Progress;
  next: Task | null;
  milestones: number;
  milestonesReached: number;
}

export interface GoalDetail {
  goal: Goal;
  milestones: Milestone[];
  tasks: Task[];
}

const clean = (v: string | undefined) => (v ?? '').trim();
const asGoal = (r: Row) => r as unknown as Goal;
const asTask = (r: Row) => r as unknown as Task;
const asMilestone = (r: Row) => r as unknown as Milestone;

function checkTitle(title: string, max: number, code: 'task.invalid' | 'milestone.invalid') {
  const n = [...title.trim()].length;
  if (n === 0 || n > max) throw new PistisError(code, { max });
}

/** Requêtes de création d'étapes et de tâches à la suite d'un plan existant. */
function planStatements(
  goalId: string,
  milestones: { title: string; tasks: string[] }[],
  now: number,
  firstMilestone: number,
  firstTask: number,
): Statement[] {
  const statements: Statement[] = [];
  let taskPosition = firstTask;
  milestones.forEach((m, index) => {
    checkTitle(m.title, GOAL_LIMITS.milestone, 'milestone.invalid');
    const milestoneId = newId();
    statements.push({
      sql: 'INSERT INTO milestone (id, goal_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
      params: [milestoneId, goalId, clean(m.title), firstMilestone + index, now],
    });
    for (const title of m.tasks) {
      checkTitle(title, GOAL_LIMITS.task, 'task.invalid');
      statements.push({
        sql: `INSERT INTO task (id, goal_id, milestone_id, title, priority, position, created_at, updated_at)
              VALUES (?, ?, ?, ?, 2, ?, ?, ?)`,
        params: [newId(), goalId, milestoneId, clean(title), taskPosition++, now, now],
      });
    }
  });
  return statements;
}

/* ---- Projets ---------------------------------------------------------------- */

export async function createGoal(db: Database, draft: GoalDraft, clock: Clock = systemClock): Promise<string> {
  const invalid = Object.keys(validateGoal(draft.input));
  if (invalid.length) throw new PistisError('goal.invalid', { detail: invalid.join(',') });
  const now = clock.now();
  const id = newId();
  const statements: Statement[] = [];
  let mediaId: string | null = null;
  if (draft.visionPhoto) {
    const prepared = await prepareMediaInsert(db, draft.visionPhoto, now);
    statements.push(...prepared.statements);
    mediaId = prepared.id;
  }
  const i = draft.input;
  statements.push({
    sql: `INSERT INTO goal (id, title, description, why, category, status, priority, target_date, vision_text, vision_art,
            vision_media_id, template_id, template_version, created_at, updated_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      id,
      clean(i.title),
      clean(i.description),
      clean(i.why),
      i.category,
      i.status,
      i.priority,
      i.targetDate,
      clean(i.visionText),
      draft.visionArt,
      mediaId,
      draft.templateId ?? null,
      draft.templateVersion ?? null,
      now,
      now,
      i.status === 'done' ? now : null,
    ],
  });
  statements.push(...planStatements(id, draft.milestones ?? [], now, 0, 0));
  await db.transaction(statements);
  return id;
}

export async function updateGoal(db: Database, id: string, draft: GoalDraft, clock: Clock = systemClock): Promise<void> {
  const current = await getGoal(db, id);
  if (!current) throw new PistisError('goal.notFound');
  const invalid = Object.keys(validateGoal(draft.input));
  if (invalid.length) throw new PistisError('goal.invalid', { detail: invalid.join(',') });
  const now = clock.now();
  const statements: Statement[] = [];
  let mediaId = current.vision_media_id;
  if (draft.visionPhoto === null) mediaId = null;
  else if (draft.visionPhoto) {
    const prepared = await prepareMediaInsert(db, draft.visionPhoto, now);
    statements.push(...prepared.statements);
    mediaId = prepared.id;
  }
  const i = draft.input;
  const completedAt = i.status === 'done' ? (current.completed_at ?? now) : null;
  statements.push({
    sql: `UPDATE goal SET title = ?, description = ?, why = ?, category = ?, status = ?, priority = ?, target_date = ?,
            vision_text = ?, vision_art = ?, vision_media_id = ?, updated_at = ?, completed_at = ? WHERE id = ?`,
    params: [
      clean(i.title),
      clean(i.description),
      clean(i.why),
      i.category,
      i.status,
      i.priority,
      i.targetDate,
      clean(i.visionText),
      draft.visionArt,
      mediaId,
      now,
      completedAt,
      id,
    ],
  });
  if (current.vision_media_id && current.vision_media_id !== mediaId)
    statements.push(deleteMediaIfUnusedStatement(current.vision_media_id));
  await db.transaction(statements);
}

/**
 * Transforme une idée en projet : nouveau contenu (Pourquoi obligatoire) et plan ajouté
 * à la suite de ce qui existe déjà, en une seule transaction.
 */
export async function promoteIdea(db: Database, id: string, draft: GoalDraft, clock: Clock = systemClock): Promise<void> {
  const current = await getGoal(db, id);
  if (!current) throw new PistisError('goal.notFound');
  const invalid = Object.keys(validateGoal(draft.input));
  if (invalid.length) throw new PistisError('goal.invalid', { detail: invalid.join(',') });
  const now = clock.now();
  const counts = await db.all<{ m: number | null; t: number | null }>(
    'SELECT (SELECT MAX(position) FROM milestone WHERE goal_id = ?) AS m, (SELECT MAX(position) FROM task WHERE goal_id = ?) AS t',
    [id, id],
  );
  const statements: Statement[] = [];
  let mediaId = current.vision_media_id;
  if (draft.visionPhoto === null) mediaId = null;
  else if (draft.visionPhoto) {
    const prepared = await prepareMediaInsert(db, draft.visionPhoto, now);
    statements.push(...prepared.statements);
    mediaId = prepared.id;
  }
  const i = draft.input;
  statements.push({
    sql: `UPDATE goal SET title = ?, why = ?, category = ?, status = ?, priority = ?, target_date = ?, vision_text = ?,
            vision_art = ?, vision_media_id = ?, template_id = COALESCE(?, template_id), template_version = COALESCE(?, template_version),
            updated_at = ? WHERE id = ?`,
    params: [
      clean(i.title),
      clean(i.why),
      i.category,
      i.status,
      i.priority,
      i.targetDate,
      clean(i.visionText),
      draft.visionArt,
      mediaId,
      draft.templateId ?? null,
      draft.templateVersion ?? null,
      now,
      id,
    ],
  });
  statements.push(...planStatements(id, draft.milestones ?? [], now, (counts[0]?.m ?? -1) + 1, (counts[0]?.t ?? -1) + 1));
  if (current.vision_media_id && current.vision_media_id !== mediaId)
    statements.push(deleteMediaIfUnusedStatement(current.vision_media_id));
  await db.transaction(statements);
}

export async function setGoalStatus(db: Database, id: string, status: GoalStatus, clock: Clock = systemClock): Promise<void> {
  const goal = await getGoal(db, id);
  if (!goal) throw new PistisError('goal.notFound');
  if (!canChangeStatus(goal, status).ok) throw new PistisError('goal.whyRequired');
  const now = clock.now();
  await db.run('UPDATE goal SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?', [
    status,
    now,
    status === 'done' ? (goal.completed_at ?? now) : null,
    id,
  ]);
}

/** Supprime le projet, ses étapes et ses tâches (cascade), et son image si plus rien ne l'utilise. */
export async function deleteGoal(db: Database, id: string): Promise<void> {
  const goal = await getGoal(db, id);
  if (!goal) return;
  const statements: Statement[] = [{ sql: 'DELETE FROM goal WHERE id = ?', params: [id] }];
  if (goal.vision_media_id) statements.push(deleteMediaIfUnusedStatement(goal.vision_media_id));
  await db.transaction(statements);
}

export async function getGoal(db: Database, id: string): Promise<Goal | null> {
  const rows = await db.all('SELECT * FROM goal WHERE id = ?', [id]);
  return rows[0] ? asGoal(rows[0]) : null;
}

export async function getGoalDetail(db: Database, id: string): Promise<GoalDetail | null> {
  const goal = await getGoal(db, id);
  if (!goal) return null;
  const milestones = (await db.all('SELECT * FROM milestone WHERE goal_id = ? ORDER BY position', [id])).map(asMilestone);
  const tasks = orderTasks((await db.all('SELECT * FROM task WHERE goal_id = ? ORDER BY position', [id])).map(asTask), milestones);
  return { goal, milestones, tasks };
}

export async function listGoals(db: Database): Promise<GoalSummary[]> {
  const goals = (await db.all('SELECT * FROM goal ORDER BY priority, created_at')).map(asGoal);
  const milestones = (await db.all('SELECT * FROM milestone ORDER BY position')).map(asMilestone);
  const tasks = (await db.all('SELECT * FROM task WHERE goal_id IS NOT NULL ORDER BY position')).map(asTask);
  return goals.map((goal) => {
    const own = tasks.filter((t) => t.goal_id === goal.id);
    const ownMilestones = milestones.filter((m) => m.goal_id === goal.id);
    return {
      goal,
      progress: progressOf(own),
      next: nextAction(own, ownMilestones),
      milestones: ownMilestones.length,
      milestonesReached: ownMilestones.filter((m) => milestoneReached(own.filter((t) => t.milestone_id === m.id))).length,
    };
  });
}

/* ---- Étapes ----------------------------------------------------------------- */

export async function addMilestone(db: Database, goalId: string, title: string, clock: Clock = systemClock): Promise<string> {
  checkTitle(title, GOAL_LIMITS.milestone, 'milestone.invalid');
  const rows = await db.all<{ p: number | null }>('SELECT MAX(position) AS p FROM milestone WHERE goal_id = ?', [goalId]);
  const id = newId();
  await db.run('INSERT INTO milestone (id, goal_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    goalId,
    clean(title),
    (rows[0]?.p ?? -1) + 1,
    clock.now(),
  ]);
  return id;
}

export async function renameMilestone(db: Database, id: string, title: string): Promise<void> {
  checkTitle(title, GOAL_LIMITS.milestone, 'milestone.invalid');
  await db.run('UPDATE milestone SET title = ? WHERE id = ?', [clean(title), id]);
}

/** Supprime une étape ; ses tâches sont conservées, sans étape. */
export async function deleteMilestone(db: Database, id: string): Promise<void> {
  await db.run('DELETE FROM milestone WHERE id = ?', [id]);
}

/* ---- Tâches ----------------------------------------------------------------- */

export interface NewTask {
  goalId: string | null;
  milestoneId?: string | null;
  title: string;
  dueDate?: LocalDate | null;
  priority?: Priority;
}

export async function addTask(db: Database, task: NewTask, clock: Clock = systemClock): Promise<string> {
  checkTitle(task.title, GOAL_LIMITS.task, 'task.invalid');
  if (task.dueDate && !isValidLocalDate(task.dueDate)) throw new PistisError('task.invalid');
  const rows = await db.all<{ p: number | null }>('SELECT MAX(position) AS p FROM task WHERE goal_id IS ?', [task.goalId]);
  const id = newId();
  const now = clock.now();
  await db.run(
    `INSERT INTO task (id, goal_id, milestone_id, title, priority, due_date, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      task.goalId,
      task.milestoneId ?? null,
      clean(task.title),
      task.priority ?? 2,
      task.dueDate ?? null,
      (rows[0]?.p ?? -1) + 1,
      now,
      now,
    ],
  );
  return id;
}

export async function updateTask(
  db: Database,
  id: string,
  changes: { title?: string; dueDate?: LocalDate | null; priority?: Priority },
  clock: Clock = systemClock,
): Promise<void> {
  if (changes.title !== undefined) checkTitle(changes.title, GOAL_LIMITS.task, 'task.invalid');
  if (changes.dueDate && !isValidLocalDate(changes.dueDate)) throw new PistisError('task.invalid');
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (changes.title !== undefined) {
    sets.push('title = ?');
    params.push(clean(changes.title));
  }
  if (changes.dueDate !== undefined) {
    sets.push('due_date = ?');
    params.push(changes.dueDate);
  }
  if (changes.priority !== undefined) {
    sets.push('priority = ?');
    params.push(changes.priority);
  }
  if (!sets.length) return;
  await db.run(`UPDATE task SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...params, clock.now(), id]);
}

/** Coche ou décoche une tâche. Une tâche terminée n'est plus épinglée. */
export async function setTaskDone(db: Database, id: string, done: boolean, clock: Clock = systemClock): Promise<void> {
  const now = clock.now();
  await db.run(
    done
      ? 'UPDATE task SET done_at = ?, pinned_on = NULL, updated_at = ? WHERE id = ?'
      : 'UPDATE task SET done_at = NULL, updated_at = ? WHERE id = ?',
    done ? [now, now, id] : [now, id],
  );
}

export async function deleteTask(db: Database, id: string): Promise<void> {
  await db.run('DELETE FROM task WHERE id = ?', [id]);
}

/** Épingle une tâche dans les priorités du jour (trois au maximum), ou la désépingle (`today = null`). */
export async function setTaskPinned(db: Database, id: string, today: LocalDate | null, clock: Clock = systemClock): Promise<void> {
  if (today) {
    const pinned = await db.all<{ pinned_on: string; done_at: number | null }>(
      'SELECT pinned_on, done_at FROM task WHERE pinned_on = ? AND id != ?',
      [today, id],
    );
    if (!canPin(pinned, today)) throw new PistisError('task.tooManyPinned', { max: 3 });
  }
  await db.run('UPDATE task SET pinned_on = ?, updated_at = ? WHERE id = ?', [today, clock.now(), id]);
}

/** Tâches ouvertes avec le statut, la priorité et le titre de leur projet, pour le plan du jour. */
export async function listPlanTasks(db: Database): Promise<(PlanTask & Task)[]> {
  const rows = await db.all(
    `SELECT task.*, goal.status AS goal_status, goal.priority AS goal_priority, goal.title AS goal_title
     FROM task LEFT JOIN goal ON goal.id = task.goal_id
     WHERE task.done_at IS NULL`,
  );
  return rows as unknown as (PlanTask & Task)[];
}

/** Nombre de tâches terminées aujourd'hui (pour l'encouragement de l'accueil). */
export async function countDoneSince(db: Database, since: number): Promise<number> {
  const rows = await db.all<{ n: number }>('SELECT COUNT(*) AS n FROM task WHERE done_at >= ?', [since]);
  return Number(rows[0]?.n ?? 0);
}
