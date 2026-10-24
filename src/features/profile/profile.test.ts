import { describe, expect, it } from 'vitest';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import type { NewMedia } from '../media/mediaRepository';
import { getProfile, saveProfile, validateProfile } from './profile';

const clock = (t: number) => ({ now: () => t });
const jpeg = (marker: number): NewMedia => ({ mime: 'image/jpeg', width: 1, height: 1, data: new Uint8Array([0xff, 0xd8, 0xff, marker]) });
const base = { firstName: 'Jules', lastName: 'Zobinou', nickname: 'JC' };

async function setup() {
  const db = await createMemoryDatabase();
  await migrate(db);
  return db;
}
const mediaCount = async (db: Awaited<ReturnType<typeof setup>>) => Number((await db.all('SELECT COUNT(*) AS n FROM media'))[0].n);

describe('validation du profil', () => {
  it('exige un pseudo et indique le champ en faute', () => {
    expect(validateProfile({ ...base, nickname: '  ' })).toEqual({ nickname: { code: 'required' } });
    expect(validateProfile(base)).toEqual({});
  });

  it('compte les caractères, pas les unités internes (émojis)', () => {
    expect(validateProfile({ ...base, nickname: '😀'.repeat(30) })).toEqual({});
    expect(validateProfile({ ...base, nickname: '😀'.repeat(31) }).nickname).toEqual({ code: 'tooLong', max: 30 });
  });

  it('limite le prénom, le nom et la phrase', () => {
    const long = 'a'.repeat(200);
    expect(Object.keys(validateProfile({ ...base, firstName: long, lastName: long, phrase: long }))).toEqual([
      'firstName',
      'lastName',
      'phrase',
    ]);
  });
});

describe('enregistrement du profil', () => {
  it('crée puis modifie un profil unique, en nettoyant les espaces', async () => {
    const db = await setup();
    expect(await getProfile(db)).toBeNull();
    const created = await saveProfile(db, { ...base, firstName: ' Jules ' }, undefined, clock(100));
    expect(created.first_name).toBe('Jules');
    await saveProfile(db, { ...base, nickname: 'Jules C.' }, undefined, clock(200));
    const rows = await db.all('SELECT * FROM profile');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nickname: 'Jules C.', created_at: 100, updated_at: 200 });
  });

  it('refuse un profil invalide sans rien écrire', async () => {
    const db = await setup();
    await expect(saveProfile(db, { ...base, nickname: '' }, jpeg(1))).rejects.toMatchObject({
      code: 'profile.invalid',
      params: { detail: 'nickname' },
    });
    expect(await getProfile(db)).toBeNull();
    expect(await mediaCount(db)).toBe(0);
  });

  it('remplace la photo et supprime l’ancienne', async () => {
    const db = await setup();
    const first = await saveProfile(db, base, jpeg(1));
    const second = await saveProfile(db, base, jpeg(2));
    expect(second.avatar_media_id).not.toBe(first.avatar_media_id);
    expect(await mediaCount(db)).toBe(1);
  });

  it('garde la photo si rien n’est demandé, la retire sur demande', async () => {
    const db = await setup();
    const withPhoto = await saveProfile(db, base, jpeg(1));
    const kept = await saveProfile(db, { ...base, phrase: 'Un pas après l’autre' });
    expect(kept.avatar_media_id).toBe(withPhoto.avatar_media_id);
    const removed = await saveProfile(db, base, null);
    expect(removed.avatar_media_id).toBeNull();
    expect(await mediaCount(db)).toBe(0);
  });

  it('réutilise une photo identique au lieu de la dupliquer', async () => {
    const db = await setup();
    const a = await saveProfile(db, base, jpeg(7));
    const b = await saveProfile(db, base, jpeg(7));
    expect(b.avatar_media_id).toBe(a.avatar_media_id);
    expect(await mediaCount(db)).toBe(1);
  });

  it('n’écrit rien si une partie échoue (photo et profil ensemble)', async () => {
    const db = await setup();
    await saveProfile(db, base);
    // Le type d'image invalide est refusé par la base : la transaction entière doit être annulée.
    const bad = { ...jpeg(9), mime: 'image/gif' } as unknown as NewMedia;
    await expect(saveProfile(db, { ...base, nickname: 'Nouveau' }, bad)).rejects.toThrow();
    expect(await getProfile(db)).toMatchObject({ nickname: 'JC', avatar_media_id: null });
    expect(await mediaCount(db)).toBe(0);
  });
});
