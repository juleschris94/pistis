import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { PistisError } from '../../core/errors';
import { sha256Hex } from '../../core/hash';
import { newId, systemClock, type Clock } from '../../core/ids';
import type { Database, Row, SqlValue, Statement } from '../../data/database';
import { BACKUP_TABLES, BLOB_COLUMNS, CURRENT_SCHEMA_VERSION, getSchemaVersion, MIGRATIONS, PRIMARY_KEYS } from '../../data/migrations';
import { decryptBytes, encryptBytes, isEncrypted, PBKDF2_ITERATIONS } from './backupCrypto';

/**
 * Sauvegardes PISTIS (.pistis)
 *
 * Archive ZIP :
 *   manifest.json   format, versions, date, nombre de lignes par table, empreinte de chaque fichier
 *   data.json       toutes les tables (colonnes binaires exclues)
 *   media/<id>/data et media/<id>/thumb   fichiers des images
 *
 * Avec un mot de passe, l'archive entière est chiffrée (voir backupCrypto.ts).
 * Restauration : tout est validé AVANT la moindre écriture, puis remplacé en une seule transaction.
 */
export const BACKUP_FORMAT = 'pistis-backup';
export const BACKUP_FORMAT_VERSION = 1;

/** Garde-fous contre un fichier piégé ou démesuré. */
export const BACKUP_LIMITS = {
  maxFileBytes: 512 * 1024 * 1024,
  maxUncompressedBytes: 1024 * 1024 * 1024,
  maxEntries: 20_000,
};

const ALLOWED_PATH = /^(manifest\.json|data\.json|media\/[0-9a-f-]{36}\/(data|thumb))$/;

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  counts: Record<string, number>;
  files: Record<string, string>;
}

export type TableDump = Record<string, Row[]>;

export interface ParsedBackup {
  manifest: BackupManifest;
  /** Données déjà mises au format du schéma actuel. */
  tables: TableDump;
  /** Contenu binaire par table → id de ligne → colonne. */
  blobs: Record<string, Record<string, Record<string, Uint8Array>>>;
  encrypted: boolean;
}

export interface ExportOptions {
  appVersion: string;
  password?: string;
  clock?: Clock;
  /** Uniquement pour accélérer les tests ; jamais modifié dans l'application. */
  iterations?: number;
}

/** Produit le fichier de sauvegarde, sans rien écrire dans la base. */
export async function exportBackup(db: Database, opts: ExportOptions): Promise<{ bytes: Uint8Array; manifest: BackupManifest }> {
  const clock = opts.clock ?? systemClock;
  const tables: TableDump = {};
  const files: Zippable = {};
  const hashes: Record<string, string> = {};
  const counts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    const rows = await db.all(`SELECT * FROM ${table}`);
    const blobCols = BLOB_COLUMNS[table] ?? [];
    tables[table] = rows.map((row) => {
      const copy: Row = { ...row };
      for (const col of blobCols) {
        const value = row[col];
        delete copy[col];
        if (value instanceof Uint8Array) files[`media/${String(row.id)}/${col}`] = value;
      }
      return copy;
    });
    counts[table] = rows.length;
  }

  files['data.json'] = strToU8(JSON.stringify(tables));
  for (const [path, content] of Object.entries(files)) hashes[path] = await sha256Hex(content as Uint8Array);

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: opts.appVersion,
    schemaVersion: await getSchemaVersion(db),
    createdAt: new Date(clock.now()).toISOString(),
    counts,
    files: hashes,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

  const zip = zipSync(files, { level: 6 });
  const bytes = opts.password ? await encryptBytes(zip, opts.password, opts.iterations ?? PBKDF2_ITERATIONS) : zip;
  return { bytes, manifest };
}

