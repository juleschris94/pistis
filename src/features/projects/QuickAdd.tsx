import { CheckSquare, LayoutTemplate, Lightbulb, PenLine, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { projectPath, ROUTES, wizardPath } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { toLocalDate } from '../../core/localDate';
import { PButton, PChip, PField, PIconBox, PMessage, PSelect, PSheet, PTextArea } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { addTask, createGoal, listGoals } from './goalsRepository';

type View = 'menu' | 'task' | 'idea';

/**
 * Bouton « + » présent sur tous les écrans : ajouter en quelques secondes une tâche, une idée
 * ou un projet. N'apparaissent que les ajouts réellement disponibles dans cette version.
 */
export function QuickAdd() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="p-fab" aria-label={t('quickAdd.open')} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
      </button>
      {open && <QuickAddSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const { t, formatError } = useI18n();
  const { db, version, reload, settings } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('menu');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [goalId, setGoalId] = useState('');
  const [due, setDue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const goals = useAsync(() => listGoals(db), [db, version]);
  const activeGoals = (goals ?? []).filter((g) => g.goal.status === 'active');
  // Dates calculées une fois à l'ouverture (le lendemain par le calendrier, pas par 24 h : juste aux changements d'heure).
  const [{ today, tomorrow }] = useState(() => {
    const now = new Date();
    return { today: toLocalDate(now), tomorrow: toLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) };
  });

  async function save() {
    setError(null);
    if (!title.trim()) return setError(t(view === 'task' ? 'quickAdd.task.required' : 'goal.error.title.required'));
    try {
      if (view === 'task') {
        await addTask(db, { goalId: goalId || null, title, dueDate: due || null });
        reload();
        onClose();
      } else {
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
        onClose();
        navigate(projectPath(id));
      }
    } catch (e) {
      setError(formatError(e));
    }
  }

  const title_ = view === 'task' ? t('quickAdd.task') : view === 'idea' ? t('quickAdd.idea') : t('quickAdd.title');

  return (
    <PSheet title={title_} closeLabel={t('common.close')} onClose={onClose}>
      {view === 'menu' ? (
        <div className="p-choice-grid">
          <button type="button" className="p-choice" onClick={() => setView('task')}>
            <PIconBox icon={CheckSquare} color="var(--cat-habits)" />
            <span className="p-grow">
              <span className="p-list__title">{t('quickAdd.task')}</span>
              <span className="p-list__subtitle">{t('quickAdd.task.body')}</span>
            </span>
          </button>
          <button type="button" className="p-choice" onClick={() => setView('idea')}>
            <PIconBox icon={Lightbulb} color="var(--cat-housing)" />
            <span className="p-grow">
              <span className="p-list__title">{t('quickAdd.idea')}</span>
              <span className="p-list__subtitle">{t('quickAdd.idea.body')}</span>
            </span>
          </button>
          <Link to={ROUTES.templates} className="p-choice" onClick={onClose}>
            <PIconBox icon={LayoutTemplate} color="var(--cat-projects)" />
            <span className="p-grow">
              <span className="p-list__title">{t('projects.fromTemplate')}</span>
              <span className="p-list__subtitle">{t('projects.fromTemplate.body')}</span>
            </span>
          </Link>
          <Link to={wizardPath()} className="p-choice" onClick={onClose}>
            <PIconBox icon={PenLine} color="var(--cat-admin)" />
            <span className="p-grow">
              <span className="p-list__title">{t('projects.fromScratch')}</span>
              <span className="p-list__subtitle">{t('projects.fromScratch.body')}</span>
            </span>
          </Link>
          <p className="p-caption">{t('quickAdd.more')}</p>
        </div>
      ) : (
        <form
          className="p-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <PField
            id="quick-title"
            label={view === 'task' ? t('quickAdd.task.label') : t('idea.title')}
            value={title}
            maxLength={view === 'task' ? 160 : 120}
            onChange={(e) => setTitle(e.target.value)}
          />
          {view === 'task' ? (
            <>
              <PSelect
                id="quick-project"
                label={t('quickAdd.task.project')}
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                options={[
                  { value: '', label: t('quickAdd.task.noProject') },
                  ...activeGoals.map((g) => ({ value: g.goal.id, label: g.goal.title })),
                ]}
              />
              <div className="p-field">
                <span className="p-field__label">{t('task.dueDate')}</span>
                <div className="p-chips">
                  <PChip selected={due === ''} onClick={() => setDue('')}>
                    {t('task.noDate')}
                  </PChip>
                  <PChip selected={due === today} onClick={() => setDue(today)}>
                    {t('date.today')}
                  </PChip>
                  <PChip selected={due === tomorrow} onClick={() => setDue(tomorrow)}>
                    {t('date.tomorrow')}
                  </PChip>
                </div>
                <input
                  className="p-input"
                  type="date"
                  aria-label={t('task.dueDate')}
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
            </>
          ) : (
            <PTextArea id="quick-note" label={t('idea.note')} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          )}
          {error && <PMessage tone="error">{error}</PMessage>}
          <div className="p-actions">
            <PButton type="submit">{view === 'task' ? t('quickAdd.task.save') : t('idea.save')}</PButton>
            <PButton variant="ghost" onClick={() => setView('menu')}>
              {t('common.back')}
            </PButton>
          </div>
        </form>
      )}
    </PSheet>
  );
}
