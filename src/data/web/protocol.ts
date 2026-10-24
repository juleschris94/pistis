import type { ErrorCode } from '../../core/errors';
import type { Row, SqlValue, Statement, StorageInfo } from '../database';

/** Messages échangés entre l'interface et le travailleur SQLite. */
export type WorkerRequest =
  | { id: number; kind: 'run'; sql: string; params?: SqlValue[] }
  | { id: number; kind: 'all'; sql: string; params?: SqlValue[] }
  | { id: number; kind: 'transaction'; statements: Statement[] }
  | { id: number; kind: 'info' };

/** Réponse à une requête précise. */
export interface WorkerResponse {
  type: 'response';
  id: number;
  ok: boolean;
  rows?: Row[];
  info?: StorageInfo;
  error?: string;
}

/**
 * Événement spontané du travailleur, pour informer l'interface de l'état de la base.
 * - `waiting-lock` : PISTIS est déjà ouvert dans un autre onglet ; on attend qu'il libère la base.
 * - `open` : la base est ouverte et prête.
 * - `failed` : la base n'a pas pu être ouverte (message lisible dans `error`).
 */
export interface WorkerEvent {
  type: 'event';
  event: 'waiting-lock' | 'open' | 'failed';
  code?: ErrorCode;
  error?: string;
}

export type WorkerMessage = WorkerResponse | WorkerEvent;

/** Nom du verrou qui garantit qu'un seul onglet écrit dans la base à la fois. */
export const DB_LOCK_NAME = 'pistis-database';
/** Canal entre onglets : un nouvel onglet peut demander à l'ancien de lui céder la place. */
export const TAB_CHANNEL_NAME = 'pistis-tabs';
