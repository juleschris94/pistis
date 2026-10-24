import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { APP_VERSION } from '../../app/services';
import { PCard, PMessage, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { BACKUP_REMINDER_DAYS } from '../backup/backup';
import { ExportSection } from '../backup/ExportSection';
import { RestoreSection } from '../backup/RestoreSection';
import { freshnessText, useBackupFreshness } from '../backup/useBackupFreshness';

export function BackupScreen() {
  const i18n = useI18n();
  const { t } = i18n;
  const { db, reload } = useApp();
  const [refreshKey, setRefreshKey] = useState(0);
  const freshness = useBackupFreshness(refreshKey);

  return (
    <>
      <PTopBar title={t('settings.backup')} subtitle={t('backup.intro')} back={ROUTES.settings} backLabel={t('common.back')} />
      {freshness && (
        <PMessage tone={freshness.kind === 'recent' ? 'ok' : 'attention'}>
          {freshnessText(i18n, freshness)}
          {freshness.kind === 'due' && ` ${t('backup.freshness.due', { days: BACKUP_REMINDER_DAYS })}`}
          {freshness.kind === 'never' && ` ${t('backup.freshness.first')}`}
        </PMessage>
      )}
      {import.meta.env.MODE === 'demo' && <PMessage tone="attention">{t('demo.backup')}</PMessage>}
      <PCard title={t('backup.export.title')}>
        <ExportSection db={db} appVersion={APP_VERSION} onDone={() => setRefreshKey((k) => k + 1)} />
      </PCard>
      <PCard title={t('backup.restore.title')}>
        <p className="p-subtle">{t('backup.restore.body')}</p>
        <RestoreSection db={db} onRestored={reload} />
      </PCard>
    </>
  );
}
