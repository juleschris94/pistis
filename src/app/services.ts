import { migrate } from '../data/migrations';
import { createWebDatabase, type ConnectionState, type WebDatabase } from '../data/web/webDatabase';

export const APP_VERSION = '0.1.0-m1';

type Listener = (state: ConnectionState) => void;

let db: WebDatabase | null = null;
let ready: Promise<WebDatabase> | null = null;
let lastState: ConnectionState = { kind: 'opening' };
const listeners = new Set<Listener>();

/** Suit l'état de la connexion à la base (ouverture, autre onglet, panne). */
export function subscribeConnection(listener: Listener): () => void {
  listeners.add(listener);
  listener(lastState);
  return () => listeners.delete(listener);
}

/** Ouvre la base une seule fois et applique les migrations au démarrage. */
export function getDatabase(): Promise<WebDatabase> {
  if (!ready) {
    db = createWebDatabase((state) => {
      lastState = state;
      for (const l of listeners) l(state);
    });
    const opened = db;
    ready = migrate(opened).then(() => opened);
    // En cas d'échec, on permet une nouvelle tentative au lieu de garder l'erreur pour toujours.
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export function takeOverFromOtherTab(): void {
  db?.takeOver();
}
