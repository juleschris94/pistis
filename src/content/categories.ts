/**
 * Les six domaines de vie proposés à l'accueil (« Quels sont tes principaux besoins ? »).
 * Modifier un libellé : src/i18n (clés `category.<id>`). Modifier une couleur : tokens.css (`--cat-*`).
 */
export const CATEGORY_IDS = ['projects', 'finance', 'habits', 'admin', 'housing', 'family'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Onglet de l'application où vit chaque domaine. */
export const CATEGORY_TAB: Record<CategoryId, 'projects' | 'finance' | 'tracking'> = {
  projects: 'projects',
  finance: 'finance',
  habits: 'tracking',
  admin: 'tracking',
  housing: 'tracking',
  family: 'tracking',
};

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}
