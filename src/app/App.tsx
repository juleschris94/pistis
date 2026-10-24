import { useEffect, useMemo, useState } from 'react';
import { RouterProvider } from 'react-router';
import type { Database } from '../data/database';
import type { ConnectionState } from '../data/web/webDatabase';
import { PButton, PMessage, PScreen } from '../design-system/components';
import { getMedia } from '../features/media/mediaRepository';
import { Onboarding } from '../features/onboarding/Onboarding';
import { getProfile, type Profile } from '../features/profile/profile';
import { detectLanguage, getSettings, type Settings } from '../features/settings/settings';
import { requestPersistence } from '../features/storage/storageStatus';
import { I18nProvider, useI18n } from '../i18n';
import { AppContext, type AppData } from './AppContext';
import { router } from './routes';
import { getDatabase, subscribeConnection, takeOverFromOtherTab } from './services';
import { applyReducedMotion, applyThemePreference } from './theme';
import { UpdateBanner } from './UpdateBanner';

const sessionStart = Date.now();
const browserLanguage = detectLanguage(typeof navigator === 'undefined' ? [] : navigator.languages);

interface Loaded {
  db: Database;
  profile: Profile | null;
  avatar: Uint8Array | null;
  avatarMime: string;
  settings: Settings;
}

async function loadData(): Promise<Loaded> {
  const db = await getDatabase();
  const [profile, settings] = await Promise.all([getProfile(db), getSettings(db, browserLanguage)]);
  const media = profile?.avatar_media_id ? await getMedia(db, profile.avatar_media_id) : null;
  return {
    db,
    profile,
    settings,
    avatar: media?.thumb ?? media?.data ?? null,
    avatarMime: media?.thumb ? 'image/jpeg' : (media?.mime ?? 'image/jpeg'),
  };
}

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'opening' });
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  // Incrémenté après chaque modification des données : déclenche un nouveau chargement.
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeConnection(setConnection), []);
  useEffect(() => {
    void requestPersistence();
  }, []);
  useEffect(() => {
    let alive = true;
    loadData().then(
      (loaded) => {
        if (!alive) return;
        applyThemePreference(loaded.settings.theme);
        applyReducedMotion(loaded.settings.reducedMotion);
        setData(loaded);
        setLoadError(null);
      },
      (e: unknown) => alive && setLoadError(e),
    );
    return () => {
      alive = false;
    };
  }, [version]);

  const language = data?.settings.language ?? browserLanguage;
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const appData = useMemo<AppData | null>(
    () =>
      data?.profile
        ? {
            db: data.db,
            profile: data.profile,
            avatar: data.avatar,
            avatarMime: data.avatarMime,
            settings: data.settings,
            sessionStart,
            reload: () => setVersion((v) => v + 1),
          }
        : null,
    [data],
  );

  return (
    <I18nProvider language={language}>
      <UpdateBanner inApp={appData !== null} />
      <Content connection={connection} data={data} appData={appData} loadError={loadError} reload={() => setVersion((v) => v + 1)} />
    </I18nProvider>
  );
}

function Content({
  connection,
  data,
  appData,
  loadError,
  reload,
}: {
  connection: ConnectionState;
  data: Loaded | null;
  appData: AppData | null;
  loadError: unknown;
  reload: () => void;
}) {
  const { t, formatError } = useI18n();

  if (connection.kind === 'yielded') {
    return (
      <PScreen title={t('tabs.yielded.title')}>
        <p className="p-subtle">{t('tabs.yielded.body')}</p>
        <div>
          <PButton onClick={() => location.reload()}>{t('tabs.yielded.action')}</PButton>
        </div>
      </PScreen>
    );
  }
  if (connection.kind === 'waiting-other-tab' && !data) {
    return (
      <PScreen title={t('tabs.waiting.title')}>
        <p className="p-subtle">{t('tabs.waiting.body')}</p>
        <div>
          <PButton onClick={takeOverFromOtherTab}>{t('tabs.waiting.action')}</PButton>
        </div>
      </PScreen>
    );
  }
  if (connection.kind === 'failed' || loadError) {
    return (
      <PScreen title={t('startup.failed.title')}>
        <PMessage tone="error">{formatError(connection.kind === 'failed' ? connection.error : loadError)}</PMessage>
        <p className="p-subtle">{t('startup.failed.body')}</p>
        <div>
          <PButton onClick={() => location.reload()}>{t('common.retry')}</PButton>
        </div>
      </PScreen>
    );
  }
  if (!data) {
    return (
      <PScreen title={t('startup.opening')}>
        <div className="p-spinner" aria-hidden="true" />
      </PScreen>
    );
  }
  if (!appData) return <Onboarding db={data.db} initialSettings={data.settings} onDone={reload} />;
  return (
    <AppContext.Provider value={appData}>
      <RouterProvider router={router} />
    </AppContext.Provider>
  );
}
