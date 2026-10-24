import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { PCard, PSegmented, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { saveSettings, THEMES, type ThemePreference } from './settings';

/** Thème clair / système / sombre et animations réduites. */
export function AppearanceScreen() {
  const { t } = useI18n();
  const { db, settings, reload } = useApp();

  const update = async (changes: { theme?: ThemePreference; reducedMotion?: boolean }) => {
    await saveSettings(db, changes);
    reload();
  };

  return (
    <>
      <PTopBar title={t('settings.appearance')} back={ROUTES.settings} backLabel={t('common.back')} />
      <PCard title={t('appearance.theme')}>
        <PSegmented
          label={t('appearance.theme')}
          options={THEMES.map((value) => ({ value, label: t(`theme.${value}.short`) }))}
          value={settings.theme}
          onChange={(theme) => void update({ theme })}
        />
        <p className="p-subtle">{t(`theme.${settings.theme}.hint`)}</p>
      </PCard>
      <PCard title={t('appearance.motion')}>
        <PSegmented
          label={t('appearance.motion')}
          options={[
            { value: 'normal', label: t('appearance.motion.normal') },
            { value: 'reduced', label: t('appearance.motion.reduced') },
          ]}
          value={settings.reducedMotion ? 'reduced' : 'normal'}
          onChange={(v) => void update({ reducedMotion: v === 'reduced' })}
        />
        <p className="p-subtle">{t('appearance.motion.hint')}</p>
      </PCard>
    </>
  );
}
