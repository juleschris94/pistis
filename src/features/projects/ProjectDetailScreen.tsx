import { ArrowRight, Eye, Heart, Lightbulb, Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { projectEditPath, ROUTES, wizardPath } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { toLocalDate } from '../../core/localDate';
import { PButtonLink, PCard, PIconButton, PMessage, PRing, PTopBar } from '../../design-system/components';
import { milestoneReached, nextAction, progressOf, type Milestone, type Task } from '../../domain/goals';
import { useI18n } from '../../i18n';
import { addMilestone, addTask, deleteMilestone, deleteTask, getGoalDetail, setTaskDone, setTaskPinned } from './goalsRepository';
import { GoalArt, StatusBadge, TaskRow, useGoalLabels } from './ui';

/** Détail d'un projet : vision, Pourquoi, avancement réel, étapes et tâches. */
export function ProjectDetailScreen() {
  const { id = '' } = useParams();
  const { t, formatError } = useI18n();
  const labels = useGoalLabels();
  const { db, version, reload } = useApp();
  const detail = useAsync(() => getGoalDetail(db, id), [db, id, version]);
  const [error, setError] = useState<string | null>(null);

  if (detail === null) return <Navigate to={ROUTES.projects} replace />;
  if (detail === undefined) return <p className="p-subtle">{t('common.loading')}</p>;

  const { goal, milestones, tasks } = detail;
  const progress = progressOf(tasks);
  const next = nextAction(tasks, milestones);
  const pct = progress.ratio === null ? null : Math.round(progress.ratio * 100);
  const loose = tasks.filter((task) => task.milestone_id === null || !milestones.some((m) => m.id === task.milestone_id));

  const act = (fn: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError(formatError(e));
    }
  };
  const today = toLocalDate(new Date());
  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      onToggle={(done) => void act(() => setTaskDone(db, task.id, done))()}
      onPin={goal.status === 'active' ? (pin) => void act(() => setTaskPinned(db, task.id, pin ? today : null))() : undefined}
      onDelete={() => void act(() => deleteTask(db, task.id))()}
    />
  );

  return (
    <>
      <PTopBar
        title={goal.title}
        back={ROUTES.projects}
        backLabel={t('common.back')}
        actions={<PIconButton icon={Pencil} label={t('project.edit')} to={projectEditPath(goal.id)} />}
      />

      <div className="p-hero-art">
        <GoalArt mediaId={goal.vision_media_id} art={goal.vision_art} />
        <div className="p-row">
          <span className="p-badge p-badge--on-art">{t(`category.${goal.category}`)}</span>
          <StatusBadge status={goal.status} onArt />
        </div>
        {goal.vision_text && (
          <div className="p-stack p-stack--tight">
            <span className="p-vision-label">
              <Eye aria-hidden="true" />
              {t('vision.imagined')}
            </span>
            <p className="p-heading">{goal.vision_text}</p>
          </div>
        )}
      </div>

      {error && <PMessage tone="error">{error}</PMessage>}

      {goal.status === 'idea' ? (
        <PCard variant="vision" title={t('project.idea.title')}>
          {goal.description && <p>{goal.description}</p>}
          <p className="p-subtle">{t('project.idea.body')}</p>
          <div>
            <PButtonLink to={wizardPath({ idea: goal.id })}>
              <Lightbulb aria-hidden="true" />
              {t('project.idea.promote')}
            </PButtonLink>
          </div>
        </PCard>
      ) : (
        <PCard variant="vision" title={t('goal.why')}>
          <div className="p-row">
            <Heart aria-hidden="true" color="var(--brand-secondary-text)" />
            <p className="p-quote p-grow">« {goal.why} »</p>
          </div>
        </PCard>
      )}

      {goal.status !== 'idea' && (
        <PCard title={t('project.progress')}>
          <div className="p-progress-summary">
            <PRing
              size={88}
              value={progress.ratio ?? 0}
              valueText={pct === null ? '–' : `${pct} %`}
              label={pct === null ? t('project.noTasks') : t('project.progressLabel', { title: goal.title, pct })}
            />
            <div className="p-stack p-stack--tight p-grow">
              <p>{pct === null ? t('project.noTasks') : t('project.progressText', { done: progress.done, total: progress.total })}</p>
              <p className="p-caption">{t('project.progressRule')}</p>
              {goal.target_date && (
                <p className="p-caption">
                  {t('project.targetDate')} : {labels.date(goal.target_date)} · {labels.relative(goal.target_date)}
                </p>
              )}
            </div>
          </div>
          {next && goal.status === 'active' && (
            <div className="p-stack p-stack--tight">
              <span className="p-field__label">{t('project.nextAction')}</span>
              <ul className="p-tasks">{row(next)}</ul>
            </div>
          )}
          {!next && progress.total > 0 && goal.status === 'active' && <PMessage tone="ok">{t('project.allDone')}</PMessage>}
        </PCard>
      )}

      <PCard title={t('project.plan')}>
        {milestones.length === 0 && loose.length === 0 && <p className="p-subtle">{t('project.plan.empty')}</p>}
        {milestones.map((m, index) => (
          <MilestoneBlock
            key={m.id}
            milestone={m}
            index={index}
            tasks={tasks.filter((task) => task.milestone_id === m.id)}
            row={row}
            onAdd={(title) => act(() => addTask(db, { goalId: goal.id, milestoneId: m.id, title }))()}
            onDelete={() => void act(() => deleteMilestone(db, m.id))()}
          />
        ))}
        {(loose.length > 0 || milestones.length === 0) && (
          <div className="p-milestone">
            <p className="p-milestone__title">{t('project.otherTasks')}</p>
            <ul className="p-tasks">{loose.map(row)}</ul>
            <InlineAdd label={t('project.addTask')} onAdd={(title) => act(() => addTask(db, { goalId: goal.id, title }))()} />
          </div>
        )}
        <InlineAdd label={t('project.addStep')} onAdd={(title) => act(() => addMilestone(db, goal.id, title))()} />
      </PCard>

      {goal.status !== 'idea' && (
        <div>
          <PButtonLink to={projectEditPath(goal.id)} variant="secondary">
            {t('project.manage')}
            <ArrowRight aria-hidden="true" />
          </PButtonLink>
        </div>
      )}
    </>
  );
}

