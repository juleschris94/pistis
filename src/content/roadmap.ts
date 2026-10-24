import type { CategoryId } from './categories';

/**
 * Jalon où chaque partie de PISTIS devient utilisable (voir le document d'architecture).
 * Affiché honnêtement dans l'application tant que la partie n'existe pas.
 */
export type Milestone = 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'P1';

export const TAB_MILESTONE = { projects: 'M2', planning: 'M3', finance: 'M4', tracking: 'M5' } as const satisfies Record<string, Milestone>;

export const CATEGORY_MILESTONE: Record<CategoryId, Milestone> = {
  projects: 'M2',
  finance: 'M4',
  habits: 'M5',
  admin: 'P1',
  housing: 'P1',
  family: 'P1',
};