/** Lit et valide entièrement une sauvegarde, sans rien écrire. */
export async function readBackup(file: Uint8Array, password?: string, iterations = PBKDF2_ITERATIONS): Promise<ParsedBackup> {
  if (file.length === 0) throw new PistisError('backup.empty');
  if (file.length > BACKUP_LIMITS.maxFileBytes) throw new PistisError('backup.tooLarge');
  const encrypted = isEncrypted(file);
  if (encrypted && !password) throw new PistisError('backup.needsPassword');
  const zipBytes = encrypted ? await decryptBytes(file, password as string, iterations) : file;

  let entries: Record<string, Uint8Array>;
  try {
    let total = 0;
    let count = 0;
    entries = unzipSync(zipBytes, {
      filter: (f) => {
        if (!ALLOWED_PATH.test(f.name)) throw new PistisError('backup.unexpectedFile', { detail: f.name });
        total += f.originalSize;
        count += 1;
        if (total > BACKUP_LIMITS.maxUncompressedBytes || count > BACKUP_LIMITS.maxEntries) throw new PistisError('backup.oversized');
        return true;
      },
    });
  } catch (error) {
    if (error instanceof PistisError) throw error;
    throw new PistisError('backup.unreadable');
  }

  const manifest = validateManifest(parseJson<unknown>(entries['manifest.json'], 'manifest.json'));

  // Chaque fichier listé doit exister avec la bonne empreinte ; aucun fichier non listé n'est accepté.
  for (const [path, expected] of Object.entries(manifest.files)) {
    const content = entries[path];
    if (!content) throw new PistisError('backup.missingFile', { detail: path });
    if ((await sha256Hex(content)) !== expected) throw new PistisError('backup.alteredFile', { detail: path });
  }
  for (const path of Object.keys(entries)) {
    if (path !== 'manifest.json' && !Object.hasOwn(manifest.files, path)) throw new PistisError('backup.unexpectedFile', { detail: path });
  }

  const raw = parseJson<unknown>(entries['data.json'], 'data.json');
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PistisError('backup.damaged', { detail: 'data.json' });
  const tables = raw as TableDump;

  const blobs: ParsedBackup['blobs'] = {};
  for (const [table, rows] of Object.entries(tables)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(table)) throw new PistisError('backup.unknownTable', { detail: table });
    if (!Array.isArray(rows)) throw new PistisError('backup.damaged', { detail: table });
    if (rows.length !== manifest.counts[table]) throw new PistisError('backup.countMismatch', { detail: table });
    for (const row of rows) validateRow(table, row);
    for (const col of BLOB_COLUMNS[table] ?? []) {
      for (const row of rows) {
        const id = String(row.id);
        const content = entries[`media/${id}/${col}`];
        if (content) ((blobs[table] ??= {})[id] ??= {})[col] = content;
        else if (col === 'data') throw new PistisError('backup.missingImage', { detail: id });
      }
    }
  }

  upgradeTables(tables, manifest.schemaVersion);
  for (const table of BACKUP_TABLES) if (!Array.isArray(tables[table])) throw new PistisError('backup.missingTable', { detail: table });
  return { manifest, tables, blobs, encrypted };
}

/** Applique aux données d'une ancienne sauvegarde les transformations des migrations suivantes. */
export function upgradeTables(tables: TableDump, fromVersion: number): void {
  for (const m of MIGRATIONS) {
    if (m.version > fromVersion) m.upgradeBackup?.(tables as Record<string, Record<string, unknown>[]>);
  }
}

/** Remplace toutes les données par celles de la sauvegarde, en une transaction atomique. */
export async function restoreBackup(db: Database, backup: ParsedBackup, clock: Clock = systemClock): Promise<void> {
  const statements: Statement[] = [];
  for (const table of [...BACKUP_TABLES].reverse()) statements.push({ sql: `DELETE FROM ${table}` });

  for (const table of BACKUP_TABLES) {
    const known = new Set((await db.all<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));
    for (const row of backup.tables[table] ?? []) {
      const full: Row = { ...row, ...(backup.blobs[table]?.[String(row.id)] ?? {}) };
      const cols = Object.keys(full);
      const unknown = cols.filter((c) => !known.has(c));
      if (unknown.length) throw new PistisError('backup.unknownColumns', { detail: `${table}: ${unknown.join(', ')}` });
      statements.push({
        sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        params: cols.map((c) => full[c] as SqlValue),
      });
    }
  }
  statements.push(backupEventStatement('restore', `sauvegarde du ${backup.manifest.createdAt}`, clock.now()));
  await db.transaction(statements);
}

/**
 * Restaure en gardant de quoi revenir en arrière : l'état actuel est d'abord copié en mémoire.
 * Renvoie cette copie ; la passer à `undoRestore` annule la restauration.
 */
