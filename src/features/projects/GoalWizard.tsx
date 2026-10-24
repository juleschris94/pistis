import { ArrowLeft, ArrowRight, Eye, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { projectPath, ROUTES } from '../../app/paths';
import { findTemplate } from '../../content/templates';
import { PButton, PCard, PChip, PField, PMessage, PSteps, PTextArea, PTopBar } from '../../design-system/components';
import { GOAL_LIMITS, validateGoal } from '../../domain/goals';
import { useI18n } from '../../i18n';
import type { ProcessedImage } from '../media/imagePipeline';
import { emptyWizardDraft, toGoalDraft, wizardDraftFromTemplate, type WizardDraft } from './drafts';
import { createGoal, getGoalDetail, promoteIdea } from './goalsRepository';
import { ArtPicker, CategoryPicker, GoalArt, PriorityPicker } from './ui';

const STEPS = ['objective', 'why', 'vision', 'plan'] as const;
type Step = (typeof STEPS)[number];

/**
 * Création guidée d'un projet, au cœur de PISTIS : Objectif → Pourquoi → Vision → Plan.
 * Depuis un modèle, tout est prérempli et reste modifiable. Depuis une idée, elle devient un projet.
 */
export function GoalWizard() {
  const { t, language, formatError } = useI18n();
  const { db, reload, settings } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateId = params.get('modele');
  const ideaId = params.get('idee');
  const template = findTemplate(templateId);

  const [draft, setDraft] = useState<WizardDraft>(() =>
    template ? wizardDraftFromTemplate(template, language) : { ...emptyWizardDraft(), category: settings.categories[0] ?? 'projects' },
  );
  const [photo, setPhoto] = useState<ProcessedImage | null>(null);
  const [ideaMedia, setIdeaMedia] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('objective');
  const [error, setError] = useState<string | null>(null);
  // Erreur rattachée à un champ : affichée sous le champ, qui reçoit le focus (lecteurs d'écran compris).
  const [fieldError, setFieldError] = useState<{ field: 'title' | 'why'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Transformer une idée : on part de ce qui a déjà été noté.
  useEffect(() => {
    if (!ideaId) return;
    let alive = true;
    getGoalDetail(db, ideaId).then((detail) => {
      if (!alive || !detail) return;
      setDraft((d) => ({
        ...d,
        title: detail.goal.title,
        why: detail.goal.why,
        category: detail.goal.category,
        visionText: detail.goal.vision_text || detail.goal.description,
        visionArt: detail.goal.vision_art ?? d.visionArt,
      }));
      setIdeaMedia(detail.goal.vision_media_id);
    });
    return () => {
      alive = false;
    };
  }, [db, ideaId]);

  const index = STEPS.indexOf(step);
  const update = (changes: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const errors = validateGoal(toGoalDraft(draft).input);

  function goNext() {
    setError(null);
    setFieldError(null);
    const fail = (field: 'title' | 'why', message: string) => {
      setFieldError({ field, message });
      document.getElementById(field === 'title' ? 'goal-title' : 'goal-why')?.focus();
    };
    if (step === 'objective' && errors.title) return fail('title', t(`goal.error.title.${errors.title.code}`, { max: GOAL_LIMITS.title }));
    if (step === 'why' && errors.why) return fail('why', t(`goal.error.why.${errors.why.code}`, { max: GOAL_LIMITS.why }));
    if (step === 'plan') return void finish();
    setStep(STEPS[index + 1]);
    window.scrollTo(0, 0);
  }

  async function finish() {
    setSaving(true);
    try {
      // Photo : nouvelle photo, ou retrait de celle de l'idée, ou inchangée.
      const visionPhoto = photo ?? (ideaId && ideaMedia === null ? null : undefined);
      const goalDraft = { ...toGoalDraft(draft), visionPhoto };
      let id = ideaId;
      if (ideaId) await promoteIdea(db, ideaId, goalDraft);
      else id = await createGoal(db, goalDraft);
      reload();
      navigate(projectPath(id as string), { replace: true });
    } catch (e) {
      setError(formatError(e));
      setSaving(false);
    }
  }

  const back = index === 0 ? (ideaId ? projectPath(ideaId) : template ? ROUTES.templates : ROUTES.projectNew) : undefined;

  return (
    <>
      <PTopBar
        title={ideaId ? t('wizard.title.idea') : t('wizard.title')}
        subtitle={template ? t('wizard.fromTemplate', { name: template.title[language] }) : undefined}
        back={back}
        backLabel={t('common.back')}
      />
      <PSteps current={index + 1} total={STEPS.length} label={t('onboarding.progress', { current: index + 1, total: STEPS.length })} />

      <form
        className="p-stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        {step === 'objective' && (
          <PCard title={t('wizard.objective.title')}>
            <p className="p-subtle">{t('wizard.objective.body')}</p>
            <PField
              id="goal-title"
              label={t('goal.title')}
              value={draft.title}
              maxLength={GOAL_LIMITS.title}
              error={fieldError?.field === 'title' ? fieldError.message : undefined}
              onChange={(e) => update({ title: e.target.value })}
            />
            <CategoryPicker value={draft.category} onChange={(category) => update({ category })} />
            <PriorityPicker value={draft.priority} onChange={(priority) => update({ priority })} />
            <PField
              id="goal-date"
              type="date"
              label={t('goal.targetDate')}
              hint={t('goal.targetDate.hint')}
              value={draft.targetDate ?? ''}
              onChange={(e) => update({ targetDate: e.target.value || null })}
            />
          </PCard>
        )}

        {step === 'why' && (
          <PCard title={t('wizard.why.title')} variant="vision">
            <p className="p-subtle">{t('wizard.why.body')}</p>
            <PTextArea
              id="goal-why"
              label={t('goal.why')}
              value={draft.why}
              maxLength={GOAL_LIMITS.why}
              placeholder={t('wizard.why.placeholder')}
              error={fieldError?.field === 'why' ? fieldError.message : undefined}
              onChange={(e) => update({ why: e.target.value })}
            />
            {template && (
              <div className="p-stack p-stack--tight">
                <span className="p-field__label">{t('wizard.why.examples')}</span>
                <div className="p-chips">
                  {template.whyExamples.map((w) => (
                    <PChip
                      key={w.fr}
                      icon={Sparkles}
                      onClick={() => {
                        update({ why: w[language] });
                        setFieldError(null);
                      }}
                    >
                      {w[language]}
                    </PChip>
                  ))}
                </div>
              </div>
            )}
          </PCard>
        )}

        {step === 'vision' && (
          <>
            <div className="p-hero-art">
              <GoalArt mediaId={photo ? null : ideaMedia} art={draft.visionArt} photo={photo} />
              <span className="p-vision-label">
                <Eye aria-hidden="true" />
                {t('vision.imagined')}
              </span>
              <p className="p-heading">{draft.visionText || draft.title}</p>
            </div>
            <PCard title={t('wizard.vision.title')}>
              <p className="p-subtle">{t('wizard.vision.body')}</p>
              <PTextArea
                id="goal-vision"
                label={t('goal.vision')}
                value={draft.visionText}
                maxLength={GOAL_LIMITS.vision}
                placeholder={t('wizard.vision.placeholder')}
                onChange={(e) => update({ visionText: e.target.value })}
              />
              <ArtPicker
                art={draft.visionArt}
                onArt={(visionArt) => update({ visionArt })}
                photo={photo}
                onPhoto={setPhoto}
                existingMediaId={ideaMedia}
                onRemoveExisting={() => setIdeaMedia(null)}
              />
              <p className="p-caption">{t('vision.disclaimer')}</p>
            </PCard>
          </>
        )}

        {step === 'plan' && (
          <PCard title={t('wizard.plan.title')}>
            <p className="p-subtle">{t(draft.milestones.length ? 'wizard.plan.body' : 'wizard.plan.empty')}</p>
            <PlanEditor milestones={draft.milestones} onChange={(milestones) => update({ milestones })} />
          </PCard>
        )}

        {error && <PMessage tone="error">{error}</PMessage>}

        <div className="p-actions">
          {index > 0 && (
            <PButton
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => {
                setFieldError(null);
                setStep(STEPS[index - 1]);
              }}
              disabled={saving}
            >
              {t('common.back')}
            </PButton>
          )}
          <PButton type="submit" iconAfter={step === 'plan' ? undefined : ArrowRight} disabled={saving}>
            {step === 'plan' ? (saving ? t('common.saving') : ideaId ? t('wizard.finish.idea') : t('wizard.finish')) : t('common.next')}
          </PButton>
        </div>
      </form>
    </>
  );
}

