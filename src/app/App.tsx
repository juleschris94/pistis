import { useCallback, useEffect, useState } from 'react';
import type { Database } from '../data/database';
import { PMessage } from '../design-system/components';
import { getMedia } from '../features/media/mediaRepository';
import { getProfile, type Profile } from '../features/profile/profile';
import { requestPersistence } from '../features/storage/storageStatus';
import { getServices } from './services';
import { TestBench } from './TestBench';
import { Welcome } from './Welcome';

const sessionStart = Date.now();

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; db: Database; profile: Profile | null; avatar: Uint8Array | null };

export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    try {
      const { db } = await getServices();
      const profile = await getProfile(db);
      const media = profile?.avatar_media_id ? await getMedia(db, profile.avatar_media_id) : null;
      setState({ kind: 'ready', db, profile, avatar: media?.thumb ?? media?.data ?? null });
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    void load();
    void requestPersistence();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <main className="p-welcome" aria-busy="true">
        <p className="p-logo">PISTIS</p>
        <p className="p-subtle">Ouverture de ton espace…</p>
      </main>
    );
  }
  if (state.kind === 'error') {
    return (
      <main className="p-page">
        <PMessage tone="error">Impossible d’ouvrir les données : {state.message}</PMessage>
      </main>
    );
  }
  if (!state.profile) return <Welcome db={state.db} onDone={() => void load()} />;
  return (
    <TestBench db={state.db} profile={state.profile} avatar={state.avatar} sessionStart={sessionStart} onProfileChanged={() => void load()} />
  );
}
