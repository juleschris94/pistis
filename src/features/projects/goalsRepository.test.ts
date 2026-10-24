import { describe, expect, it } from 'vitest';
import { findTemplate } from '../../content/templates';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { buildDailyPlan } from '../../domain/dailyPlan';
import type { GoalInput } from '../../domain/goals';
import { exportBackup, readBackup, restoreBackup } from '../backup/backup';
import {
  addMilestone,
  addTask,
  createGoal,
  deleteGoal,
  deleteMilestone,
  getGoalDetail,
  listGoals,
  listPlanTasks,
  promoteIdea,
  setGoalStatus,
  setTaskDone,
  setTaskPinned,
  updateGoal,
} from './goalsRepository';
import { draftFromTemplate } from './drafts';

const clock = { now: () => Date.UTC(2026, 9, 25, 9) };
const TODAY = '2026-10-25';
const input: GoalInput = {
  title: 'Lancer mon activité',
  why: 'Gagner en autonomie',
  category: 'projects',
  status: 'active',
  priority: 2,
  targetDate: null,
  visionText: '',
};

async function setup() {
  const db = await createMemoryDatabase();
  await migrate(db);
  return db;
}
const count = async (db: Awaited<ReturnType<typeof setup>>, table: string) =>
  Number((await db.all(`SELECT COUNT(*) AS n FROM ${table}`))[0].n);

describe('projets', () => {
  it('crée un projet depuis un modèle, avec ses étapes et tâches dans l’ordre', async () => {
    const db = await setup();
    const tpl = findTemplate('start-business');
    if (!tpl) throw new Error('modèle absent');
    const id = await createGoal(db, draftFromTemplate(tpl, 'fr', 'Pour être libre'), clock);
    const detail = await getGoalDetail(db, id);
    expect(detail?.goal).toMatchObject({
      title: 'Créer mon entreprise',
      why: 'Pour être libre',
      status: 'active',
      template_id: 'start-business',
      template_version: 1,
    });
    expect(detail?.milestones.map((m) => m.title)).toEqual(['Clarifier l’idée', 'Tester le marché', 'Structurer', 'Lancer']);
    expect(detail?.tasks).toHaveLength(12);
    expect(detail?.tasks[0].title).toBe('Écrire ma proposition de valeur en une phrase');
  });

  it('la base elle-même refuse un projet en cours sans Pourquoi', async () => {
    const db = await setup();
    await expect(createGoal(db, { input: { ...input, why: '' }, visionArt: null })).rejects.toMatchObject({
      code: 'goal.invalid',
      params: { detail: 'why' },
    });
    await expect(
      db.run(
        "INSERT INTO goal (id, title, why, category, status, created_at, updated_at) VALUES ('x', 'T', '', 'projects', 'active', 1, 1)",
      ),
    ).rejects.toThrow();
    expect(await count(db, 'goal')).toBe(0);
  });

  it('une idée se note sans Pourquoi, puis devient un projet seulement avec un Pourquoi', async () => {
    const db = await setup();
    const id = await createGoal(db, { input: { ...input, why: '', status: 'idea' }, visionArt: null }, clock);
    await expect(setGoalStatus(db, id, 'active')).rejects.toMatchObject({ code: 'goal.whyRequired' });
    await updateGoal(db, id, { input: { ...input, status: 'active', why: 'Parce que ça compte' }, visionArt: 'city' }, clock);
    expect((await getGoalDetail(db, id))?.goal).toMatchObject({ status: 'active', vision_art: 'city' });
  });

  it('progression et prochaine action suivent les tâches cochées', async () => {
    const db = await setup();
    const id = await createGoal(
      db,
      {
        input,
        visionArt: null,
        milestones: [
          { title: 'Étape 1', tasks: ['A', 'B'] },
          { title: 'Étape 2', tasks: ['C'] },
        ],
      },
      clock,
    );
    let [summary] = await listGoals(db);
    expect(summary.progress).toEqual({ done: 0, total: 3, ratio: 0 });
    expect(summary.next?.title).toBe('A');
    const detail = await getGoalDetail(db, id);
    await setTaskDone(db, detail!.tasks[0].id, true, clock);
    await setTaskDone(db, detail!.tasks[1].id, true, clock);
    [summary] = await listGoals(db);
    expect(summary.progress.done).toBe(2);
    expect(summary.next?.title).toBe('C');
    expect(summary.milestonesReached).toBe(1);
    await setTaskDone(db, detail!.tasks[0].id, false, clock);
    expect((await listGoals(db))[0].next?.title).toBe('A');
  });

  it('terminer un projet enregistre sa date de fin, le rouvrir l’efface', async () => {
    const db = await setup();
    const id = await createGoal(db, { input, visionArt: null }, clock);
    await setGoalStatus(db, id, 'done', clock);
    expect((await getGoalDetail(db, id))?.goal.completed_at).toBe(clock.now());
    await setGoalStatus(db, id, 'active', clock);
    expect((await getGoalDetail(db, id))?.goal.completed_at).toBeNull();
  });

  it('supprimer une étape garde ses tâches ; supprimer le projet supprime tout', async () => {
    const db = await setup();
    const id = await createGoal(db, { input, visionArt: null, milestones: [{ title: 'Étape', tasks: ['A'] }] }, clock);
    const extra = await addMilestone(db, id, 'Nouvelle étape', clock);
    await addTask(db, { goalId: id, milestoneId: extra, title: 'B' }, clock);
    await deleteMilestone(db, extra);
    const detail = await getGoalDetail(db, id);
    expect(detail?.milestones).toHaveLength(1);
    expect(detail?.tasks.find((t) => t.title === 'B')?.milestone_id).toBeNull();
    await deleteGoal(db, id);
    expect([await count(db, 'goal'), await count(db, 'milestone'), await count(db, 'task')]).toEqual([0, 0, 0]);
  });

  it('refuse les titres vides ou trop longs', async () => {
    const db = await setup();
    const id = await createGoal(db, { input, visionArt: null }, clock);
    await expect(addTask(db, { goalId: id, title: '  ' })).rejects.toMatchObject({ code: 'task.invalid' });
    await expect(addMilestone(db, id, 'x'.repeat(200))).rejects.toMatchObject({ code: 'milestone.invalid' });
  });
});

