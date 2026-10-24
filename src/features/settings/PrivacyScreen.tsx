import { CloudOff, HardDrive, Lock, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useInstallState } from '../../app/install';
import { ROUTES } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import type { Database } from '../../data/database';
import { CURRENT_SCHEMA_VERSION, getSchemaVersion } from '../../data/migrations';
import { PButton, PCard, PCheck, PMessage, PTopBar, type CheckState } from '../../design-system/components';
import { useI18n, type MessageKey } from '../../i18n';
import { lastExportAt } from '../backup/backup';
import { readStorageStatus, requestPersistence } from '../storage/storageStatus';

async function collect(db: Database) {
  return {
    info: await db.info(),
    schema: await getSchemaVersion(db),
    storage: await readStorageStatus(),
    hasExport: (await lastExportAt(db)) !== null,
  };
}

const PROMISES: { icon: typeof Lock; key: MessageKey }[] = [
  { icon: HardDrive, key: 'privacy.promise.device' },
  { icon: UserX, key: 'privacy.promise.account' },
  { icon: CloudOff, key: 'privacy.promise.network' },
  { icon: Lock, key: 'privacy.promise.backup' },
];

/** Confidentialité (ce que PISTIS fait de tes données) et diagnostic technique de l'appareil. */
export function PrivacyScreen() {
  const { t, formatBytes, formatDate } = useI18n();
  const { db, profile, avatar, sessionStart } = useApp();
  const install = useInstallState();
  const [refresh, setRefresh] = useState(0);
  const [persistAsked, setPersistAsked] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(Boolean(navigator.serviceWorker?.controller));
  const status = useAsync(() => collect(db), [db, refresh]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const sw = () => setOfflineReady(Boolean(navigator.serviceWorker?.controller));
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    navigator.serviceWorker?.addEventListener('controllerchange', sw);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      navigator.serviceWorker?.removeEventListener('controllerchange', sw);
    };
  }, []);

  const restarted = profile.created_at < sessionStart;
  const persisted = status?.storage.persisted;
  const checks: { state: CheckState; title: string; detail: string }[] = [
    {
      state: !status ? 'wait' : status.info.mode === 'persistent' ? 'ok' : 'warn',
      title: t('diag.database'),
      detail: !status
        ? t('common.loading')
        : t(status.info.mode === 'persistent' ? 'diag.database.persistent' : 'diag.database.memory', {
            version: status.info.sqliteVersion,
          }),
    },
    {
      state: !status ? 'wait' : status.schema === CURRENT_SCHEMA_VERSION ? 'ok' : 'warn',
      title: t('diag.schema'),
      detail: status ? t('diag.schema.detail', { current: status.schema, latest: CURRENT_SCHEMA_VERSION }) : '…',
    },
    {
      state: persisted ? 'ok' : status ? 'warn' : 'wait',
      title: t('diag.persist'),
      detail: persisted
        ? t('diag.persist.granted', { used: formatBytes(status?.storage.usageBytes ?? null) })
        : persistAsked
          ? t('diag.persist.refused')
          : t('diag.persist.notYet'),
    },
    {
      state: offlineReady ? 'ok' : 'wait',
      title: t('diag.offline'),
      detail: offlineReady ? t(online ? 'diag.offline.readyOnline' : 'diag.offline.readyOffline') : t('diag.offline.notYet'),
    },
    {
      state: restarted ? 'ok' : 'wait',
      title: t('diag.restart'),
      detail: restarted
        ? t('diag.restart.ok', { date: formatDate(profile.created_at, { dateStyle: 'medium', timeStyle: 'short' }) })
        : t('diag.restart.notYet'),
    },
    {
      state: avatar ? 'ok' : 'wait',
      title: t('diag.photo'),
      detail: avatar ? t('diag.photo.ok') : t('diag.photo.notYet'),
    },
    {
      state: status?.hasExport ? 'ok' : 'wait',
      title: t('diag.backup'),
      detail: status?.hasExport ? t('diag.backup.ok') : t('diag.backup.notYet'),
    },
    {
      state: install === 'installed' ? 'ok' : 'wait',
      title: t('diag.install'),
      detail: install === 'installed' ? t('diag.install.ok') : t('diag.install.notYet'),
    },
  ];
  const done = checks.filter((c) => c.state === 'ok').length;
  const stateLabel = (s: CheckState) => t(s === 'ok' ? 'diag.state.ok' : s === 'warn' ? 'diag.state.warn' : 'diag.state.wait');

  return (
    <>
      <PTopBar title={t('settings.privacy')} back={ROUTES.settings} backLabel={t('common.back')} />

      <PCard title={t('privacy.title')}>
        <ul className="p-features">
          {PROMISES.map(({ icon: Icon, key }) => (
            <li key={key}>
              <Icon aria-hidden="true" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </PCard>

      <PCard title={t('diag.title', { done, total: checks.length })}>
        <p className="p-subtle">{t('diag.intro')}</p>
        <ul className="p-checklist">
          {checks.map((c) => (
            <PCheck key={c.title} {...c} stateLabel={stateLabel(c.state)} />
          ))}
        </ul>
        {status && !persisted && (
          <div className="p-actions">
            <PButton
              variant="secondary"
              onClick={async () => {
                await requestPersistence();
                setPersistAsked(true);
                setRefresh((r) => r + 1);
              }}
            >
              {t('diag.persist.ask')}
            </PButton>
          </div>
        )}
        {status?.info.mode === 'memory' && <PMessage tone="error">{t('diag.memoryWarning')}</PMessage>}
      </PCard>
    </>
  );
}
