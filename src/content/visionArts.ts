/** Illustrations intégrées pour la Vision d'un projet (dessins vectoriels originaux, voir VisionArt.tsx). */
export const VISION_ARTS = ['summit', 'city', 'home', 'road', 'library', 'horizon'] as const;
export type VisionArtId = (typeof VISION_ARTS)[number];

export function isVisionArtId(value: unknown): value is VisionArtId {
  return typeof value === 'string' && (VISION_ARTS as readonly string[]).includes(value);
}
