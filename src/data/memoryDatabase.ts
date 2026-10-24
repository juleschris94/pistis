import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database, Row, SqlValue, Statement } from './database';
import { allSync, runSync, transactionSync, type Oo1Like } from './sqliteCore';

/**
 * Base SQLite en mémoire : utilisée par les tests automatiques (Node).
 * Mêmes requêtes, même moteur que dans le navigateur, mais rien n'est conservé.
 */
export async function createMemoryDatabase(): Promise<Database> {
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(':memory:', 'c') as unknown as Oo1Like;
  runSync(db, 'PRAGMA foreign_keys = ON');
  return {
    run: async (sql: string, params?: SqlValue[]) => runSync(db, sql, params),
    all: async <T extends Row = Row>(sql: string, params?: SqlValue[]) => allSync(db, sql, params) as T[],
    transaction: async (statements: Statement[]) => transactionSync(db, statements),
    info: async () => ({ sqliteVersion: sqlite3.version.libVersion, mode: 'memory', detail: 'memory' }),
  };
}
