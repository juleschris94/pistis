import { ArrowRight, Check, Clock, Gauge, Target } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { ROUTES, templatePath, wizardPath } from '../../app/paths';
import { CATEGORY_IDS, type CategoryId } from '../../content/categories';
import { findTemplate, TEMPLATES, templateTaskCount } from '../../content/templates';
import { PButtonLink, PCard, PChip, PIconBox, PList, PListRow, PTopBar } from '../../design-system/components';
import { VisionArt } from '../../design-system/VisionArt';
import { useI18n } from '../../i18n';

/** Bibliothèque des modèles : des projets prêts à l'emploi, entièrement modifiables. */
export function TemplatesScreen() {
  const { t, tn, language } = useI18n();
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const categories = CATEGORY_IDS.filter((c) => TEMPLATES.some((tpl) => tpl.category === c));
  const shown = TEMPLATES.filter((tpl) => category === 'all' || tpl.category === category);

  return (
    <>
      <PTopBar title={t('templates.title')} subtitle={t('templates.subtitle')} back={ROUTES.projectNew} backLabel={t('common.back')} />
      <div className="p-chips p-chips--scroll" role="group" aria-label={t('templates.filter')}>
        <PChip selected={category === 'all'} onClick={() => setCategory('all')}>
          {t('templates.all')}
        </PChip>
        {categories.map((c) => (
          <PChip key={c} icon={CATEGORY_VISUALS[c].icon} selected={category === c} onClick={() => setCategory(c)}>
            {t(`category.${c}`)}
          </PChip>
        ))}
      </div>
      <PList label={t('templates.title')}>
        {shown.map((tpl) => (
          <PListRow
            key={tpl.id}
            icon={CATEGORY_VISUALS[tpl.category].icon}
            color={CATEGORY_VISUALS[tpl.category].color}
            title={tpl.title[language]}
            subtitle={`${tpl.description[language]} · ${tn('templates.steps', tpl.milestones.length)}, ${tn('templates.tasks', templateTaskCount(tpl))}`}
            to={templatePath(tpl.id)}
          />
        ))}
      </PList>
      <p className="p-caption">{t('templates.note')}</p>
    </>
  );
}

/** Aperçu d'un modèle avant de l'utiliser. */
export function TemplateScreen() {
  const { t, language } = useI18n();
  const { id } = useParams();
  const tpl = findTemplate(id);
  if (!tpl) return <Navigate to={ROUTES.templates} replace />;

  return (
    <>
      <PTopBar title={tpl.title[language]} back={ROUTES.templates} backLabel={t('common.back')} />
      <div className="p-hero-art">
        <VisionArt art={tpl.art} />
        <span className="p-vision-label">
          <Target aria-hidden="true" />
          {t('templates.objective')}
        </span>
        <p className="p-heading">{tpl.objective[language]}</p>
      </div>
      <p className="p-subtle">{tpl.description[language]}</p>

      <PCard title={t('templates.whyExamples')}>
        <ul className="p-features">
          {tpl.whyExamples.map((w) => (
            <li key={w.fr}>
              <Check aria-hidden="true" />
              <span>« {w[language]} »</span>
            </li>
          ))}
        </ul>
      </PCard>

      <PCard title={t('templates.plan')}>
        {tpl.milestones.map((m, index) => (
          <div key={m.title.fr} className="p-milestone">
            <p className="p-milestone__title">
              {t('templates.stepNumber', { n: index + 1 })} · {m.title[language]}
            </p>
            <ul className="p-features">
              {m.tasks.map((task) => (
                <li key={task.fr}>
                  <ArrowRight aria-hidden="true" />
                  <span>{task[language]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </PCard>

      <PList>
        <PListRow icon={Clock} color="var(--cat-habits)" title={t('templates.frequency')} subtitle={tpl.frequency[language]} />
        <PListRow icon={Gauge} color="var(--cat-finance)" title={t('templates.indicator')} subtitle={tpl.indicator[language]} />
      </PList>

      <PButtonLink to={wizardPath({ template: tpl.id })} block>
        {t('templates.use')}
        <ArrowRight aria-hidden="true" />
      </PButtonLink>
      <div className="p-row">
        <PIconBox icon={CATEGORY_VISUALS[tpl.category].icon} color={CATEGORY_VISUALS[tpl.category].color} soft />
        <p className="p-caption p-grow">{t('templates.editable')}</p>
      </div>
    </>
  );
}
