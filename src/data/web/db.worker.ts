/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { StorageInfo } from '../database';
import { allSync, runSync, transactionSync, type Oo1Like } from '../sqliteCore';
import type { WorkerRequest, WorkerResponse } from './protocol';

/**
 * Travailleur (Web Worker) qui possède la base SQLite.
 *
 * Il utilise le système de fichiers privé du navigateur (OPFS) via le VFS « SAH pool » :
 * les données survivent à la fermeture de l'onglet, et ce mode ne demande aucun en-tête
 * serveur particulier, donc PISTIS peut être hébergé sur n'importe quel site statique.
 * Si OPFS est indisponible (navigation privée, vieux navigateur), on bascule en mémoire
 * et on le dit clairement : l'interface affiche alors « données temporaires ».
 */
const DB_FILE = '/pistis.sqlite3';

let db: Oo1Like;
let info: StorageInfo;

const ready = (async () => {
  const sqlite3 = await sqlite3InitModule();
  try {
    const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'pistis-pool' });
    db = new pool.OpfsSAHPoolDb(DB_FILE) as unknown as Oo1Like;
    info = {
      sqliteVersion: sqlite3.version.libVersion,
      mode: 'persistent',
      detail: 'SQLite dans le stockage privé du navigateur (OPFS)',
    };
  } catch (error) {
    db = new sqlite3.oo1.DB(':memory:', 'c') as unknown as Oo1Like;
    info = {
      sqliteVersion: sqlite3.version.libVersion,
      mode: 'memory',
      detail: `OPFS indisponible (${(error as Error).message}) : données temporaires`,
    };
  }
  runSync(db, 'PRAGMA foreign_keys = ON');
})();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  const reply = (res: Omit<WorkerResponse, 'id'>) => (self as unknown as Worker).postMessage({ id: req.id, ...res });
  try {
    await ready;
    switch (req.kind) {
      case 'run':
        runSync(db, req.sql, req.params);
        return reply({ ok: true });
      case 'all':
        return reply({ ok: true, rows: allSync(db, req.sql, req.params) });
      case 'transaction':
        transactionSync(db, req.statements);
        return reply({ ok: true });
      case 'info':
        return reply({ ok: true, info });
    }
  } catch (error) {
    reply({ ok: false, error: (error as Error).message });
  }
};
