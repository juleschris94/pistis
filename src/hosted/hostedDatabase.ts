import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database as SqlJsDatabase, SqlValue as SqlJsValue } from 'sql.js';
import { PistisError } from '../core/errors';
import type { Row, SqlValue, Statement, StorageInfo } from '../data/database';
import type { ConnectionState, WebDatabase } from '../data/web/webDatabase';
import { loadHostedBytes, saveHostedBytes } from './hostedStore';

/**
 * Pilote de la VERSION WEB HÉBERGÉE (page intégrée, accessible par lien).
 *
 * Même interface que le pilote navigateur, mais SQLite tourne directement dans la page
 * (version JavaScript pure de sql.js : ni WebAssembly, ni travailleur, ni OPFS), car une page
 * intégrée n'a pas accès à ces fonctions. Les données sont recopiées dans IndexedDB après chaque
 * modification (et quand la page passe en arrière-plan) ; si le navigateur refuse, elles vivent en mémoire
 * et l'écran Confidentialité le signale.
 *
 * Ce fichier n'est jamais inclus dans l'application installable (voir vite.hosted.config.ts).
 */
export function createWebDatabase(onState: (state: ConnectionState) => void): WebDatabase {
  let persistent = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const ready: Promise<SqlJsDatabase> = (async () => {
    const SQL = await initSqlJs();
    const saved = await loadHostedBytes();
    persistent = saved.available;
    const db = new SQL.Database(saved.bytes ?? undefined);
    db.run('PRAGMA foreign_keys = ON');
    return db;
  })();

  ready.then(
    () => onState({ kind: 'open' }),
    (e: unknown) => onState({ kind: 'failed', error: new PistisError('db.storageUnavailable', { detail: String(e) }) }),
  );

  let pending: SqlJsDatabase | null = null;
  const flush = () => {
    if (!saveTimer || !pending) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    // export() rouvre la base en interne : on réactive les clés étrangères juste après.
    const bytes = pending.export();
    pending.run('PRAGMA foreign_keys = ON');
    void saveHostedBytes(bytes).then((ok) => {
      if (!ok) persistent = false;
    });
  };
  const scheduleSave = (db: SqlJsDatabase) => {
    if (!persistent) return;
    pending = db;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  };
  // Page masquée ou fermée : on écrit tout de suite ce qui attend encore.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  const toBind = (params: SqlValue[] = []) => params as SqlJsValue[];

  const runSync = (db: SqlJsDatabase, sql: string, params?: SqlValue[]) => {
    if (params && params.length) db.run(sql, toBind(params));
    else db.exec(sql);
  };

  const allSync = (db: SqlJsDatabase, sql: string, params?: SqlValue[]): Row[] => {
    const stmt = db.prepare(sql);
    try {
      if (params && params.length) stmt.bind(toBind(params));
      const rows: Row[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as Row);
      return rows;
    } finally {
      stmt.free();
    }
  };

  const isWrite = (sql: string) => !/^\s*(SELECT|PRAGMA\s+\w+\s*$|WITH)/i.test(sql);

  return {
    async run(sql, params) {
      const db = await ready;
      runSync(db, sql, params);
      if (isWrite(sql)) scheduleSave(db);
    },
    async all<T extends Row = Row>(sql: string, params?: SqlValue[]) {
      const db = await ready;
      const rows = allSync(db, sql, params) as T[];
      if (isWrite(sql)) scheduleSave(db);
      return rows;
    },
    async transaction(statements: Statement[]) {
      const db = await ready;
      db.run('BEGIN IMMEDIATE');
      try {
        for (const s of statements) runSync(db, s.sql, s.params);
        db.run('COMMIT');
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
      scheduleSave(db);
    },
    async info(): Promise<StorageInfo> {
      const db = await ready;
      const version = String(allSync(db, 'SELECT sqlite_version() AS v')[0]?.v ?? '');
      return { sqliteVersion: version, mode: persistent ? 'persistent' : 'memory', detail: persistent ? 'indexeddb' : 'memory' };
    },
    takeOver() {
      // Une seule page d'essai : rien à reprendre.
    },
  };
}

export type { ConnectionState, WebDatabase };
