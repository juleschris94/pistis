import type { GoalTemplate } from '../../content/templates';
import type { GoalInput } from '../../domain/goals';
import type { Language } from '../settings/settings';
import type { GoalDraft } from './goalsRepository';

/**
 * Brouillon de projet utilisé par l'assistant de création.
 * Un modèle est copié dans la langue de l'utilisateur ; tout reste modifiable avant et après création.
 */
export interface WizardDraft {
  title: string;
  why: string;
  category: GoalInput['category'];
  priority: GoalInput['priority'];
  targetDate: string | null;
  visionText: string;
  visionArt: string | null;
  templateId: string | null;
  templateVersion: number | null;
  milestones: { title: string; tasks: string[] }[];
}

export function emptyWizardDraft(): WizardDraft {
  return {
    title: '',
    why: '',
    category: 'projects',
    priority: 2,
    targetDate: null,
    visionText: '',
    visionArt: 'summit',
    templateId: null,
    templateVersion: null,
    milestones: [],
  };
}

export function wizardDraftFromTemplate(tpl: GoalTemplate, language: Language): WizardDraft {
  return {
    title: tpl.title[language],
    why: '',
    category: tpl.category,
    priority: 2,
    targetDate: null,
    visionText: tpl.objective[language],
    visionArt: tpl.art,
    templateId: tpl.id,
    templateVersion: tpl.version,
    milestones: tpl.milestones.map((m) => ({ title: m.title[language], tasks: m.tasks.map((task) => task[language]) })),
  };
}

export function toGoalDraft(d: WizardDraft): GoalDraft {
  return {
    input: {
      title: d.title,
      why: d.why,
      category: d.category,
      status: 'active',
      priority: d.priority,
      targetDate: d.targetDate,
      visionText: d.visionText,
    },
    visionArt: d.visionArt,
    templateId: d.templateId,
    templateVersion: d.templateVersion,
    // Les étapes vidées par l'utilisateur ne sont pas créées.
    milestones: d.milestones
      .map((m) => ({ title: m.title.trim(), tasks: m.tasks.map((t) => t.trim()).filter(Boolean) }))
      .filter((m) => m.title.length > 0),
  };
}

/** Raccourci pour créer directement un projet depuis un modèle (tests, démonstration). */
export function draftFromTemplate(tpl: GoalTemplate, language: Language, why: string): GoalDraft {
  return toGoalDraft({ ...wizardDraftFromTemplate(tpl, language), why });
}
