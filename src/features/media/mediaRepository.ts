import { sha256Hex } from '../../core/hash';
import { newId, systemClock, type Clock } from '../../core/ids';
import type { Database } from '../../data/database';
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

/** Enregistre une image déjà optimisée. Une image identique (même empreinte) est réutilisée. */
export async function insertMedia(db: Database, media: NewMedia, clock: Clock = systemClock): Promise<string> {
  const sha256 = await sha256Hex(media.data);
  const existing = await db.all<{ id: string }>('SELECT id FROM media WHERE sha256 = ? LIMIT 1', [sha256]);
  if (existing[0]) return existing[0].id;
  const id = newId();
  await db.run(
    'INSERT INTO media (id, mime, width, height, size, sha256, data, thumb, sensitive, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
    [id, media.mime, media.width, media.height, media.data.length, sha256, media.data, media.thumb ?? null, clock.now()],
  );
  return id;
}

export async function getMedia(db: Database, id: string): Promise<MediaRecord | null> {
  const rows = await db.all('SELECT * FROM media WHERE id = ?', [id]);
  return (rows[0] as unknown as MediaRecord | undefined) ?? null;
}

/** Supprime un média seulement si plus rien ne le référence. */
export async function deleteMediaIfUnused(db: Database, id: string): Promise<boolean> {
  const refs = await db.all<{ n: number }>('SELECT COUNT(*) AS n FROM profile WHERE avatar_media_id = ?', [id]);
  if (Number(refs[0]?.n ?? 0) > 0) return false;
  await db.run('DELETE FROM media WHERE id = ?', [id]);
  return true;
}
