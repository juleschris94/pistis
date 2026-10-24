import { PistisError } from '../../core/errors';
import { newId, systemClock, type Clock } from '../../core/ids';
import type { Database, Statement } from '../../data/database';
import { deleteMediaIfUnusedStatement, prepareMediaInsert, type NewMedia } from '../media/mediaRepository';

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
}

/**
 * Changement de photo demandé :
 * - `undefined` : on garde la photo actuelle ;
 * - `null` : on retire la photo ;
 * - une image : elle remplace la précédente.
 */
export type PhotoChange = NewMedia | null | undefined;

export const PROFILE_LIMITS = { nickname: 30, name: 60, phrase: 140 };

export type ProfileField = 'firstName' | 'lastName' | 'nickname' | 'phrase';

export type ProfileFieldError = { code: 'required' } | { code: 'tooLong'; max: number };

/** Règles de validation, champ par champ, testées séparément de l'interface. Renvoie des codes, pas des textes. */
export function validateProfile(input: ProfileInput): Partial<Record<ProfileField, ProfileFieldError>> {
  const errors: Partial<Record<ProfileField, ProfileFieldError>> = {};
  const length = (v: string | undefined) => [...(v ?? '').trim()].length;
  if (length(input.nickname) < 1) errors.nickname = { code: 'required' };
  else if (length(input.nickname) > PROFILE_LIMITS.nickname) errors.nickname = { code: 'tooLong', max: PROFILE_LIMITS.nickname };
  if (length(input.firstName) > PROFILE_LIMITS.name) errors.firstName = { code: 'tooLong', max: PROFILE_LIMITS.name };
  if (length(input.lastName) > PROFILE_LIMITS.name) errors.lastName = { code: 'tooLong', max: PROFILE_LIMITS.name };
  if (length(input.phrase) > PROFILE_LIMITS.phrase) errors.phrase = { code: 'tooLong', max: PROFILE_LIMITS.phrase };
  return errors;
}

/** Le profil est unique : une seule ligne, créée à l'onboarding. */
export async function getProfile(db: Database): Promise<Profile | null> {
  const rows = await db.all('SELECT * FROM profile ORDER BY created_at LIMIT 1');
  return (rows[0] as unknown as Profile | undefined) ?? null;
}

/**
 * Crée ou modifie le profil, photo comprise, en UNE transaction :
 * soit tout est enregistré (profil, nouvelle photo, suppression de l'ancienne), soit rien.
 */
export async function saveProfile(
  db: Database,
  input: ProfileInput,
  photo?: PhotoChange,
  clock: Clock = systemClock,
  /** Écritures à faire dans la même transaction (ex. réglages choisis pendant l'accueil). */
  extra: Statement[] = [],
): Promise<Profile> {
  const invalid = Object.keys(validateProfile(input));
  if (invalid.length) throw new PistisError('profile.invalid', { detail: invalid.join(',') });
  const existing = await getProfile(db);
  const now = clock.now();
  const statements: Statement[] = [];

  const previousAvatar = existing?.avatar_media_id ?? null;
  let avatar = previousAvatar;
  if (photo === null) avatar = null;
  else if (photo) {
    const prepared = await prepareMediaInsert(db, photo, now);
    statements.push(...prepared.statements);
    avatar = prepared.id;
  }

  const values = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    nickname: input.nickname.trim(),
    phrase: (input.phrase ?? '').trim(),
    avatar_media_id: avatar,
  };

  let profile: Profile;
  if (existing) {
    profile = { ...existing, ...values, updated_at: now };
    statements.push({
      sql: 'UPDATE profile SET first_name = ?, last_name = ?, nickname = ?, phrase = ?, avatar_media_id = ?, updated_at = ? WHERE id = ?',
      params: [values.first_name, values.last_name, values.nickname, values.phrase, avatar, now, existing.id],
    });
  } else {
    profile = { id: newId(), ...values, created_at: now, updated_at: now };
    statements.push({
      sql: 'INSERT INTO profile (id, first_name, last_name, nickname, phrase, avatar_media_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      params: [profile.id, profile.first_name, profile.last_name, profile.nickname, profile.phrase, avatar, now, now],
    });
  }
  if (previousAvatar && previousAvatar !== avatar) statements.push(deleteMediaIfUnusedStatement(previousAvatar));

  await db.transaction([...statements, ...extra]);
  return profile;
}
