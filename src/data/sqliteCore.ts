import type { Row, SqlValue, Statement } from './database';

/**
 * Partie commune aux pilotes SQLite WebAssembly (navigateur et tests).
 * Elle travaille sur l'objet `oo1.DB` du paquet officiel, de façon synchrone.
 */
export interface Oo1Like {
  exec(opts: { sql: string; bind?: SqlValue[]; rowMode?: 'object'; returnValue?: 'resultRows' }): unknown;
}

export function runSync(db: Oo1Like, sql: string, params: SqlValue[] = []): void {
  db.exec({ sql, bind: params.length ? params : undefined });
}

export function allSync(db: Oo1Like, sql: string, params: SqlValue[] = []): Row[] {
  return db.exec({
    sql,
    bind: params.length ? params : undefined,
    rowMode: 'object',
    returnValue: 'resultRows',
  }) as Row[];
}

/** BEGIN … COMMIT, avec ROLLBACK si une seule requête échoue. */
export function transactionSync(db: Oo1Like, statements: Statement[]): void {
  runSync(db, 'BEGIN IMMEDIATE');
  try {
    for (const s of statements) runSync(db, s.sql, s.params);
    runSync(db, 'COMMIT');
  } catch (error) {
    runSync(db, 'ROLLBACK');
    throw error;
  }
}
