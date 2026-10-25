import {
  ArrowRight,
  Bell,
  Camera,
  ChevronDown,
  ChevronUp,
  DatabaseBackup,
  Download,
  FolderKanban,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../app/AppContext';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { promptInstall, useInstallState, type InstallState } from '../../app/install';
import { ROUTES } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { CATEGORY_TAB } from '../../content/categories';
import { encouragementOfTheDay } from '../../content/encouragements';
import { CATEGORY_MILESTONE } from '../../content/roadmap';
import { toLocalDate } from '../../core/localDate';
import { isSameDay, weekDays } from '../../core/week';
import {
  PAvatar,
  PBadge,
  PButton,
  PButtonLink,
  PCard,
  PCheck,
  PIconButton,
  PList,
  PListRow,
  PMessage,
  PRing,
} from '../../design-system/components';
import { buildDailyPlan, type PlannedTask } from '../../domain/dailyPlan';
import { useI18n, type MessageKey } from '../../i18n';
import { lastExportAt } from '../backup/backup';
import { listGoals, listPlanTasks, setTaskDone, setTaskPinned } from '../projects/goalsRepository';
import { ProjectCard, TaskRow } from '../projects/ui';

interface FirstStep {
  id: string;
  done: boolean;
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
  action?: { label: MessageKey; to?: string; run?: () => void };
}

function firstSteps(hasPhoto: boolean, hasProject: boolean, hasBackup: boolean, install: InstallState): FirstStep[] {
  // Version web hébergée (page intégrée) : on ne peut pas l'installer, l'étape n'a pas de sens.
  const installable = import.meta.env.MODE !== 'hosted';
  const steps: FirstStep[] = [
    { id: 'profile', done: true, icon: UserRound, title: 'home.steps.profile', body: 'home.steps.profile.body' },
    {
      id: 'project',
      done: hasProject,
      icon: FolderKanban,
      title: 'home.steps.project',
      body: 'home.steps.project.body',
      action: { label: 'home.steps.project.action', to: ROUTES.templates },
    },
    {
      id: 'backup',
      done: hasBackup,
      icon: DatabaseBackup,
      title: 'home.steps.backup',
      body: 'home.steps.backup.body',
      action: { label: 'home.steps.backup.action', to: ROUTES.backup },
    },
    {
      id: 'photo',
      done: hasPhoto,
      icon: Camera,
      title: 'home.steps.photo',
      body: 'home.steps.photo.body',
      action: { label: 'home.steps.photo.action', to: ROUTES.profileEdit },
    },
    {
      id: 'install',
      done: install === 'installed',
      icon: Download,
      title: 'home.steps.install',
      body: install === 'available' ? 'home.steps.install.body' : 'home.steps.install.manual',
      action: install === 'available' ? { label: 'home.steps.install.action', run: () => void promptInstall() } : undefined,
    },
  ];
  return steps.filter((step) => installable || step.id !== 'install');
}

/** Accueil : « Que dois-je faire aujourd'hui pour avancer vers ce qui compte pour moi ? » */
export function HomeScreen() {
  const { t, formatDate, formatError, language } = useI18n();
  const { db, profile, avatar, avatarMime, settings, version, reload } = useApp();
  const install = useInstallState();
  const today = new Date();
  const todayISO = toLocalDate(today);
  const data = useAsync(
    async () => ({
      hasBackup: (await lastExportAt(db)) !== null,
      goals: await listGoals(db),
      plan: buildDailyPlan(await listPlanTasks(db), toLocalDate(new Date())),
    }),
    [db, version],
  );
  const [showOthers, setShowOthers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals = data?.goals ?? [];
  const activeGoals = goals.filter((g) => g.goal.status === 'active');
  const steps = firstSteps(Boolean(avatar), goals.length > 0, Boolean(data?.hasBackup), install);
  const done = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done && s.action);
  const plan = data?.plan;

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError(formatError(e));
    }
  };
  const planRow = ({ task, reason }: PlannedTask<Awaited<ReturnType<typeof listPlanTasks>>[number]>) => (
    <TaskRow
      key={task.id}
      task={task}
      context={[t(`plan.reason.${reason}`), task.goal_title ?? t('plan.quickTask')].join(' · ')}
      showDue={reason !== 'dueToday' && reason !== 'overdue'}
      onToggle={(isDone) => void act(() => setTaskDone(db, task.id, isDone))}
      onPin={(pin) => void act(() => setTaskPinned(db, task.id, pin ? todayISO : null))}
    />
  );

  return (
    <>
      <header className="p-topbar">
        <Link to={ROUTES.settings} className="p-avatar-button" aria-label={t('home.openProfile')}>
          <PAvatar image={avatar} mime={avatarMime} name={profile.nickname} />
        </Link>
        <div className="p-topbar__title">
          <h1 className="p-heading">{t('home.greeting', { name: profile.nickname })}</h1>
          <p className="p-subtle">{profile.phrase || t('home.subtitle')}</p>
        </div>
        <PIconButton icon={Bell} label={t('notifications.title')} to={ROUTES.notifications} />
      </header>

      <PCard>
        <p className="p-subtle">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <ol className="p-week" aria-label={t('home.week')}>
          {weekDays(today).map((day) => (
            <li key={day.toISOString()} className="p-week__day" aria-current={isSameDay(day, today) ? 'date' : undefined}>
              <span aria-hidden="true">{formatDate(day, { weekday: 'narrow' })}</span>
              <span className="p-week__num">{day.getDate()}</span>
              <span className="p-visually-hidden">{formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </li>
          ))}
        </ol>
      </PCard>

      {data === undefined ? (
        <PCard>
          <p className="p-subtle">{t('common.loading')}</p>
        </PCard>
      ) : plan && plan.priorities.length > 0 ? (
        <PCard
          variant="accent"
          title={t('home.priorities')}
          action={<PBadge tone="brand">{t('home.priorities.count', { n: plan.priorities.length })}</PBadge>}
        >
          <ul className="p-tasks" aria-label={t('home.priorities')}>
            {plan.priorities.map(planRow)}
          </ul>
          {plan.others.length > 0 && (
            <>
              <div>
                <PButton
                  variant="ghost"
                  icon={showOthers ? ChevronUp : ChevronDown}
                  onClick={() => setShowOthers((v) => !v)}
                  aria-expanded={showOthers}
                >
                  {t('home.otherActions', { n: plan.others.length })}
                </PButton>
              </div>
              {showOthers && <ul className="p-tasks">{plan.others.map(planRow)}</ul>}
            </>
          )}
          <p className="p-caption">{t('home.priorities.rule')}</p>
          {error && <PMessage tone="error">{error}</PMessage>}
        </PCard>
      ) : (
        <PCard variant="accent" title={t('home.priority')}>
          {nextStep?.action ? (
            <>
              <div className="p-stack p-stack--tight">
                <p className="p-heading">{t(nextStep.title)}</p>
                <p className="p-subtle">{t(nextStep.body)}</p>
              </div>
              <div>
                {nextStep.action.to ? (
                  <PButtonLink to={nextStep.action.to}>
                    {t(nextStep.action.label)}
                    <ArrowRight aria-hidden="true" />
                  </PButtonLink>
                ) : (
                  <PButton iconAfter={ArrowRight} onClick={nextStep.action.run}>
                    {t(nextStep.action.label)}
                  </PButton>
                )}
              </div>
            </>
          ) : (
            <div className="p-stack p-stack--tight">
              <p className="p-heading">{t('home.priority.ready')}</p>
              <p className="p-subtle">{t(goals.length ? 'home.priority.noTasks' : 'home.priority.readyBody')}</p>
            </div>
          )}
        </PCard>
      )}

      <PCard variant="vision">
        <div className="p-row">
          <Sparkles aria-hidden="true" color="var(--brand-secondary-text)" />
          <p className="p-quote p-grow">{encouragementOfTheDay(language, today)}</p>
        </div>
      </PCard>

      {activeGoals.length > 0 && (
        <section className="p-stack p-stack--tight" aria-labelledby="home-projects">
          <div className="p-section-title">
            <h2 className="p-subheading" id="home-projects">
              {t('home.projects')}
            </h2>
            <Link to={ROUTES.projects} className="p-caption">
              {t('home.projects.all')}
            </Link>
          </div>
          <div className="p-grid-cards">
            {activeGoals.slice(0, 2).map((g) => (
              <ProjectCard key={g.goal.id} summary={g} />
            ))}
          </div>
        </section>
      )}

      {done < steps.length && (
        <PCard title={t('home.steps.title')}>
          <div className="p-progress-summary">
            <PRing
              size={88}
              value={done / steps.length}
              valueText={`${Math.round((done / steps.length) * 100)} %`}
              label={t('home.steps.progress', { done, total: steps.length })}
            />
            <p className="p-subtle">{t('home.steps.progress', { done, total: steps.length })}</p>
          </div>
          <ul className="p-checklist">
            {steps.map((s) => (
              <PCheck
                key={s.id}
                state={s.done ? 'ok' : 'wait'}
                title={t(s.title)}
                detail={t(s.body)}
                stateLabel={t(s.done ? 'diag.state.ok' : 'diag.state.wait')}
                action={
                  !s.done && s.action ? (
                    s.action.to ? (
                      <PButtonLink to={s.action.to} variant="secondary">
                        {t(s.action.label)}
                      </PButtonLink>
                    ) : (
                      <PButton variant="secondary" onClick={s.action.run}>
                        {t(s.action.label)}
                      </PButton>
                    )
                  ) : undefined
                }
              />
            ))}
          </ul>
        </PCard>
      )}

      <section className="p-stack p-stack--tight" aria-labelledby="home-space">
        <h2 className="p-subheading" id="home-space">
          {t('home.space')}
        </h2>
        <PList>
          {settings.categories.map((id) => {
            const available = id === 'projects';
            const count = goals.filter((g) => g.goal.category === id && g.goal.status === 'active').length;
            return (
              <PListRow
                key={id}
                icon={CATEGORY_VISUALS[id].icon}
                color={CATEGORY_VISUALS[id].color}
                title={t(`category.${id}`)}
                subtitle={
                  count > 0
                    ? t('home.space.projects', { n: count })
                    : available
                      ? t('home.space.available')
                      : t('home.space.milestone', { milestone: CATEGORY_MILESTONE[id] })
                }
                to={ROUTES[CATEGORY_TAB[id]]}
                trailing={available || count > 0 ? undefined : <PBadge>{t('common.soon')}</PBadge>}
              />
            );
          })}
        </PList>
      </section>
    </>
  );
}
