import type { Database, Row, SqlValue, Statement, StorageInfo } from '../database';
import type { WorkerRequest, WorkerResponse } from './protocol';

type Pending = { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Body = DistributiveOmit<WorkerRequest, 'id'>;

/** Pilote navigateur : chaque appel est transmis au travailleur SQLite et attend sa réponse. */
export function createWebDatabase(): Database {
  const worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, Pending>();
  let nextId = 1;

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const p = pending.get(event.data.id);
    if (!p) return;
    pending.delete(event.data.id);
    if (event.data.ok) p.resolve(event.data);
    else p.reject(new Error(event.data.error ?? 'Erreur SQLite inconnue'));
  };

  const call = (body: Body) =>
    new Promise<WorkerResponse>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, ...body } as WorkerRequest);
    });

  return {
    run: async (sql: string, params?: SqlValue[]) => {
      await call({ kind: 'run', sql, params });
    },
    all: async <T extends Row = Row>(sql: string, params?: SqlValue[]) =>
      ((await call({ kind: 'all', sql, params })).rows ?? []) as T[],
    transaction: async (statements: Statement[]) => {
      await call({ kind: 'transaction', statements });
    },
    info: async () => (await call({ kind: 'info' })).info as StorageInfo,
  };
}
