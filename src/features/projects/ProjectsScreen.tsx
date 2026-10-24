import { Lightbulb, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { ROUTES, wizardPath } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { PButtonLink, PCard, PEmpty, PSegmented, PTopBar } from '../../design-system/components';
import type { GoalStatus } from '../../domain/goals';
import { useI18n } from '../../i18n';
import { listGoals } from './goalsRepository';
import { ProjectCard } from './ui';

type Filter = 'current' | 'ideas' | 'finished';
const FILTERS: Record<Filter, GoalStatus[]> = { current: ['active', 'paused'], ideas: ['idea'], finished: ['done', 'archived'] };

/** Onglet Projets : projets en cours, idées notées, projets terminés. */
export function ProjectsScreen() {
  const { t } = useI18n();
  const { db, version } = useApp();
  const goals = useAsync(() => listGoals(db), [db, version]);
  const [filter, setFilter] = useState<Filter>('current');

  const count = (f: Filter) => goals?.filter((g) => FILTERS[f].includes(g.goal.status)).length ?? 0;
  const shown = goals?.filter((g) => FILTERS[filter].includes(g.goal.status)) ?? [];

  return (
    <>
      <PTopBar
        title={t('nav.projects')}
        subtitle={t('projects.subtitle')}
        actions={
          <PButtonLink to={ROUTES.projectNew}>
            <Plus aria-hidden="true" />
            {t('projects.new')}
          </PButtonLink>
        }
      />
      <PSegmented
        label={t('projects.filter')}
        options={(['current', 'ideas', 'finished'] as Filter[]).map((f) => ({
          value: f,
          label: `${t(`projects.filter.${f}`)} · ${count(f)}`,
        }))}
        value={filter}
        onChange={setFilter}
      />
      {goals === undefined ? (
        <p className="p-subtle">{t('common.loading')}</p>
      ) : shown.length > 0 ? (
        <div className="p-grid-cards">
          {shown.map((g) => (
            <ProjectCard key={g.goal.id} summary={g} />
          ))}
        </div>
      ) : (
        <PCard>
          <PEmpty icon={filter === 'ideas' ? Lightbulb : Sparkles} title={t(`projects.empty.${filter}.title`)}>
            <p className="p-subtle">{t(`projects.empty.${filter}.body`)}</p>
            {filter !== 'finished' && (
              <div className="p-actions">
                <PButtonLink to={ROUTES.templates}>{t('projects.fromTemplate')}</PButtonLink>
                <PButtonLink to={filter === 'ideas' ? ROUTES.projectNew : wizardPath()} variant="secondary">
                  {filter === 'ideas' ? t('projects.noteIdea') : t('projects.fromScratch')}
                </PButtonLink>
              </div>
            )}
          </PEmpty>
        </PCard>
      )}
    </>
  );
}
