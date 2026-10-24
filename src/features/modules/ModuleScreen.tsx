import { CalendarDays, CheckCircle2, FolderKanban, ListChecks, Wallet, type LucideIcon } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { CATEGORY_TAB } from '../../content/categories';
import { CATEGORY_MILESTONE, TAB_MILESTONE } from '../../content/roadmap';
import { PBadge, PCard, PEmpty, PList, PListRow, PTopBar } from '../../design-system/components';
import { useI18n, type MessageKey } from '../../i18n';

type ModuleId = keyof typeof TAB_MILESTONE;

const MODULES: Record<ModuleId, { icon: LucideIcon; features: MessageKey[] }> = {
  projects: {
    icon: FolderKanban,
    features: ['module.projects.f1', 'module.projects.f2', 'module.projects.f3', 'module.projects.f4'],
  },
  planning: {
    icon: CalendarDays,
    features: ['module.planning.f1', 'module.planning.f2', 'module.planning.f3', 'module.planning.f4'],
  },
  tracking: {
    icon: ListChecks,
    features: ['module.tracking.f1', 'module.tracking.f2', 'module.tracking.f3', 'module.tracking.f4'],
  },
  finance: {
    icon: Wallet,
    features: ['module.finance.f1', 'module.finance.f2', 'module.finance.f3', 'module.finance.f4'],
  },
};

/**
 * Onglet d'un module pas encore construit. Il dit honnêtement ce qui arrive et quand,
 * sans fausses données de démonstration.
 */
export function ModuleScreen({ module }: { module: ModuleId }) {
  const { t } = useI18n();
  const { settings } = useApp();
  const { icon, features } = MODULES[module];
  const trackingCategories = settings.categories.filter(
    (id): id is 'habits' | 'admin' | 'housing' | 'family' => CATEGORY_TAB[id] === 'tracking',
  );

  return (
    <>
      <PTopBar
        title={t(`nav.${module}`)}
        actions={<PBadge tone="brand">{t('module.milestone', { milestone: TAB_MILESTONE[module] })}</PBadge>}
      />
      <PCard>
        <PEmpty icon={icon} title={t(`module.${module}.title`)}>
          <p className="p-subtle">{t(`module.${module}.intro`)}</p>
        </PEmpty>
        <ul className="p-features">
          {features.map((key) => (
            <li key={key}>
              <CheckCircle2 aria-hidden="true" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </PCard>
      {module === 'tracking' && trackingCategories.length > 0 && (
        <section className="p-stack p-stack--tight" aria-labelledby="tracking-sections">
          <h2 className="p-subheading" id="tracking-sections">
            {t('module.tracking.sections')}
          </h2>
          <PList>
            {trackingCategories.map((id) => (
              <PListRow
                key={id}
                icon={CATEGORY_VISUALS[id].icon}
                color={CATEGORY_VISUALS[id].color}
                title={t(`category.${id}`)}
                subtitle={t(`module.tracking.${id}`)}
                trailing={<PBadge>{CATEGORY_MILESTONE[id]}</PBadge>}
              />
            ))}
          </PList>
        </section>
      )}
      <p className="p-caption">{t('module.honest')}</p>
    </>
  );
}
