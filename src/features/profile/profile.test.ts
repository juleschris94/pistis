import { describe, expect, it } from 'vitest';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { getProfile, saveProfile, validateProfile } from './profile';

const clock = (t: number) => ({ now: () => t });

describe('profil local', () => {
  it('exige un pseudo', () => {
    expect(validateProfile({ firstName: 'Jules', lastName: 'Zobinou', nickname: '  ' })).toHaveLength(1);
    expect(validateProfile({ firstName: 'Jules', lastName: 'Zobinou', nickname: 'JC' })).toEqual([]);
  });

  it('crée puis modifie un profil unique', async () => {
    const db = await createMemoryDatabase();
    await migrate(db);
    expect(await getProfile(db)).toBeNull();

    const created = await saveProfile(db, { firstName: ' Jules ', lastName: 'Zobinou', nickname: 'JC' }, clock(100));
    expect(created.first_name).toBe('Jules');
    expect(created.created_at).toBe(100);

    await saveProfile(db, { firstName: 'Jules', lastName: 'Zobinou', nickname: 'Jules C.' }, clock(200));
    const rows = await db.all('SELECT * FROM profile');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nickname: 'Jules C.', created_at: 100, updated_at: 200 });
  });
});
