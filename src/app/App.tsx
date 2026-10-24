import { useEffect, useState } from 'react';
import type { Database } from '../data/database';
import type { ConnectionState } from '../data/web/webDatabase';
import { PButton, PMessage, PScreen } from '../design-system/components';
import { getMedia } from '../features/media/mediaRepository';
import { getProfile, type Profile } from '../features/profile/profile';
import { requestPersistence } from '../features/storage/storageStatus';
import { getDatabase, subscribeConnection, takeOverFromOtherTab } from './services';
import { TestBench } from './TestBench';
import { Welcome } from './Welcome';

const sessionStart = Date.now();

type Loaded = { db: Database; profile: Profile | null; avatar: Uint8Array | null; avatarMime: string };

async function loadData(): Promise<Loaded> {
  const db = await getDatabase();
  const profile = await getProfile(db);
  const media = profile?.avatar_media_id ? await getMedia(db, profile.avatar_media_id) : null;
  return {
    db,
    profile,
    avatar: media?.thumb ?? media?.data ?? null,
    avatarMime: media?.thumb ? 'image/jpeg' : (media?.mime ?? 'image/jpeg'),
  };
}

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'opening' });
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Incrémenté après chaque modification des données : déclenche un nouveau chargement.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => subscribeConnection(setConnection), []);
  useEffect(() => {
    void requestPersistence();
  }, []);
  useEffect(() => {
    let alive = true;
    loadData().then(
      (loaded) => {
        if (!alive) return;
        setData(loaded);
        setLoadError(null);
      },
      (e: Error) => alive && setLoadError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [version]);

  if (connection.kind === 'yielded') {
    return (
      <PScreen title="PISTIS est ouvert dans un autre onglet">
        <p className="p-subtle">Pour protéger tes données, PISTIS ne s’utilise que dans un seul onglet à la fois.</p>
        <div>
          <PButton onClick={() => location.reload()}>Utiliser ici</PButton>
        </div>
      </PScreen>
    );
  }
  if (connection.kind === 'waiting-other-tab' && !data) {
    return (
      <PScreen title="PISTIS est déjà ouvert ailleurs">
        <p className="p-subtle">
          Un autre onglet ou une autre fenêtre utilise tes données. Ferme-le, ou continue ici : l’autre onglet se mettra en pause.
        </p>
        <div>
          <PButton onClick={takeOverFromOtherTab}>Continuer ici</PButton>
        </div>
      </PScreen>
    );
  }
  if (connection.kind === 'failed' || loadError) {
    return (
      <PScreen title="Impossible d’ouvrir tes données">
        <PMessage tone="error">{connection.kind === 'failed' ? connection.error : loadError}</PMessage>
        <p className="p-subtle">
          Tes données ne sont pas effacées. Recharge la page ; si le problème persiste, ferme les autres onglets de PISTIS.
        </p>
        <div>
          <PButton onClick={() => location.reload()}>Réessayer</PButton>
        </div>
      </PScreen>
    );
  }
  if (!data) {
    return (
      <PScreen title="Ouverture de ton espace…">
        <div className="p-spinner" aria-hidden="true" />
      </PScreen>
    );
  }
  if (!data.profile) return <Welcome db={data.db} onDone={reload} />;
  return (
    <TestBench
      db={data.db}
      profile={data.profile}
      avatar={data.avatar}
      avatarMime={data.avatarMime}
      sessionStart={sessionStart}
      onDataChanged={reload}
    />
  );
}
