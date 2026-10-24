import { Archive, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { projectPath, ROUTES } from '../../app/paths';
import { PButton, PCard, PField, PMessage, PSegmented, PTextArea, PTopBar } from '../../design-system/components';
import { GOAL_LIMITS, validateGoal, type Goal, type GoalInput, type GoalStatus } from '../../domain/goals';
import { useI18n } from '../../i18n';
import type { ProcessedImage } from '../media/imagePipeline';
import { deleteGoal, getGoal, updateGoal } from './goalsRepository';
import { ArtPicker, CategoryPicker, PriorityPicker } from './ui';

const EDITABLE_STATUSES: GoalStatus[] = ['active', 'paused', 'done'];

/** Modifier un projet : contenu, Pourquoi, vision, statut ; archiver ou supprimer. */
export function GoalEditScreen() {
  const { id = '' } = useParams();
  const { db } = useApp();
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getGoal(db, id).then((g) => alive && setGoal(g));
    return () => {
      alive = false;
    };
  }, [db, id]);
  if (goal === null) return <Navigate to={ROUTES.projects} replace />;
  if (goal === undefined) return null;
  return <GoalEditForm goal={goal} />;
}

function GoalEditForm({ goal }: { goal: Goal }) {
  const { t, formatError } = useI18n();
  const { db, reload } = useApp();
  const navigate = useNavigate();
  const [input, setInput] = useState<GoalInput>({
    title: goal.title,
    why: goal.why,
    category: goal.category,
    status: goal.status,
    priority: goal.priority,
    targetDate: goal.target_date,
    visionText: goal.vision_text,
    description: goal.description,
  });
  const [art, setArt] = useState(goal.vision_art);
  const [photo, setPhoto] = useState<ProcessedImage | null>(null);
  const [existingMedia, setExistingMedia] = useState(goal.vision_media_id);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errors = validateGoal(input);
  const update = (changes: Partial<GoalInput>) => setInput((i) => ({ ...i, ...changes }));

  async function save(status = input.status) {
    setError(null);
    const next = { ...input, status };
    const invalid = validateGoal(next);
    if (invalid.title) return setError(t(`goal.error.title.${invalid.title.code}`, { max: GOAL_LIMITS.title }));
    if (invalid.why) return setError(t(`goal.error.why.${invalid.why.code}`, { max: GOAL_LIMITS.why }));
    try {
      await updateGoal(db, goal.id, {
        input: next,
        visionArt: art,
        visionPhoto: photo ?? (existingMedia === null && goal.vision_media_id ? null : undefined),
      });
      reload();
      navigate(status === 'archived' ? ROUTES.projects : projectPath(goal.id));
    } catch (e) {
      setError(formatError(e));
    }
  }

  return (
    <>
      <PTopBar title={t('project.edit')} back={projectPath(goal.id)} backLabel={t('common.back')} />
      <form
        className="p-stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <PCard>
          <PField
            id="edit-title"
            label={t('goal.title')}
            value={input.title}
            maxLength={GOAL_LIMITS.title}
            error={errors.title ? t(`goal.error.title.${errors.title.code}`, { max: GOAL_LIMITS.title }) : undefined}
            onChange={(e) => update({ title: e.target.value })}
          />
          <PTextArea
            id="edit-why"
            label={t('goal.why')}
            value={input.why}
            maxLength={GOAL_LIMITS.why}
            hint={input.status === 'idea' ? t('goal.why.optionalForIdea') : undefined}
            error={errors.why ? t(`goal.error.why.${errors.why.code}`, { max: GOAL_LIMITS.why }) : undefined}
            onChange={(e) => update({ why: e.target.value })}
          />
          {input.status !== 'idea' && (
            <div className="p-field">
              <span className="p-field__label">{t('goal.status')}</span>
              <PSegmented
                label={t('goal.status')}
                options={(goal.status === 'archived' ? [...EDITABLE_STATUSES, 'archived' as const] : EDITABLE_STATUSES).map((s) => ({
                  value: s,
                  label: t(`goal.status.${s}`),
                }))}
                value={input.status}
                onChange={(status) => update({ status })}
              />
            </div>
          )}
          <CategoryPicker value={input.category} onChange={(category) => update({ category })} />
          <PriorityPicker value={input.priority} onChange={(priority) => update({ priority })} />
          <PField
            id="edit-date"
            type="date"
            label={t('goal.targetDate')}
            value={input.targetDate ?? ''}
            onChange={(e) => update({ targetDate: e.target.value || null })}
          />
        </PCard>
        <PCard title={t('goal.vision')}>
          <PTextArea
            id="edit-vision"
            label={t('goal.vision')}
            value={input.visionText}
            maxLength={GOAL_LIMITS.vision}
            onChange={(e) => update({ visionText: e.target.value })}
          />
          <ArtPicker
            art={art}
            onArt={setArt}
            photo={photo}
            onPhoto={setPhoto}
            existingMediaId={existingMedia}
            onRemoveExisting={() => setExistingMedia(null)}
          />
        </PCard>
        {error && <PMessage tone="error">{error}</PMessage>}
        <div className="p-actions">
          <PButton type="submit">{t('common.save')}</PButton>
          <PButton variant="ghost" onClick={() => navigate(projectPath(goal.id))}>
            {t('common.cancel')}
          </PButton>
        </div>
      </form>

      <PCard title={t('project.dangerZone')}>
        <div className="p-actions">
          {goal.status !== 'archived' && goal.status !== 'idea' && (
            <PButton variant="secondary" icon={Archive} onClick={() => void save('archived')}>
              {t('project.archive')}
            </PButton>
          )}
          {confirmDelete ? (
            <>
              <PButton
                variant="danger"
                icon={Trash2}
                onClick={async () => {
                  await deleteGoal(db, goal.id);
                  reload();
                  navigate(ROUTES.projects);
                }}
              >
                {t('project.delete.confirm')}
              </PButton>
              <PButton variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </PButton>
            </>
          ) : (
            <PButton variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>
              {t('project.delete')}
            </PButton>
          )}
        </div>
        <p className="p-caption">{t('project.delete.note')}</p>
      </PCard>
    </>
  );
}
