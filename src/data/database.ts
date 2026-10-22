/**
 * Contrat unique d'accès aux données.
 *
 * Le reste de l'application ne sait pas où vivent les données : SQLite dans le navigateur (OPFS),
 * SQLite natif sur Android plus tard, ou SQLite en mémoire dans les tests. Chaque pilote implémente
 * cette interface ; aucun écran n'écrit de SQL directement.
 */
export type SqlValue = string | number | null | Uint8Array;

export interface Statement {
  sql: string;
  params?: SqlValue[];
}

export type Row = Record<string, SqlValue>;

export interface Database {
  /** Exécute une requête sans résultat. */
  run(sql: string, params?: SqlValue[]): Promise<void>;
  /** Exécute une requête et renvoie toutes les lignes. */
  all<T extends Row = Row>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Exécute plusieurs requêtes de façon atomique : tout réussit, ou rien n'est écrit. */
  transaction(statements: Statement[]): Promise<void>;
  /** Informations sur le stockage réel, pour être honnête avec l'utilisateur. */
  info(): Promise<StorageInfo>;
}

export interface StorageInfo {
  sqliteVersion: string;
  /** `persistent` : fichier OPFS conservé ; `memory` : perdu à la fermeture. */
  mode: 'persistent' | 'memory';
  detail: string;
}
