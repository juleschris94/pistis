import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { sha256Hex } from '../../core/hash';
import { newId, systemClock, type Clock } from '../../core/ids';
import type { Database, Row, SqlValue, Statement } from '../../data/database';
import { BACKUP_TABLES, BLOB_COLUMNS, CURRENT_SCHEMA_VERSION, getSchemaVersion } from '../../data/migrations';
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

  const dataJson = strToU8(JSON.stringify(tables));
  files['data.json'] = dataJson;
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
  await db.run('INSERT INTO backup_log (id, at, kind, detail) VALUES (?, ?, ?, ?)', [
    newId(),
    clock.now(),
    'export',
    opts.password ? 'chiffrée' : 'non chiffrée',
  ]);
  return { bytes, manifest };
}

export class BackupError extends Error {}

/** Lit et valide entièrement une sauvegarde, sans rien écrire. */
export async function readBackup(file: Uint8Array, password?: string, iterations = PBKDF2_ITERATIONS): Promise<ParsedBackup> {
  const encrypted = isEncrypted(file);
  if (encrypted && !password) throw new BackupError('Cette sauvegarde est chiffrée : saisis son mot de passe.');
  const zipBytes = encrypted ? await decryptBytes(file, password as string, iterations) : file;

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zipBytes);
  } catch {
    throw new BackupError("Ce fichier n'est pas une sauvegarde PISTIS lisible.");
  }
  const manifestRaw = entries['manifest.json'];
  if (!manifestRaw) throw new BackupError('Sauvegarde incomplète : manifeste absent.');
  const manifest = parseJson<BackupManifest>(manifestRaw, 'manifeste');

  if (manifest.format !== BACKUP_FORMAT) throw new BackupError("Ce fichier n'est pas une sauvegarde PISTIS.");
  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION)
    throw new BackupError(`Format de sauvegarde ${manifest.formatVersion} non pris en charge.`);
  if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1)
    throw new BackupError('Version de schéma invalide dans la sauvegarde.');
  if (manifest.schemaVersion > CURRENT_SCHEMA_VERSION)
    throw new BackupError('Cette sauvegarde vient d’une version plus récente de PISTIS : mets l’application à jour.');

  // Chaque fichier listé doit exister et avoir la bonne empreinte ; aucun fichier non listé n'est accepté.
  for (const [path, expected] of Object.entries(manifest.files ?? {})) {
    const content = entries[path];
    if (!content) throw new BackupError(`Fichier manquant dans la sauvegarde : ${path}`);
    if ((await sha256Hex(content)) !== expected) throw new BackupError(`Fichier altéré dans la sauvegarde : ${path}`);
  }
  for (const path of Object.keys(entries)) {
    if (path !== 'manifest.json' && !(path in manifest.files)) throw new BackupError(`Fichier inattendu : ${path}`);
  }

  const tables = parseJson<TableDump>(entries['data.json'], 'données');
  const blobs: ParsedBackup['blobs'] = {};
  for (const [table, rows] of Object.entries(tables)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(table)) throw new BackupError(`Table inconnue : ${table}`);
    if (!Array.isArray(rows)) throw new BackupError(`Table mal formée : ${table}`);
    if (rows.length !== manifest.counts[table]) throw new BackupError(`Nombre de lignes incohérent pour ${table}.`);
    for (const col of BLOB_COLUMNS[table] ?? []) {
      for (const row of rows) {
        const id = String(row.id);
        const content = entries[`media/${id}/${col}`];
        if (content) ((blobs[table] ??= {})[id] ??= {})[col] = content;
        else if (col === 'data') throw new BackupError(`Image manquante pour le média ${id}.`);
      }
    }
  }
  return { manifest, tables, blobs, encrypted };
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
      if (unknown.length) throw new BackupError(`Colonnes inconnues dans ${table} : ${unknown.join(', ')}`);
      statements.push({
        sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        params: cols.map((c) => full[c] as SqlValue),
      });
    }
  }
  statements.push({
    sql: 'INSERT INTO backup_log (id, at, kind, detail) VALUES (?, ?, ?, ?)',
    params: [newId(), clock.now(), 'restore', `sauvegarde du ${backup.manifest.createdAt}`],
  });
  await db.transaction(statements);
}

function parseJson<T>(bytes: Uint8Array | undefined, label: string): T {
  if (!bytes) throw new BackupError(`Sauvegarde incomplète : ${label} absentes.`);
  try {
    return JSON.parse(strFromU8(bytes)) as T;
  } catch {
    throw new BackupError(`Sauvegarde endommagée : ${label} illisibles.`);
  }
}

/** Nom du fichier avec la date LOCALE de l'utilisateur (et non la date UTC). */
export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `pistis-sauvegarde-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pistis`;
}
