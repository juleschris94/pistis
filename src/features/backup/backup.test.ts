import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { insertMedia } from '../media/mediaRepository';
import { getProfile, saveProfile } from '../profile/profile';
import { backupFileName, exportBackup, readBackup, restoreBackup } from './backup';

const FAST = 1_000; // itérations réduites pour la vitesse des tests uniquement
const clock = { now: () => Date.UTC(2026, 9, 23, 8, 0) };

async function seededDb() {
  const db = await createMemoryDatabase();
  await migrate(db);
  const avatar = await insertMedia(
    db,
    { mime: 'image/jpeg', width: 2, height: 2, data: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]), thumb: new Uint8Array([9, 9]) },
    clock,
  );
  await saveProfile(db, { firstName: 'Jules', lastName: 'Zobinou', nickname: 'JC', avatarMediaId: avatar }, clock);
  return { db, avatar };
}

describe('sauvegarde .pistis', () => {
  it('exporte puis restaure à l’identique, image comprise', async () => {
    const { db, avatar } = await seededDb();
    const { bytes, manifest } = await exportBackup(db, { appVersion: 'test', clock });
    expect(manifest.counts).toMatchObject({ profile: 1, media: 1, settings: 2 });

    const target = await createMemoryDatabase();
    await migrate(target);
    await saveProfile(target, { firstName: 'Autre', lastName: '', nickname: 'X' });
    await restoreBackup(target, await readBackup(bytes), clock);

    expect(await getProfile(target)).toMatchObject({ nickname: 'JC', avatar_media_id: avatar });
    const media = await target.all('SELECT data, thumb FROM media');
    expect(Array.from(media[0].data as Uint8Array)).toEqual([0xff, 0xd8, 0xff, 1, 2, 3]);
    expect(Array.from(media[0].thumb as Uint8Array)).toEqual([9, 9]);
    expect(await target.all("SELECT kind FROM backup_log WHERE kind = 'restore'")).toHaveLength(1);
  });

  it('chiffre avec un mot de passe et refuse un mauvais mot de passe', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', password: 'motdepasse-solide', iterations: FAST, clock });
    expect(new TextDecoder().decode(bytes.subarray(0, 10))).toBe('PISTISENC1');
    await expect(readBackup(bytes)).rejects.toThrow(/chiffrée/);
    await expect(readBackup(bytes, 'mauvais-mot-de-passe', FAST)).rejects.toThrow(/incorrect/);
    const parsed = await readBackup(bytes, 'motdepasse-solide', FAST);
    expect(parsed.encrypted).toBe(true);
    expect(parsed.tables.profile[0]).toMatchObject({ nickname: 'JC' });
  });

  it('refuse un mot de passe trop court', async () => {
    const { db } = await seededDb();
    await expect(exportBackup(db, { appVersion: 'test', password: 'court', iterations: FAST })).rejects.toThrow(/8 caractères/);
  });

  it('détecte un fichier altéré et ne touche pas à la base', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    entries['data.json'] = strToU8(new TextDecoder().decode(entries['data.json']).replace('JC', 'XX'));
    const tampered = zipSync(entries);
    await expect(readBackup(tampered)).rejects.toThrow(/altéré/);
    expect(await getProfile(db)).toMatchObject({ nickname: 'JC' });
  });

  it('refuse ce qui n’est pas une sauvegarde PISTIS', async () => {
    await expect(readBackup(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/lisible/);
    const foreign = zipSync({ 'manifest.json': strToU8(JSON.stringify({ format: 'autre' })) });
    await expect(readBackup(foreign)).rejects.toThrow(/pas une sauvegarde PISTIS/);
  });

  it('nomme le fichier avec la date locale', () => {
    expect(backupFileName(new Date(2026, 9, 23, 0, 30))).toBe('pistis-sauvegarde-2026-10-23.pistis');
  });

  it('refuse une sauvegarde issue d’une version plus récente', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json']));
    manifest.schemaVersion = 99;
    entries['manifest.json'] = strToU8(JSON.stringify(manifest));
    await expect(readBackup(zipSync(entries))).rejects.toThrow(/plus récente/);
  });
});
