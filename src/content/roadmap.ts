import type { CategoryId } from './categories';

/**
 * Jalon où chaque partie de PISTIS devient utilisable (voir le document d'architecture).
 * Affiché honnêtement dans l'application tant que la partie n'existe pas.
 */
export type Milestone = 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'P1';

/** Onglets encore à construire (Planning et Finances sont disponibles depuis la 0.3). */
export const TAB_MILESTONE = { tracking: 'M5' } as const satisfies Record<string, Milestone>;

export const CATEGORY_MILESTONE: Record<CategoryId, Milestone> = {
  projects: 'M2',
  finance: 'M4',
  habits: 'M5',
  admin: 'P1',
  housing: 'P1',
  family: 'P1',
};