describe('idée → projet', () => {
  it('garde l’idée, ajoute Pourquoi, vision et plan en une seule opération', async () => {
    const db = await setup();
    const id = await createGoal(db, { input: { ...input, title: 'Ouvrir un café', why: '', status: 'idea' }, visionArt: null }, clock);
    await addTask(db, { goalId: id, title: 'Repérer un local' }, clock);
    await promoteIdea(
      db,
      id,
      {
        input: { ...input, title: 'Ouvrir un café', why: 'Créer un lieu chaleureux', visionText: 'Un café plein le samedi matin' },
        visionArt: 'city',
        milestones: [{ title: 'Étudier', tasks: ['Business plan'] }],
      },
      clock,
    );
    const detail = await getGoalDetail(db, id);
    expect(detail?.goal).toMatchObject({ status: 'active', why: 'Créer un lieu chaleureux', vision_art: 'city' });
    expect(detail?.tasks.map((t) => t.title)).toEqual(['Business plan', 'Repérer un local']);
  });

  it('refuse de lancer une idée sans Pourquoi et ne change rien', async () => {
    const db = await setup();
    const id = await createGoal(db, { input: { ...input, why: '', status: 'idea' }, visionArt: null }, clock);
    await expect(
      promoteIdea(db, id, { input: { ...input, why: '' }, visionArt: null, milestones: [{ title: 'É', tasks: ['A'] }] }),
    ).rejects.toMatchObject({
      code: 'goal.invalid',
    });
    expect((await getGoalDetail(db, id))?.goal.status).toBe('idea');
    expect(await count(db, 'task')).toBe(0);
  });
});

describe('plan du jour depuis la base', () => {
  it('trois épingles au maximum, tâches rapides comprises, projets en pause exclus', async () => {
    const db = await setup();
    const active = await createGoal(db, { input, visionArt: null, milestones: [{ title: 'É', tasks: ['A', 'B', 'C', 'D'] }] }, clock);
    const paused = await createGoal(
      db,
      { input: { ...input, title: 'En pause' }, visionArt: null, milestones: [{ title: 'É', tasks: ['P'] }] },
      clock,
    );
    await setGoalStatus(db, paused, 'paused', clock);
    const quick = await addTask(db, { goalId: null, title: 'Appeler la banque', dueDate: TODAY }, clock);
    const tasks = (await getGoalDetail(db, active))!.tasks;
    for (const t of tasks.slice(0, 3)) await setTaskPinned(db, t.id, TODAY, clock);
    await expect(setTaskPinned(db, tasks[3].id, TODAY)).rejects.toMatchObject({ code: 'task.tooManyPinned' });

    const plan = buildDailyPlan(await listPlanTasks(db), TODAY);
    expect(plan.priorities.map((p) => p.task.title)).toEqual(['A', 'B', 'C']);
    expect(plan.others.map((p) => p.task.title)).toEqual(['Appeler la banque', 'D']);
    expect(plan.others[0].task.id).toBe(quick);

    // Terminer une tâche épinglée libère une place.
    await setTaskDone(db, tasks[0].id, true, clock);
    await setTaskPinned(db, tasks[3].id, TODAY, clock);
    expect(buildDailyPlan(await listPlanTasks(db), TODAY).priorities.map((p) => p.task.title)).toEqual(['B', 'C', 'D']);
  });
});

describe('sauvegarde des projets', () => {
  it('projets, étapes et tâches sont sauvegardés et restaurés', async () => {
    const db = await setup();
    const tpl = findTemplate('read-book');
    await createGoal(db, draftFromTemplate(tpl!, 'fr', 'Apprendre'), clock);
    await addTask(db, { goalId: null, title: 'Tâche rapide' }, clock);
    const { bytes, manifest } = await exportBackup(db, { appVersion: 'test', clock });
    expect(manifest.counts).toMatchObject({ goal: 1, milestone: 3, task: 7 });
    const target = await setup();
    await restoreBackup(target, await readBackup(bytes), clock);
    expect([await count(target, 'goal'), await count(target, 'milestone'), await count(target, 'task')]).toEqual([1, 3, 7]);
  });
});
