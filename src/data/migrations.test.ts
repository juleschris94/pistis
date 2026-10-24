import { describe, expect, it } from 'vitest';
import { createMemoryDatabase } from './memoryDatabase';
import { CURRENT_SCHEMA_VERSION, getSchemaVersion, migrate, MIGRATIONS } from './migrations';

describe('migrations', () => {
  it('amène une base vide à la dernière version', async () => {
    const db = await createMemoryDatabase();
    expect(await getSchemaVersion(db)).toBe(0);
    expect(await migrate(db)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await getSchemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("n'applique rien de plus au second lancement", async () => {
    const db = await createMemoryDatabase();
    await migrate(db);
    expect(await migrate(db)).toEqual([]);
  });

  it('migre une base v1 existante vers v2 sans perdre ses données', async () => {
    const db = await createMemoryDatabase();
    await db.transaction([...MIGRATIONS[0].statements.map((sql) => ({ sql })), { sql: 'PRAGMA user_version = 1' }]);
    await db.run("INSERT INTO profile (id, nickname, created_at, updated_at) VALUES ('p1', 'JC', 1, 1)");
    expect(await migrate(db)).toEqual([2, 3]);
    const rows = await db.all('SELECT nickname FROM profile');
    expect(rows).toEqual([{ nickname: 'JC' }]);
    expect(await db.all("SELECT value FROM settings WHERE key = 'currency'")).toEqual([{ value: 'EUR' }]);
  });

  it('refuse une base plus récente que l’application', async () => {
    const db = await createMemoryDatabase();
    await db.run(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION + 1}`);
    await expect(migrate(db)).rejects.toMatchObject({ code: 'db.newerSchema' });
  });

  it('annule entièrement une transaction en échec', async () => {
    const db = await createMemoryDatabase();
    await migrate(db);
    await expect(
      db.transaction([
        { sql: "INSERT INTO settings (key, value) VALUES ('a', '1')" },
        { sql: "INSERT INTO settings (key, value) VALUES ('a', '2')" }, // clé en double → échec
      ]),
    ).rejects.toThrow();
    expect(await db.all("SELECT * FROM settings WHERE key = 'a'")).toEqual([]);
  });
});
