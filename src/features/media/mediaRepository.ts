import { sha256Hex } from '../../core/hash';
import { newId } from '../../core/ids';
import type { Database, Statement } from '../../data/database';
import type { ImageMime } from './mediaRules';

export interface MediaRecord {
  id: string;
  mime: ImageMime;
  width: number;
  height: number;
  size: number;
  sha256: string;
  data: Uint8Array;
  thumb: Uint8Array | null;
  sensitive: number;
  created_at: number;
}

export interface NewMedia {
  mime: ImageMime;
  width: number;
  height: number;
  data: Uint8Array;
  thumb?: Uint8Array | null;
}

/**
 * Toutes les colonnes qui peuvent pointer vers une image.
 * Chaque nouveau module qui utilise des images (projets, objectifs, biens…) s'ajoute ici :
 * c'est ce qui empêche de supprimer une image encore utilisée ailleurs.
 */
export const MEDIA_REFERENCES: { table: string; column: string }[] = [{ table: 'profile', column: 'avatar_media_id' }];

/**
 * Prépare l'enregistrement d'une image déjà optimisée, sans rien écrire.
 * Une image identique (même empreinte) est réutilisée : aucune requête n'est alors nécessaire.
 */
export async function prepareMediaInsert(db: Database, media: NewMedia, now: number): Promise<{ id: string; statements: Statement[] }> {
  const sha256 = await sha256Hex(media.data);
  const existing = await db.all<{ id: string }>('SELECT id FROM media WHERE sha256 = ? LIMIT 1', [sha256]);
  if (existing[0]) return { id: existing[0].id, statements: [] };
  const id = newId();
  return {
    id,
    statements: [
      {
        sql: 'INSERT INTO media (id, mime, width, height, size, sha256, data, thumb, sensitive, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
        params: [id, media.mime, media.width, media.height, media.data.length, sha256, media.data, media.thumb ?? null, now],
      },
    ],
  };
}

/** Requête qui supprime une image seulement si plus aucune colonne ne la référence. */
export function deleteMediaIfUnusedStatement(id: string): Statement {
  const stillUsed = MEDIA_REFERENCES.map((r) => `EXISTS (SELECT 1 FROM ${r.table} WHERE ${r.column} = ?)`).join(' OR ');
  return { sql: `DELETE FROM media WHERE id = ? AND NOT (${stillUsed})`, params: [id, ...MEDIA_REFERENCES.map(() => id)] };
}

export async function getMedia(db: Database, id: string): Promise<MediaRecord | null> {
  const rows = await db.all('SELECT * FROM media WHERE id = ?', [id]);
  return (rows[0] as unknown as MediaRecord | undefined) ?? null;
}
