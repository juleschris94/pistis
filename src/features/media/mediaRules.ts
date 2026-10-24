import type { ErrorCode, ErrorParams } from '../../core/errors';
/**
 * Règles pures sur les images (testables sans navigateur).
 * Le type est déterminé par les premiers octets du fichier, jamais par son extension.
 */
export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export const MEDIA_LIMITS = {
  /** Taille maximale acceptée en entrée, avant optimisation. */
  maxInputBytes: 10 * 1024 * 1024,
  /** Côté le plus long après optimisation. */
  maxSide: 2048,
  /** Côté le plus long de la miniature. */
  thumbSide: 320,
  /** Qualité JPEG (0 à 1). */
  jpegQuality: 0.85,
  /** Au-delà (≈ 50 mégapixels), le décodage risque de saturer la mémoire d'un téléphone. */
  maxPixels: 50_000_000,
};

export function sniffImageMime(bytes: Uint8Array): ImageMime | 'image/heic' | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 12 && ascii(b, 4, 8) === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1'].includes(ascii(b, 8, 12))) return 'image/heic';
  return null;
}

function ascii(b: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...b.subarray(start, end));
}

export type MediaCheck = { ok: true; mime: ImageMime } | { ok: false; code: ErrorCode; params?: ErrorParams };

export function checkImage(bytes: Uint8Array): MediaCheck {
  if (bytes.length === 0) return { ok: false, code: 'image.empty' };
  if (bytes.length > MEDIA_LIMITS.maxInputBytes)
    return { ok: false, code: 'image.tooHeavy', params: { max: MEDIA_LIMITS.maxInputBytes / 1024 / 1024 } };
  const mime = sniffImageMime(bytes);
  if (mime === 'image/heic') return { ok: false, code: 'image.heic' };
  if (!mime) return { ok: false, code: 'image.unsupported' };
  return { ok: true, mime };
}

/** Dimensions cibles en conservant les proportions, sans jamais agrandir. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
