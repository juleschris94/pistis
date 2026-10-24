import { Lightbulb, LayoutTemplate, PenLine } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { projectPath, ROUTES, wizardPath } from '../../app/paths';
import { PButton, PCard, PIconBox, PMessage, PTextArea, PTopBar, PField } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { createGoal } from './goalsRepository';

/** Nouveau projet : partir d'un modèle, partir de zéro, ou simplement noter une idée. */
export function NewProjectScreen() {
  const { t, formatError } = useI18n();
  const { db, reload, settings } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function saveIdea() {
    if (!title.trim()) return setError(t('goal.error.title.required'));
    try {
      const id = await createGoal(db, {
        input: {
          title,
          description: note,
          why: '',
          category: settings.categories[0] ?? 'projects',
          status: 'idea',
          priority: 2,
          targetDate: null,
          visionText: '',
        },
        visionArt: 'summit',
      });
      reload();
      navigate(projectPath(id));
    } catch (e) {
      setError(formatError(e));
    }
  }

  return (
    <>
      <PTopBar title={t('projects.new')} back={ROUTES.projects} backLabel={t('common.back')} />
      <div className="p-choice-grid">
        <Link to={ROUTES.templates} className="p-choice">
          <PIconBox icon={LayoutTemplate} color="var(--cat-projects)" />
          <span className="p-grow">
            <span className="p-list__title">{t('projects.fromTemplate')}</span>
            <span className="p-list__subtitle">{t('projects.fromTemplate.body')}</span>
          </span>
        </Link>
        <Link to={wizardPath()} className="p-choice">
          <PIconBox icon={PenLine} color="var(--cat-admin)" />
          <span className="p-grow">
            <span className="p-list__title">{t('projects.fromScratch')}</span>
            <span className="p-list__subtitle">{t('projects.fromScratch.body')}</span>
          </span>
        </Link>
      </div>

      <PCard title={t('projects.noteIdea')}>
        <p className="p-subtle">{t('projects.noteIdea.body')}</p>
        <form
          className="p-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void saveIdea();
          }}
        >
          <PField id="idea-title" label={t('idea.title')} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <PTextArea id="idea-note" label={t('idea.note')} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          {error && <PMessage tone="error">{error}</PMessage>}
          <div>
            <PButton type="submit" icon={Lightbulb}>
              {t('idea.save')}
            </PButton>
          </div>
        </form>
      </PCard>
    </>
  );
}
