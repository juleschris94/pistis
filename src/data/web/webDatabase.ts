import { PistisError } from '../../core/errors';
import type { Database, Row, SqlValue, Statement, StorageInfo } from '../database';
import { TAB_CHANNEL_NAME, type WorkerMessage, type WorkerRequest } from './protocol';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Body = DistributiveOmit<WorkerRequest, 'id'>;
type Pending = { resolve: (r: WorkerMessage & { type: 'response' }) => void; reject: (e: Error) => void };

/** État de la connexion, affiché par l'interface. */
export type ConnectionState =
  | { kind: 'opening' }
  | { kind: 'waiting-other-tab' }
  | { kind: 'open' }
  | { kind: 'yielded' } // un autre onglet a repris la main
  | { kind: 'failed'; error: PistisError };

export interface WebDatabase extends Database {
  /** Demande à l'onglet qui détient la base de la céder à celui-ci. */
  takeOver(): void;
}

/**
 * Pilote navigateur : chaque appel est transmis au travailleur SQLite.
 * Toute panne du travailleur (fichier introuvable, moteur qui plante) rejette les requêtes
 * en attente au lieu de les laisser bloquées pour toujours.
 */
export function createWebDatabase(onState: (state: ConnectionState) => void): WebDatabase {
  const worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, Pending>();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(TAB_CHANNEL_NAME) : null;
  let nextId = 1;
  let broken: Error | null = null;
  let isOpen = false;

  const failAll = (error: Error) => {
    broken = error;
    for (const p of pending.values()) p.reject(error);
    pending.clear();
  };

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data;
    if (msg.type === 'event') {
      if (msg.event === 'open') {
        isOpen = true;
        onState({ kind: 'open' });
      } else if (msg.event === 'waiting-lock') onState({ kind: 'waiting-other-tab' });
      else onState({ kind: 'failed', error: new PistisError(msg.code ?? 'db.storageUnavailable', { detail: msg.error ?? '' }) });
      return;
    }
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg);
    else p.reject(new Error(msg.error ?? 'Erreur SQLite inconnue'));
  };

  worker.onerror = (event) => {
    event.preventDefault();
    const error = new PistisError('db.workerFailed', { detail: event.message ?? '' });
    failAll(error);
    onState({ kind: 'failed', error });
  };
  worker.onmessageerror = () => failAll(new PistisError('db.workerFailed', { detail: 'messageerror' }));

  // Un nouvel onglet demande la main : on arrête notre travailleur, ce qui libère la base et le verrou.
  if (channel) {
    channel.onmessage = (event: MessageEvent<{ type: string }>) => {
      if (event.data?.type !== 'takeover' || !isOpen) return;
      worker.terminate();
      isOpen = false;
      failAll(new PistisError('db.otherTab'));
      onState({ kind: 'yielded' });
    };
  }

  const call = (body: Body) =>
    new Promise<WorkerMessage & { type: 'response' }>((resolve, reject) => {
      if (broken) return reject(broken);
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, ...body } as WorkerRequest);
    });

  onState({ kind: 'opening' });

  return {
    run: async (sql: string, params?: SqlValue[]) => {
      await call({ kind: 'run', sql, params });
    },
    all: async <T extends Row = Row>(sql: string, params?: SqlValue[]) => ((await call({ kind: 'all', sql, params })).rows ?? []) as T[],
    transaction: async (statements: Statement[]) => {
      await call({ kind: 'transaction', statements });
    },
    info: async () => (await call({ kind: 'info' })).info as StorageInfo,
    takeOver: () => channel?.postMessage({ type: 'takeover' }),
  };
}
