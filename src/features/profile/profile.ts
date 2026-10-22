import { newId, systemClock, type Clock } from '../../core/ids';
import type { Database } from '../../data/database';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phrase: string;
  avatar_media_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  nickname: string;
  phrase?: string;
  avatarMediaId?: string | null;
}

/** Règles de validation du profil, testées séparément de l'interface. */
export function validateProfile(input: ProfileInput): string[] {
  const errors: string[] = [];
  const nick = input.nickname.trim();
  if (nick.length < 1) errors.push('Le pseudo est obligatoire : il sert à te saluer.');
  if (nick.length > 30) errors.push('Le pseudo fait au plus 30 caractères.');
  if (input.firstName.trim().length > 60) errors.push('Le prénom fait au plus 60 caractères.');
  if (input.lastName.trim().length > 60) errors.push('Le nom fait au plus 60 caractères.');
  if ((input.phrase ?? '').trim().length > 140) errors.push('La phrase personnelle fait au plus 140 caractères.');
  return errors;
}

/** Le profil est unique : une seule ligne, créée à l'onboarding. */
export async function getProfile(db: Database): Promise<Profile | null> {
  const rows = await db.all('SELECT * FROM profile LIMIT 1');
  return (rows[0] as unknown as Profile | undefined) ?? null;
}

export async function saveProfile(db: Database, input: ProfileInput, clock: Clock = systemClock): Promise<Profile> {
  const errors = validateProfile(input);
  if (errors.length) throw new Error(errors.join(' '));
  const existing = await getProfile(db);
  const now = clock.now();
  const values = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    nickname: input.nickname.trim(),
    phrase: (input.phrase ?? '').trim(),
    avatar_media_id: input.avatarMediaId === undefined ? existing?.avatar_media_id ?? null : input.avatarMediaId,
  };
  if (existing) {
    await db.run(
      'UPDATE profile SET first_name = ?, last_name = ?, nickname = ?, phrase = ?, avatar_media_id = ?, updated_at = ? WHERE id = ?',
      [values.first_name, values.last_name, values.nickname, values.phrase, values.avatar_media_id, now, existing.id],
    );
    return { ...existing, ...values, updated_at: now };
  }
  const profile: Profile = { id: newId(), ...values, created_at: now, updated_at: now };
  await db.run(
    'INSERT INTO profile (id, first_name, last_name, nickname, phrase, avatar_media_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [profile.id, profile.first_name, profile.last_name, profile.nickname, profile.phrase, profile.avatar_media_id, now, now],
  );
  return profile;
}
