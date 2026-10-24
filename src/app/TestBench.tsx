import { useEffect, useState } from 'react';
import type { Database, StorageInfo } from '../data/database';
import { CURRENT_SCHEMA_VERSION, getSchemaVersion } from '../data/migrations';
import { PAvatar, PButton, PCard, PCheck, PMessage, type CheckState } from '../design-system/components';
import { BackupPanel } from '../features/backup/BackupPanel';
import { lastExportAt } from '../features/backup/backup';
import { ProfileForm } from '../features/profile/ProfileForm';
import type { Profile } from '../features/profile/profile';
import { formatBytes, readStorageStatus, requestPersistence, type BrowserStorageStatus } from '../features/storage/storageStatus';
import { APP_VERSION } from './services';

interface Status {
  info: StorageInfo;
  schema: number;
  storage: BrowserStorageStatus;
  hasExport: boolean;
}

async function collectStatus(db: Database): Promise<Status> {
  return {
    info: await db.info(),
    schema: await getSchemaVersion(db),
    storage: await readStorageStatus(),
    hasExport: (await lastExportAt(db)) !== null,
  };
}

interface Props {
  db: Database;
  profile: Profile;
  avatar: Uint8Array | null;
  avatarMime: string;
  sessionStart: number;
  onDataChanged: () => void;
}

/**
 * Écran du jalon M0 : il prouve, sur l'appareil réel, que les fondations techniques tiennent.
 * Il sera remplacé par l'Accueil à partir du jalon M1.
 */
export function TestBench({ db, profile, avatar, avatarMime, sessionStart, onDataChanged }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [verifiedThisSession, setVerifiedThisSession] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(Boolean(navigator.serviceWorker?.controller));
  const [editing, setEditing] = useState(false);
  const [persistAsked, setPersistAsked] = useState(false);

  const refresh = async () => setStatus(await collectStatus(db));

  useEffect(() => {
    let alive = true;
    collectStatus(db).then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, [db]);

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

  const info = status?.info ?? null;
  const schema = status?.schema ?? null;
  const storage = status?.storage ?? null;
  const hasExport = status?.hasExport ?? false;
  const restartedSinceCreation = profile.created_at < sessionStart;

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
        : persistAsked
          ? 'Refusé pour l’instant. Chrome l’accorde en général une fois PISTIS installé et utilisé régulièrement.'
          : 'Pas encore accordé. Installe PISTIS sur l’écran d’accueil, puis appuie sur « Demander ».',
    },
    {
      state: offlineReady ? 'ok' : 'wait',
      title: 'Fonctionnement hors ligne',
      detail: offlineReady
        ? `Application en cache · ${online ? 'en ligne actuellement' : 'hors ligne actuellement'}`
        : 'Mise en cache au premier chargement : recharge la page une fois.',
    },
    {
      state: restartedSinceCreation ? 'ok' : 'wait',
      title: 'Profil conservé après redémarrage',
      detail: restartedSinceCreation
        ? `Profil créé le ${new Date(profile.created_at).toLocaleString('fr-FR')}, relu depuis la base.`
        : 'Profil créé à l’instant : ferme puis rouvre PISTIS pour le vérifier.',
    },
    {
      state: avatar ? 'ok' : 'wait',
      title: 'Photo importée sans métadonnées',
      detail: avatar ? 'Photo ré-encodée et stockée localement.' : 'Ajoute une photo de profil pour le vérifier.',
    },
    {
      state: hasExport || verifiedThisSession ? 'ok' : 'wait',
      title: 'Sauvegarde produite et relue',
      detail: hasExport
        ? 'Au moins une sauvegarde a été enregistrée sur cet appareil.'
        : verifiedThisSession
          ? 'Test de sauvegarde réussi. Pense à exporter une vraie sauvegarde.'
          : 'Utilise « Tester la sauvegarde » ci-dessous.',
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
          className="p-avatar-button"
          onClick={() => setEditing((v) => !v)}
          aria-label={editing ? 'Fermer la modification du profil' : 'Modifier mon profil'}
          aria-expanded={editing}
        >
          <PAvatar image={avatar} mime={avatarMime} name={profile.nickname} />
        </button>
      </header>

      {editing && (
        <ProfileForm
          db={db}
          profile={profile}
          currentAvatar={avatar}
          submitLabel="Enregistrer"
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onDataChanged();
          }}
        />
      )}

      <PCard title={`Vérifications du jalon M0 · ${done}/${checks.length}`}>
        <p className="p-subtle">Cet écran teste les fondations sur ton appareil. Il sera remplacé par l’Accueil.</p>
        <ul className="p-checklist">
          {checks.map((c) => (
            <PCheck key={c.title} {...c} />
          ))}
        </ul>
        {storage && !storage.persisted && (
          <div className="p-actions">
            <PButton
              variant="secondary"
              onClick={async () => {
                await requestPersistence();
                setPersistAsked(true);
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
        onBackupVerified={() => {
          setVerifiedThisSession(true);
          void refresh();
        }}
        onDataReplaced={() => {
          onDataChanged();
          void refresh();
        }}
      />

      <p className="p-footer">PISTIS {APP_VERSION} · données stockées uniquement sur cet appareil</p>
    </main>
  );
}
