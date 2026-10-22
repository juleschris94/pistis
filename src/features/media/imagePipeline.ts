import { checkImage, fitWithin, MEDIA_LIMITS, type ImageMime } from './mediaRules';

export interface ProcessedImage {
  mime: ImageMime;
  width: number;
  height: number;
  data: Uint8Array;
  thumb: Uint8Array;
  originalBytes: number;
}

/**
 * Chaîne de traitement navigateur : vérification → décodage → redimensionnement → ré-encodage.
 * Le ré-encodage par un canvas supprime toutes les métadonnées (EXIF, position GPS…).
 * L'orientation EXIF est appliquée avant suppression grâce à `imageOrientation: 'from-image'`.
 */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkImage(bytes);
  if (!check.ok) throw new Error(check.reason);

  const bitmap = await createImageBitmap(new Blob([bytes], { type: check.mime }), { imageOrientation: 'from-image' });
  // PNG garde la transparence ; JPEG et WebP sont ré-encodés en JPEG, le plus compatible.
  const outMime: ImageMime = check.mime === 'image/png' ? 'image/png' : 'image/jpeg';
  const main = fitWithin(bitmap.width, bitmap.height, MEDIA_LIMITS.maxSide);
  const small = fitWithin(bitmap.width, bitmap.height, MEDIA_LIMITS.thumbSide);
  const data = await encode(bitmap, main.width, main.height, outMime);
  const thumb = await encode(bitmap, small.width, small.height, 'image/jpeg');
  bitmap.close();
  return { mime: outMime, width: main.width, height: main.height, data, thumb, originalBytes: bytes.length };
}

async function encode(bitmap: ImageBitmap, width: number, height: number, mime: ImageMime): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible dans ce navigateur.');
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, mime === 'image/jpeg' ? MEDIA_LIMITS.jpegQuality : undefined),
  );
  if (!blob) throw new Error("Impossible d'encoder l'image.");
  return new Uint8Array(await blob.arrayBuffer());
}
