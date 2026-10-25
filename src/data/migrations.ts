import { PistisError } from '../core/errors';
import type { Database } from './database';

/**
 * Historique du schéma. Règles :
 * - une migration publiée ne se modifie JAMAIS ; on en ajoute une nouvelle ;
 * - le numéro courant est stocké dans `PRAGMA user_version` ;
 * - chaque migration s'applique dans une transaction : la base n'est jamais à moitié migrée.
 */
export interface Migration {
  version: number;
  description: string;
  statements: string[];
  /**
   * Si la migration crée ou transforme des données, elle applique la même transformation au contenu
   * d'une sauvegarde plus ancienne, pour qu'une sauvegarde de l'an dernier reste restaurable.
   */
  upgradeBackup?: (tables: Record<string, Record<string, unknown>[]>) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Profil local, médias, journal des sauvegardes',
    statements: [
      `CREATE TABLE profile (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        nickname TEXT NOT NULL,
        phrase TEXT NOT NULL DEFAULT '',
        avatar_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE media (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        size INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        data BLOB NOT NULL,
        thumb BLOB,
        sensitive INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE backup_log (
        id TEXT PRIMARY KEY,
        at INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('export', 'restore')),
        detail TEXT NOT NULL DEFAULT ''
      )`,
    ],
  },
  {
    version: 2,
    description: 'Paramètres clé/valeur (preuve de migration M0)',
    statements: [
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `INSERT INTO settings (key, value) VALUES ('currency', 'EUR'), ('reduced_motion', 'false')`,
    ],
    upgradeBackup: (tables) => {
      tables.settings ??= [
        { key: 'currency', value: 'EUR' },
        { key: 'reduced_motion', value: 'false' },
      ];
    },
  },
  {
    version: 3,
    description: 'Projets et objectifs (Pourquoi, vision), étapes et tâches',
    statements: [
      `CREATE TABLE goal (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
        description TEXT NOT NULL DEFAULT '',
        why TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('idea', 'active', 'paused', 'done', 'archived')),
        priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
        target_date TEXT CHECK (target_date IS NULL OR target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        vision_text TEXT NOT NULL DEFAULT '',
        vision_art TEXT,
        vision_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
        template_id TEXT,
        template_version INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        CHECK (status = 'idea' OR length(trim(why)) > 0)
      )`,
      `CREATE TABLE milestone (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE task (
        id TEXT PRIMARY KEY,
        goal_id TEXT REFERENCES goal(id) ON DELETE CASCADE,
        milestone_id TEXT REFERENCES milestone(id) ON DELETE SET NULL,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
        priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
        due_date TEXT CHECK (due_date IS NULL OR due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
        pinned_on TEXT,
        position INTEGER NOT NULL,
        done_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      'CREATE INDEX idx_milestone_goal ON milestone(goal_id, position)',
      'CREATE INDEX idx_task_goal ON task(goal_id, position)',
      'CREATE INDEX idx_task_open ON task(done_at, due_date)',
    ],
    upgradeBackup: (tables) => {
      tables.goal ??= [];
      tables.milestone ??= [];
      tables.task ??= [];
    },
  },
  {
    version: 4,
    description: 'Comptes et opérations importés (relevés), agendas importés (.ics)',
    statements: [
      // Montants en centimes entiers, toujours avec leur devise (règle n° 3 de docs/AGENTS.md).
      `CREATE TABLE account (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
        institution TEXT NOT NULL DEFAULT 'other',
        kind TEXT NOT NULL DEFAULT 'checking' CHECK (kind IN ('checking','savings','card','meal','other')),
        currency TEXT NOT NULL DEFAULT 'EUR' CHECK (length(currency) = 3),
        external_ref TEXT,
        balance_cents INTEGER,
        balance_date TEXT CHECK (balance_date IS NULL OR balance_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        balance_source TEXT CHECK (balance_source IS NULL OR balance_source IN ('file','manual')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE import_batch (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
        source TEXT NOT NULL CHECK (source IN ('ofx','csv')),
        file_name TEXT NOT NULL DEFAULT '',
        added INTEGER NOT NULL,
        skipped INTEGER NOT NULL,
        imported_at INTEGER NOT NULL
      )`,
      `CREATE TABLE bank_transaction (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
        batch_id TEXT REFERENCES import_batch(id) ON DELETE SET NULL,
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        label TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL CHECK (length(currency) = 3),
        import_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (account_id, import_key)
      )`,
      'CREATE INDEX idx_transaction_date ON bank_transaction(account_id, date)',
      `CREATE TABLE calendar_source (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
        file_name TEXT NOT NULL DEFAULT '',
        event_count INTEGER NOT NULL DEFAULT 0,
        imported_at INTEGER NOT NULL
      )`,
      // Un événement garde sa règle de répétition : les occurrences sont calculées à l'affichage.
      `CREATE TABLE calendar_event (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES calendar_source(id) ON DELETE CASCADE,
        uid TEXT NOT NULL,
        recurrence_id INTEGER,
        title TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        all_day INTEGER NOT NULL CHECK (all_day IN (0, 1)),
        start_at INTEGER NOT NULL,
        end_at INTEGER NOT NULL,
        rrule TEXT,
        exdates TEXT NOT NULL DEFAULT '[]'
      )`,
      'CREATE INDEX idx_event_source ON calendar_event(source_id, start_at)',
    ],
    upgradeBackup: (tables) => {
      tables.account ??= [];
      tables.import_batch ??= [];
      tables.bank_transaction ??= [];
      tables.calendar_source ??= [];
      tables.calendar_event ??= [];
    },
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export async function getSchemaVersion(db: Database): Promise<number> {
  const rows = await db.all<{ user_version: number }>('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

/** Applique, dans l'ordre, les migrations manquantes. Renvoie les versions appliquées. */
export async function migrate(db: Database): Promise<number[]> {
  const current = await getSchemaVersion(db);
  if (current > CURRENT_SCHEMA_VERSION) {
    throw new PistisError('db.newerSchema', { current, supported: CURRENT_SCHEMA_VERSION });
  }
  const applied: number[] = [];
  for (const m of MIGRATIONS.filter((m) => m.version > current)) {
    await db.transaction([...m.statements.map((sql) => ({ sql })), { sql: `PRAGMA user_version = ${m.version}` }]);
    applied.push(m.version);
  }
  return applied;
}

/** Tables incluses dans les sauvegardes, dans un ordre compatible avec les clés étrangères. */
export const BACKUP_TABLES = [
  'media',
  'profile',
  'settings',
  'backup_log',
  'goal',
  'milestone',
  'task',
  'account',
  'import_batch',
  'bank_transaction',
  'calendar_source',
  'calendar_event',
] as const;
/** Clé primaire de chaque table sauvegardée (« id » par défaut). */
export const PRIMARY_KEYS: Record<string, string> = { settings: 'key' };
/** Colonnes binaires sorties du JSON et rangées comme fichiers dans l'archive. */
export const BLOB_COLUMNS: Record<string, string[]> = { media: ['data', 'thumb'] };
