import { useApp } from '../../app/AppContext';
import { useAsync } from '../../app/useAsync';
import type { I18n } from '../../i18n';
import { backupFreshness, lastExportAt, type BackupFreshness } from './backup';

/** Âge de la dernière sauvegarde, rechargé à chaque modification des données. */
export function useBackupFreshness(refreshKey: unknown = null): BackupFreshness | undefined {
  const { db, settings } = useApp();
  return useAsync(async () => backupFreshness(await lastExportAt(db), Date.now()), [db, settings, refreshKey]);
}

export function freshnessText({ t, tn }: I18n, f: BackupFreshness): string {
  if (f.kind === 'never') return t('backup.freshness.never');
  if (f.days === 0) return t('backup.freshness.today');
  if (f.days === 1) return t('backup.freshness.yesterday');
  return tn('backup.freshness.days', f.days);
}