function MilestoneBlock({
  milestone,
  index,
  tasks,
  row,
  onAdd,
  onDelete,
}: {
  milestone: Milestone;
  index: number;
  tasks: Task[];
  row: (task: Task) => ReactNode;
  onAdd: (title: string) => Promise<void>;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const progress = progressOf(tasks);
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="p-milestone" aria-label={milestone.title}>
      <div className="p-milestone__head">
        <p className="p-milestone__title">
          {t('templates.stepNumber', { n: index + 1 })} · {milestone.title}
        </p>
        <span className={milestoneReached(tasks) ? 'p-badge p-badge--positive' : 'p-badge'}>
          {progress.done}/{progress.total}
        </span>
      </div>
      <ul className="p-tasks">{tasks.map(row)}</ul>
      <InlineAdd label={t('project.addTask')} onAdd={onAdd} />
      {confirm ? (
        <div className="p-actions">
          <button type="button" className="p-button p-button--danger" onClick={onDelete}>
            {t('project.deleteStep.confirm')}
          </button>
          <button type="button" className="p-button p-button--ghost" onClick={() => setConfirm(false)}>
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <div>
          <button type="button" className="p-button p-button--ghost" onClick={() => setConfirm(true)}>
            {t('project.deleteStep')}
          </button>
        </div>
      )}
    </section>
  );
}

/** Petit formulaire « ajouter » sur une ligne. */
export function InlineAdd({ label, onAdd }: { label: string; onAdd: (title: string) => Promise<void> | void }) {
  const [value, setValue] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    await onAdd(value);
    setValue('');
  };
  return (
    <form className="p-inline-form" onSubmit={submit}>
      <input
        className="p-input"
        aria-label={label}
        placeholder={label}
        value={value}
        maxLength={160}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="p-button p-button--secondary" aria-label={label} disabled={!value.trim()}>
        <Plus aria-hidden="true" />
      </button>
    </form>
  );
}