/** Édition du plan avant création : étapes et tâches modifiables, ajoutables, supprimables. */
function PlanEditor({ milestones, onChange }: { milestones: WizardDraft['milestones']; onChange: (m: WizardDraft['milestones']) => void }) {
  const { t } = useI18n();
  const set = (i: number, value: WizardDraft['milestones'][number]) => onChange(milestones.map((m, j) => (j === i ? value : m)));
  return (
    <div className="p-stack">
      {milestones.map((m, i) => (
        <fieldset key={i} className="p-milestone p-fieldset">
          <legend className="p-visually-hidden">{t('templates.stepNumber', { n: i + 1 })}</legend>
          <div className="p-inline-form">
            <input
              className="p-input p-input--strong"
              aria-label={t('wizard.plan.stepName', { n: i + 1 })}
              value={m.title}
              maxLength={GOAL_LIMITS.milestone}
              onChange={(e) => set(i, { ...m, title: e.target.value })}
            />
            <button
              type="button"
              className="p-icon-button p-icon-button--plain p-icon-button--small"
              aria-label={t('wizard.plan.removeStep', { n: i + 1 })}
              onClick={() => onChange(milestones.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
          <ul className="p-tasks p-tasks--indented">
            {m.tasks.map((task, k) => (
              <li key={k} className="p-inline-form">
                <input
                  className="p-input"
                  aria-label={t('wizard.plan.taskName', { n: k + 1, step: i + 1 })}
                  value={task}
                  maxLength={GOAL_LIMITS.task}
                  onChange={(e) => set(i, { ...m, tasks: m.tasks.map((x, l) => (l === k ? e.target.value : x)) })}
                />
                <button
                  type="button"
                  className="p-icon-button p-icon-button--plain p-icon-button--small"
                  aria-label={t('task.delete', { title: task })}
                  onClick={() => set(i, { ...m, tasks: m.tasks.filter((_, l) => l !== k) })}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div>
            <PChip icon={Plus} onClick={() => set(i, { ...m, tasks: [...m.tasks, ''] })}>
              {t('wizard.plan.addTask')}
            </PChip>
          </div>
        </fieldset>
      ))}
      <div>
        <PButton variant="secondary" icon={Plus} onClick={() => onChange([...milestones, { title: '', tasks: [''] }])}>
          {t('wizard.plan.addStep')}
        </PButton>
      </div>
    </div>
  );
}
