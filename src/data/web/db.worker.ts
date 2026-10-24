/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { StorageInfo } from '../database';
import { allSync, runSync, transactionSync, type Oo1Like } from '../sqliteCore';
import { DB_LOCK_NAME, type WorkerMessage, type WorkerRequest } from './protocol';

/**
 * Travailleur (Web Worker) qui possède la base SQLite.
 *
 * Stockage : système de fichiers privé du navigateur (OPFS) via le VFS « SAH pool ».
 * Les données survivent à la fermeture, et ce mode ne demande aucun en-tête serveur particulier.
 *
 * Un seul onglet à la fois : le VFS SAH pool ne supporte qu'une connexion. Le travailleur prend
 * donc un verrou (Web Locks) avant d'ouvrir la base et le garde tant qu'il vit. Un second onglet
 * attend ce verrou au lieu d'échouer ou, pire, de basculer en mémoire et de perdre les saisies.
 *
 * Le mode « mémoire » n'est utilisé que si le navigateur ne propose pas OPFS du tout
 * (navigation privée, très vieux navigateur), et l'interface l'annonce alors clairement.
 */
const DB_FILE = '/pistis.sqlite3';
const post = (message: WorkerMessage) => (self as unknown as Worker).postMessage(message);

let db!: Oo1Like;
let info: StorageInfo;

function opfsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
}

/** Prend le verrou de la base et le garde pour toute la vie du travailleur. */
async function acquireLock(): Promise<void> {
  if (!navigator.locks) return; // navigateur sans Web Locks : on tente sans verrou
  const hold = () => new Promise<never>(() => undefined);
  const gotItNow = await new Promise<boolean>((resolve) => {
    void navigator.locks.request(DB_LOCK_NAME, { ifAvailable: true }, (lock) => {
      resolve(Boolean(lock));
      return lock ? hold() : undefined;
    });
  });
  if (gotItNow) return;
  post({ type: 'event', event: 'waiting-lock' });
  await new Promise<void>((resolve) => {
    void navigator.locks.request(DB_LOCK_NAME, () => {
      resolve();
      return hold();
    });
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ready = (async () => {
  const sqlite3 = await sqlite3InitModule();
  const version = sqlite3.version.libVersion;

  if (!opfsSupported()) {
    db = new sqlite3.oo1.DB(':memory:', 'c') as unknown as Oo1Like;
    info = { sqliteVersion: version, mode: 'memory', detail: 'Stockage durable indisponible dans ce navigateur : données temporaires' };
  } else {
    await acquireLock();
    // Juste après la fermeture d'un autre onglet, ses fichiers peuvent être libérés avec un léger décalage.
    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const pool = await sqlite3.installOpfsSAHPoolVfs({
          name: 'pistis-pool',
          preserveOnInitFailure: true,
          forceReinitIfPreviouslyFailed: true,
        } as Parameters<typeof sqlite3.installOpfsSAHPoolVfs>[0]);
        db = new pool.OpfsSAHPoolDb(DB_FILE) as unknown as Oo1Like;
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        await delay(250 * (attempt + 1));
      }
    }
    if (lastError) throw new Error(`Impossible d'ouvrir le stockage de PISTIS : ${(lastError as Error).message}`);
    info = { sqliteVersion: version, mode: 'persistent', detail: 'SQLite dans le stockage privé du navigateur (OPFS)' };
  }
  runSync(db, 'PRAGMA foreign_keys = ON');
  post({ type: 'event', event: 'open' });
})();

ready.catch((error: Error) => post({ type: 'event', event: 'failed', error: error.message }));

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  const reply = (res: { ok: boolean; rows?: unknown[]; info?: StorageInfo; error?: string }) =>
    post({ type: 'response', id: req.id, ...res } as WorkerMessage);
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
