import { ArrowRight, Bell, Camera, DatabaseBackup, Download, Sparkles, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { useApp } from '../../app/AppContext';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { promptInstall, useInstallState, type InstallState } from '../../app/install';
import { ROUTES } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { CATEGORY_TAB } from '../../content/categories';
import { encouragementOfTheDay } from '../../content/encouragements';
import { CATEGORY_MILESTONE } from '../../content/roadmap';
import { isSameDay, weekDays } from '../../core/week';
import { PAvatar, PBadge, PButton, PButtonLink, PCard, PCheck, PIconButton, PList, PListRow, PRing } from '../../design-system/components';
import { useI18n, type MessageKey } from '../../i18n';
import { lastExportAt } from '../backup/backup';

interface FirstStep {
  id: 'profile' | 'photo' | 'backup' | 'install';
  done: boolean;
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
  action?: { label: MessageKey; to?: string; run?: () => void };
}

function firstSteps(hasPhoto: boolean, hasBackup: boolean, install: InstallState): FirstStep[] {
  return [
    { id: 'profile', done: true, icon: UserRound, title: 'home.steps.profile', body: 'home.steps.profile.body' },
    {
      id: 'photo',
      done: hasPhoto,
      icon: Camera,
      title: 'home.steps.photo',
      body: 'home.steps.photo.body',
      action: { label: 'home.steps.photo.action', to: ROUTES.profileEdit },
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
      id: 'install',
      done: install === 'installed',
      icon: Download,
      title: 'home.steps.install',
      body: install === 'available' ? 'home.steps.install.body' : 'home.steps.install.manual',
      action: install === 'available' ? { label: 'home.steps.install.action', run: () => void promptInstall() } : undefined,
    },
  ];
}

/** Accueil : ce qui mérite ton attention aujourd'hui. Uniquement des données réelles. */
export function HomeScreen() {
  const { t, formatDate, language } = useI18n();
  const { db, profile, avatar, avatarMime, settings } = useApp();
  const install = useInstallState();
  const hasBackup = useAsync(async () => (await lastExportAt(db)) !== null, [db, settings]);
  const today = new Date();

  const steps = firstSteps(Boolean(avatar), Boolean(hasBackup), install);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done && s.action);

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

      <PCard variant="accent" title={t('home.priority')}>
        {hasBackup === undefined ? (
          <p className="p-subtle">{t('common.loading')}</p>
        ) : next?.action ? (
          <>
            <div className="p-stack p-stack--tight">
              <p className="p-heading">{t(next.title)}</p>
              <p className="p-subtle">{t(next.body)}</p>
            </div>
            <div>
              {next.action.to ? (
                <PButtonLink to={next.action.to}>
                  {t(next.action.label)}
                  <ArrowRight aria-hidden="true" />
                </PButtonLink>
              ) : (
                <PButton iconAfter={ArrowRight} onClick={next.action.run}>
                  {t(next.action.label)}
                </PButton>
              )}
            </div>
          </>
        ) : (
          <div className="p-stack p-stack--tight">
            <p className="p-heading">{t('home.priority.ready')}</p>
            <p className="p-subtle">{t('home.priority.readyBody')}</p>
          </div>
        )}
      </PCard>

      <PCard variant="vision">
        <div className="p-row">
          <Sparkles aria-hidden="true" color="var(--brand-secondary-text)" />
          <p className="p-quote p-grow">{encouragementOfTheDay(language, today)}</p>
        </div>
      </PCard>

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
            />
          ))}
        </ul>
      </PCard>

      <section className="p-stack p-stack--tight" aria-labelledby="home-space">
        <h2 className="p-subheading" id="home-space">
          {t('home.space')}
        </h2>
        <PList>
          {settings.categories.map((id) => (
            <PListRow
              key={id}
              icon={CATEGORY_VISUALS[id].icon}
              color={CATEGORY_VISUALS[id].color}
              title={t(`category.${id}`)}
              subtitle={t('home.space.milestone', { milestone: CATEGORY_MILESTONE[id] })}
              to={ROUTES[CATEGORY_TAB[id]]}
              trailing={<PBadge>{t('common.soon')}</PBadge>}
            />
          ))}
        </PList>
      </section>
    </>
  );
}