export async function restoreWithUndo(
  db: Database,
  backup: ParsedBackup,
  appVersion: string,
  clock: Clock = systemClock,
): Promise<Uint8Array> {
  const { bytes } = await exportBackup(db, { appVersion, clock });
  await restoreBackup(db, backup, clock);
  return bytes;
}

export async function undoRestore(db: Database, safety: Uint8Array, clock: Clock = systemClock): Promise<void> {
  await restoreBackup(db, await readBackup(safety), clock);
}

export function backupEventStatement(kind: 'export' | 'restore', detail: string, at: number): Statement {
  return { sql: 'INSERT INTO backup_log (id, at, kind, detail) VALUES (?, ?, ?, ?)', params: [newId(), at, kind, detail] };
}

export async function recordExport(db: Database, encrypted: boolean, clock: Clock = systemClock): Promise<void> {
  const s = backupEventStatement('export', encrypted ? 'chiffrée' : 'non chiffrée', clock.now());
  await db.run(s.sql, s.params);
}

export async function lastExportAt(db: Database): Promise<number | null> {
  const rows = await db.all<{ at: number | null }>("SELECT MAX(at) AS at FROM backup_log WHERE kind = 'export'");
  const at = rows[0]?.at;
  return at === null || at === undefined ? null : Number(at);
}

/** Âge de la dernière sauvegarde, pour un rappel bienveillant (jamais culpabilisant). */
export const BACKUP_REMINDER_DAYS = 14;
export type BackupFreshness = { kind: 'never' } | { kind: 'recent' | 'due'; days: number };

export function backupFreshness(lastAt: number | null, now: number): BackupFreshness {
  if (lastAt === null) return { kind: 'never' };
  const days = Math.max(0, Math.floor((now - lastAt) / 86_400_000));
  return { kind: days >= BACKUP_REMINDER_DAYS ? 'due' : 'recent', days };
}

/** Nom du fichier avec la date LOCALE de l'utilisateur (et non la date UTC). */
export function backupFileName(date = new Date(), prefix = 'pistis-sauvegarde'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pistis`;
}

function validateManifest(value: unknown): BackupManifest {
  const m = value as Partial<BackupManifest> | null;
  if (!m || typeof m !== 'object') throw new PistisError('backup.damaged', { detail: 'manifest.json' });
  if (m.format !== BACKUP_FORMAT) throw new PistisError('backup.notPistis');
  if (m.formatVersion !== BACKUP_FORMAT_VERSION) throw new PistisError('backup.unsupportedFormat', { detail: String(m.formatVersion) });
  if (!Number.isInteger(m.schemaVersion) || (m.schemaVersion as number) < 1) throw new PistisError('backup.invalidSchema');
  if ((m.schemaVersion as number) > CURRENT_SCHEMA_VERSION) throw new PistisError('backup.newerVersion');
  if (typeof m.createdAt !== 'string' || Number.isNaN(Date.parse(m.createdAt))) throw new PistisError('backup.invalidDate');
  const isRecord = (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
  if (!isRecord(m.counts) || !isRecord(m.files)) throw new PistisError('backup.incompleteManifest');
  if (!Object.hasOwn(m.files as object, 'data.json')) throw new PistisError('backup.incompleteManifest', { detail: 'data.json' });
  return m as BackupManifest;
}

function validateRow(table: string, row: unknown): asserts row is Row {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new PistisError('backup.invalidRow', { detail: table });
  for (const [key, value] of Object.entries(row)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(key)) throw new PistisError('backup.invalidRow', { detail: `${table}.${key}` });
    if (value !== null && typeof value !== 'string' && typeof value !== 'number')
      throw new PistisError('backup.invalidRow', { detail: `${table}.${key}` });
  }
  const id = (row as Row)[PRIMARY_KEYS[table] ?? 'id'];
  if (typeof id !== 'string' || id.length === 0) throw new PistisError('backup.invalidRow', { detail: `${table}: id` });
  if (BLOB_COLUMNS[table] && !/^[0-9a-f-]{36}$/.test(id)) throw new PistisError('backup.invalidRow', { detail: `media: ${id}` });
}

function parseJson<T>(bytes: Uint8Array | undefined, label: string): T {
  if (!bytes) throw new PistisError('backup.missingFile', { detail: label });
  try {
    return JSON.parse(strFromU8(bytes)) as T;
  } catch {
    throw new PistisError('backup.damaged', { detail: label });
  }
}
