import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../core/hash';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate, MIGRATIONS } from '../../data/migrations';
import { getProfile, saveProfile } from '../profile/profile';
import {
  backupFileName,
  backupFreshness,
  exportBackup,
  lastExportAt,
  readBackup,
  recordExport,
  restoreBackup,
  restoreWithUndo,
  undoRestore,
} from './backup';

const FAST = 1_000; // itérations réduites pour la vitesse des tests uniquement
const clock = { now: () => Date.UTC(2026, 9, 23, 8, 0) };
const DAY = 86_400_000;
const photo = {
  mime: 'image/jpeg' as const,
  width: 2,
  height: 2,
  data: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]),
  thumb: new Uint8Array([9, 9]),
};

async function seededDb() {
  const db = await createMemoryDatabase();
  await migrate(db);
  const profile = await saveProfile(db, { firstName: 'Jules', lastName: 'Zobinou', nickname: 'JC' }, photo, clock);
  return { db, avatar: profile.avatar_media_id as string };
}

async function emptyDb(nickname = 'Autre') {
  const db = await createMemoryDatabase();
  await migrate(db);
  await saveProfile(db, { firstName: '', lastName: '', nickname });
  return db;
}

/** Réécrit une archive après modification, en recalculant les empreintes (simule un fichier forgé). */
async function rezip(entries: Record<string, Uint8Array>, edit: (m: Record<string, unknown>) => void = () => undefined) {
  const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json']));
  for (const path of Object.keys(manifest.files)) if (entries[path]) manifest.files[path] = await sha256Hex(entries[path]);
  edit(manifest);
  return zipSync({ ...entries, 'manifest.json': strToU8(JSON.stringify(manifest)) });
}

describe('export et restauration', () => {
  it('restaure à l’identique, image comprise, et n’écrit rien pendant l’export', async () => {
    const { db, avatar } = await seededDb();
    const { bytes, manifest } = await exportBackup(db, { appVersion: 'test', clock });
    expect(manifest.counts).toMatchObject({ profile: 1, media: 1, settings: 2, backup_log: 0 });
    expect(await lastExportAt(db)).toBeNull();

    const target = await emptyDb();
    await restoreBackup(target, await readBackup(bytes), clock);
    expect(await getProfile(target)).toMatchObject({ nickname: 'JC', avatar_media_id: avatar });
    const media = await target.all('SELECT data, thumb FROM media');
    expect(Array.from(media[0].data as Uint8Array)).toEqual([0xff, 0xd8, 0xff, 1, 2, 3]);
    expect(Array.from(media[0].thumb as Uint8Array)).toEqual([9, 9]);
    expect(await target.all("SELECT kind FROM backup_log WHERE kind = 'restore'")).toHaveLength(1);
  });

  it('permet d’annuler une restauration', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const target = await emptyDb('Avant');
    const safety = await restoreWithUndo(target, await readBackup(bytes), 'test', clock);
    expect(await getProfile(target)).toMatchObject({ nickname: 'JC' });
    await undoRestore(target, safety, clock);
    expect(await getProfile(target)).toMatchObject({ nickname: 'Avant' });
    expect(Number((await target.all('SELECT COUNT(*) AS n FROM media'))[0].n)).toBe(0);
  });

  it('enregistre la date de la dernière sauvegarde', async () => {
    const { db } = await seededDb();
    await recordExport(db, true, clock);
    expect(await lastExportAt(db)).toBe(clock.now());
  });

  it('restaure une sauvegarde d’une version plus ancienne (schéma v1)', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'ancienne', clock });
    const entries = unzipSync(bytes);
    const data = JSON.parse(new TextDecoder().decode(entries['data.json']));
    delete data.settings; // la table « settings » n'existait pas en v1
    entries['data.json'] = strToU8(JSON.stringify(data));
    const oldBackup = await rezip(entries, (m) => {
      m.schemaVersion = 1;
      delete (m.counts as Record<string, number>).settings;
    });

    const target = await emptyDb();
    await restoreBackup(target, await readBackup(oldBackup), clock);
    expect(await getProfile(target)).toMatchObject({ nickname: 'JC' });
    expect(await target.all("SELECT value FROM settings WHERE key = 'currency'")).toEqual([{ value: 'EUR' }]);
  });

  it('chaque migration qui crée des données sait mettre à niveau une sauvegarde', () => {
    // Garde-fou pour l'avenir : une migration qui insère des lignes doit fournir upgradeBackup.
    for (const m of MIGRATIONS) {
      if (m.statements.some((s) => /^\s*INSERT/i.test(s))) expect(m.upgradeBackup, `migration ${m.version}`).toBeTypeOf('function');
    }
  });
});

