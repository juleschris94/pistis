import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { ROUTES } from '../../app/paths';
import { CATEGORY_IDS, type CategoryId } from '../../content/categories';
import { PMessage, PTile, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { saveSettings } from './settings';

/** Activer ou masquer des domaines. Rien n'est supprimé : un domaine masqué peut revenir à tout moment. */
export function CategoriesScreen() {
  const { t, formatError } = useI18n();
  const { db, settings, reload } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [lastOne, setLastOne] = useState(false);

  async function toggle(id: CategoryId) {
    const active = settings.categories.includes(id);
    if (active && settings.categories.length === 1) {
      setLastOne(true);
      return;
    }
    setLastOne(false);
    try {
      await saveSettings(db, { categories: active ? settings.categories.filter((c) => c !== id) : [...settings.categories, id] });
      reload();
    } catch (e) {
      setError(formatError(e));
    }
  }

  return (
    <>
      <PTopBar
        title={t('settings.categories')}
        subtitle={t('settings.categories.body')}
        back={ROUTES.settings}
        backLabel={t('common.back')}
      />
      <div className="p-tiles" role="group" aria-label={t('settings.categories')}>
        {CATEGORY_IDS.map((id) => (
          <PTile
            key={id}
            icon={CATEGORY_VISUALS[id].icon}
            color={CATEGORY_VISUALS[id].color}
            label={t(`category.${id}`)}
            selected={settings.categories.includes(id)}
            onToggle={() => void toggle(id)}
          />
        ))}
      </div>
      {lastOne && <PMessage tone="info">{t('settings.categories.lastOne')}</PMessage>}
      {error && <PMessage tone="error">{error}</PMessage>}
      <p className="p-caption">{t('settings.categories.note')}</p>
    </>
  );
}
