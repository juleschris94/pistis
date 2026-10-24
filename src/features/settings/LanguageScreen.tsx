import { Check } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { PList, PListRow, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { LANGUAGES, saveSettings } from './settings';

export function LanguageScreen() {
  const { t } = useI18n();
  const { db, settings, reload } = useApp();
  return (
    <>
      <PTopBar title={t('settings.language')} back={ROUTES.settings} backLabel={t('common.back')} />
      <PList label={t('settings.language')}>
        {LANGUAGES.map((language) => (
          <PListRow
            key={language}
            title={t(`language.${language}`)}
            subtitle={language === settings.language ? t('language.current') : undefined}
            trailing={language === settings.language ? <Check aria-hidden="true" className="p-list__chevron" /> : undefined}
            onClick={async () => {
              await saveSettings(db, { language });
              reload();
            }}
          />
        ))}
      </PList>
    </>
  );
}
