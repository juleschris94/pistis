import type { Database } from '../data/database';
import { migrate } from '../data/migrations';
import { createWebDatabase } from '../data/web/webDatabase';

export const APP_VERSION = '0.0.1-m0';

let instance: Promise<{ db: Database; appliedMigrations: number[] }> | null = null;

/** Ouvre la base une seule fois et applique les migrations au démarrage. */
export function getServices() {
  instance ??= (async () => {
    const db = createWebDatabase();
    const appliedMigrations = await migrate(db);
    return { db, appliedMigrations };
  })();
  return instance;
}
