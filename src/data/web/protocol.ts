import type { Row, SqlValue, Statement, StorageInfo } from '../database';

/** Messages échangés entre l'interface et le travailleur SQLite. */
export type WorkerRequest =
  | { id: number; kind: 'run'; sql: string; params?: SqlValue[] }
  | { id: number; kind: 'all'; sql: string; params?: SqlValue[] }
  | { id: number; kind: 'transaction'; statements: Statement[] }
  | { id: number; kind: 'info' };

export interface WorkerResponse {
  id: number;
  ok: boolean;
  rows?: Row[];
  info?: StorageInfo;
  error?: string;
}
