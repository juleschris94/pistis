import { useCallback, useEffect, useState } from 'react';
import type { Database, StorageInfo } from '../data/database';
import { CURRENT_SCHEMA_VERSION, getSchemaVersion } from '../data/migrations';
import { PAvatar, PButton, PCard, PCheck, PMessage, type CheckState } from '../design-system/components';
import { BackupPanel } from '../features/backup/BackupPanel';
import { ProfileForm } from '../features/profile/ProfileForm';
import type { Profile } from '../features/profile/profile';
import { formatBytes, readStorageStatus, requestPersistence, type BrowserStorageStatus } from '../features/storage/storageStatus';
import { APP_VERSION } from './services';

interface Props {
  db: Database;
  profile: Profile;
  avatar: Uint8Array | null;
  sessionStart: number;
  onProfileChanged: () => void;
}

/**
 * Écran du jalon M0 : il prouve, sur l'appareil réel, que les fondations techniques tiennent.
 * Il sera remplacé par l'Accueil en M1-M3.
 */
export function TestBench({ db, profile, avatar, sessionStart, onProfileChanged }: Props) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [schema, setSchema] = useState<number | null>(null);
  const [storage, setStorage] = useState<BrowserStorageStatus | null>(null);
  const [exports, setExports] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(Boolean(navigator.serviceWorker?.controller));
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    setInfo(await db.info());
    setSchema(await getSchemaVersion(db));
    setStorage(await readStorageStatus());
    const rows = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM backup_log WHERE kind = 'export'");
    setExports(Number(rows[0]?.n ?? 0));
  }, [db]);

  useEffect(() => {
    void refresh();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const sw = () => setOfflineReady(Boolean(navigator.serviceWorker?.controller));
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    navigator.serviceWorker?.addEventListener('controllerchange', sw);
    navigator.serviceWorker?.ready.then(sw);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      navigator.serviceWorker?.removeEventListener('controllerchange', sw);
    };
  }, [refresh]);

  const persistedBeforeThisSession = profile.created_at < sessionStart;

  const checks: { state: CheckState; title: string; detail: string }[] = [
    {
      state: info ? (info.mode === 'persistent' ? 'ok' : 'warn') : 'wait',
      title: 'Base SQLite persistante',
      detail: info ? `${info.detail} · SQLite ${info.sqliteVersion}` : 'Ouverture de la base…',
    },
    {
      state: schema === null ? 'wait' : schema === CURRENT_SCHEMA_VERSION ? 'ok' : 'warn',
      title: 'Migrations du schéma',
      detail: schema === null ? '…' : `Schéma en version ${schema} sur ${CURRENT_SCHEMA_VERSION}`,
    },
    {
      state: storage?.persisted ? 'ok' : storage ? 'warn' : 'wait',
      title: 'Stockage protégé contre l’effacement',
      detail: storage?.persisted
        ? `Accordé par le navigateur · ${formatBytes(storage.usageBytes)} utilisés`
        : 'Non accordé pour l’instant : installe PISTIS sur l’écran d’accueil, puis appuie sur « Demander ».',
    },
    {
      state: offlineReady ? 'ok' : 'wait',
      title: 'Fonctionnement hors ligne',
      detail: offlineReady
        ? `Application en cache · ${online ? 'en ligne actuellement' : 'hors ligne actuellement'}`
        : 'Mise en cache au premier chargement ; recharge la page une fois.',
    },
    {
      state: persistedBeforeThisSession ? 'ok' : 'wait',
      title: 'Profil conservé après redémarrage',
      detail: persistedBeforeThisSession
        ? `Profil créé le ${new Date(profile.created_at).toLocaleString('fr-FR')}, relu depuis la base.`
        : 'Profil créé à l’instant : ferme puis rouvre PISTIS pour le vérifier.',
    },
    {
      state: avatar ? 'ok' : 'wait',
      title: 'Photo importée sans métadonnées',
      detail: avatar ? 'Photo ré-encodée et stockée localement.' : 'Ajoute une photo de profil pour le vérifier.',
    },
    {
      state: exports > 0 ? 'ok' : 'wait',
      title: 'Sauvegarde exportée et relue',
      detail: exports > 0 ? `${exports} sauvegarde(s) réalisée(s) sur cet appareil.` : 'Utilise « Tester la sauvegarde » ci-dessous.',
    },
  ];
  const done = checks.filter((c) => c.state === 'ok').length;

  return (
    <main className="p-page">
      <header className="p-header">
        <div>
          <p className="p-logo">PISTIS</p>
          <h1 className="p-greeting">Bienvenue, {profile.nickname} ! 👋</h1>
          {profile.phrase && <p className="p-subtle">{profile.phrase}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}
          aria-label="Modifier mon profil"
        >
          <PAvatar image={avatar} name={profile.nickname} />
        </button>
      </header>

      {editing && (
        <ProfileForm
          db={db}
          profile={profile}
          currentAvatar={avatar}
          submitLabel="Enregistrer"
          onSaved={() => {
            setEditing(false);
            onProfileChanged();
          }}
        />
      )}

      <PCard title={`Vérifications du jalon M0 · ${done}/${checks.length}`}>
        <p className="p-subtle">Cet écran teste les fondations sur ton appareil. Il sera remplacé par l’Accueil.</p>
        {checks.map((c) => (
          <PCheck key={c.title} {...c} />
        ))}
        {!storage?.persisted && (
          <div className="p-actions">
            <PButton
              variant="secondary"
              onClick={async () => {
                await requestPersistence();
                await refresh();
              }}
            >
              Demander le stockage protégé
            </PButton>
          </div>
        )}
        {info?.mode === 'memory' && (
          <PMessage tone="error">
            Ce navigateur n’offre pas de stockage durable (navigation privée ?). Tes données seront perdues à la fermeture.
          </PMessage>
        )}
      </PCard>

      <BackupPanel
        db={db}
        appVersion={APP_VERSION}
        onExported={refresh}
        onRestored={() => {
          onProfileChanged();
          void refresh();
        }}
      />

      <p className="p-subtle" style={{ textAlign: 'center' }}>
        PISTIS {APP_VERSION} · données stockées uniquement sur cet appareil
      </p>
    </main>
  );
}
