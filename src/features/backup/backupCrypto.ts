/**
 * Chiffrement facultatif des sauvegardes, avec la cryptographie intégrée au navigateur (WebCrypto).
 *
 * Format d'un fichier chiffré :
 *   "PISTISENC1" (10 octets) | sel (16) | vecteur d'initialisation (12) | données chiffrées AES-256-GCM
 *
 * La clé est dérivée du mot de passe par PBKDF2-SHA-256 (600 000 itérations).
 * AES-GCM authentifie les données : un fichier modifié ou un mauvais mot de passe est refusé.
 * Note : le document d'architecture vise Argon2id à terme ; PBKDF2 est utilisé en M0 car il est
 * natif dans WebCrypto, sans dépendance supplémentaire.
 */
const MAGIC = new TextEncoder().encode('PISTISENC1');
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const PBKDF2_ITERATIONS = 600_000;

export function isEncrypted(bytes: Uint8Array): boolean {
  return bytes.length > MAGIC.length && MAGIC.every((b, i) => bytes[i] === b);
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBytes(
  plain: Uint8Array,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  if (password.length < 8) throw new Error('Le mot de passe de sauvegarde fait au moins 8 caractères.');
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, iterations);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain as BufferSource));
  const out = new Uint8Array(MAGIC.length + SALT_BYTES + IV_BYTES + cipher.length);
  out.set(MAGIC, 0);
  out.set(salt, MAGIC.length);
  out.set(iv, MAGIC.length + SALT_BYTES);
  out.set(cipher, MAGIC.length + SALT_BYTES + IV_BYTES);
  return out;
}

export async function decryptBytes(
  file: Uint8Array,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  if (!isEncrypted(file)) throw new Error("Ce fichier n'est pas une sauvegarde chiffrée.");
  const salt = file.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
  const iv = file.subarray(MAGIC.length + SALT_BYTES, MAGIC.length + SALT_BYTES + IV_BYTES);
  const cipher = file.subarray(MAGIC.length + SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt, iterations);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, cipher as BufferSource));
  } catch {
    throw new Error('Mot de passe incorrect ou fichier endommagé.');
  }
}
