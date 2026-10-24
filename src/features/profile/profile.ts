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

/** Règles de validation, champ par champ, testées séparément de l'interface. */
export function validateProfile(input: ProfileInput): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};
  const nick = input.nickname.trim();
  if (nick.length < 1) errors.nickname = 'Le pseudo est obligatoire : il sert à te saluer.';
  else if ([...nick].length > PROFILE_LIMITS.nickname) errors.nickname = `Le pseudo fait au plus ${PROFILE_LIMITS.nickname} caractères.`;
  if ([...input.firstName.trim()].length > PROFILE_LIMITS.name)
    errors.firstName = `Le prénom fait au plus ${PROFILE_LIMITS.name} caractères.`;
  if ([...input.lastName.trim()].length > PROFILE_LIMITS.name) errors.lastName = `Le nom fait au plus ${PROFILE_LIMITS.name} caractères.`;
  if ([...(input.phrase ?? '').trim()].length > PROFILE_LIMITS.phrase)
    errors.phrase = `La phrase personnelle fait au plus ${PROFILE_LIMITS.phrase} caractères.`;
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
export async function saveProfile(db: Database, input: ProfileInput, photo?: PhotoChange, clock: Clock = systemClock): Promise<Profile> {
  const errors = Object.values(validateProfile(input));
  if (errors.length) throw new Error(errors.join(' '));
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

  await db.transaction(statements);
  return profile;
}