describe('chiffrement', () => {
  it('chiffre avec un mot de passe et refuse un mauvais mot de passe', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', password: 'motdepasse-solide', iterations: FAST, clock });
    expect(new TextDecoder().decode(bytes.subarray(0, 10))).toBe('PISTISENC1');
    expect(new TextDecoder().decode(bytes)).not.toContain('Zobinou');
    await expect(readBackup(bytes)).rejects.toMatchObject({ code: 'backup.needsPassword' });
    await expect(readBackup(bytes, 'mauvais-mot-de-passe', FAST)).rejects.toMatchObject({ code: 'backup.wrongPassword' });
    const parsed = await readBackup(bytes, 'motdepasse-solide', FAST);
    expect(parsed.encrypted).toBe(true);
    expect(parsed.tables.profile[0]).toMatchObject({ nickname: 'JC' });
  });

  it('refuse un mot de passe trop court', async () => {
    const { db } = await seededDb();
    await expect(exportBackup(db, { appVersion: 'test', password: 'court', iterations: FAST })).rejects.toMatchObject({
      code: 'backup.passwordTooShort',
      params: { min: 8 },
    });
  });

  it('détecte un fichier chiffré modifié', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', password: 'motdepasse-solide', iterations: FAST, clock });
    bytes[bytes.length - 5] ^= 0xff;
    await expect(readBackup(bytes, 'motdepasse-solide', FAST)).rejects.toMatchObject({ code: 'backup.wrongPassword' });
  });
});

describe('fichiers invalides ou piégés', () => {
  it('détecte une donnée altérée et ne touche pas à la base', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    entries['data.json'] = strToU8(new TextDecoder().decode(entries['data.json']).replace('JC', 'XX'));
    await expect(readBackup(zipSync(entries))).rejects.toMatchObject({ code: 'backup.alteredFile' });
    expect(await getProfile(db)).toMatchObject({ nickname: 'JC' });
  });

  it('refuse ce qui n’est pas une sauvegarde PISTIS', async () => {
    await expect(readBackup(new Uint8Array())).rejects.toMatchObject({ code: 'backup.empty' });
    await expect(readBackup(new Uint8Array([1, 2, 3, 4]))).rejects.toMatchObject({ code: 'backup.unreadable' });
    const foreign = zipSync({ 'manifest.json': strToU8(JSON.stringify({ format: 'autre' })) });
    await expect(readBackup(foreign)).rejects.toMatchObject({ code: 'backup.notPistis' });
  });

  it('refuse un manifeste incomplet sans planter', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    const broken = await rezip(entries, (m) => delete m.files);
    await expect(readBackup(broken)).rejects.toMatchObject({ code: 'backup.incompleteManifest' });
  });

  it('refuse un fichier inattendu dans l’archive (chemin piégé)', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    await expect(readBackup(zipSync({ ...entries, '../../evil.js': strToU8('alert(1)') }))).rejects.toMatchObject({
      code: 'backup.unexpectedFile',
    });
  });

  it('refuse des valeurs de type inattendu, même avec des empreintes valides', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    const data = JSON.parse(new TextDecoder().decode(entries['data.json']));
    data.profile[0].nickname = { piège: true };
    entries['data.json'] = strToU8(JSON.stringify(data));
    await expect(readBackup(await rezip(entries))).rejects.toMatchObject({
      code: 'backup.invalidRow',
      params: { detail: 'profile.nickname' },
    });
  });

  it('refuse une colonne inconnue du schéma', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const entries = unzipSync(bytes);
    const data = JSON.parse(new TextDecoder().decode(entries['data.json']));
    data.profile[0].colonne_fantome = 'x';
    entries['data.json'] = strToU8(JSON.stringify(data));
    const target = await emptyDb();
    await expect(restoreBackup(target, await readBackup(await rezip(entries)))).rejects.toMatchObject({ code: 'backup.unknownColumns' });
    expect(await getProfile(target)).toMatchObject({ nickname: 'Autre' });
  });

  it('refuse une sauvegarde issue d’une version plus récente', async () => {
    const { db } = await seededDb();
    const { bytes } = await exportBackup(db, { appVersion: 'test', clock });
    const newer = await rezip(unzipSync(bytes), (m) => (m.schemaVersion = 99));
    await expect(readBackup(newer)).rejects.toMatchObject({ code: 'backup.newerVersion' });
  });
});

describe('rappels et nommage', () => {
  it('nomme le fichier avec la date locale', () => {
    expect(backupFileName(new Date(2026, 9, 23, 0, 30))).toBe('pistis-sauvegarde-2026-10-23.pistis');
  });

  it('calcule l’âge de la dernière sauvegarde', () => {
    const now = Date.UTC(2026, 9, 24, 12);
    expect(backupFreshness(null, now)).toEqual({ kind: 'never' });
    expect(backupFreshness(now - 2 * 3_600_000, now)).toEqual({ kind: 'recent', days: 0 });
    expect(backupFreshness(now - 13 * DAY, now)).toEqual({ kind: 'recent', days: 13 });
    expect(backupFreshness(now - 14 * DAY, now)).toEqual({ kind: 'due', days: 14 });
    expect(backupFreshness(now + DAY, now)).toEqual({ kind: 'recent', days: 0 }); // horloge décalée
  });
});
