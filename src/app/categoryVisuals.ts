import { Briefcase, HeartPulse, Home, PiggyBank, ScrollText, Users, type LucideIcon } from 'lucide-react';
import type { CategoryId } from '../content/categories';

/** Icône et couleur de chaque domaine (couleurs définies dans tokens.css). */
export const CATEGORY_VISUALS: Record<CategoryId, { icon: LucideIcon; color: string }> = {
  projects: { icon: Briefcase, color: 'var(--cat-projects)' },
  finance: { icon: PiggyBank, color: 'var(--cat-finance)' },
  habits: { icon: HeartPulse, color: 'var(--cat-habits)' },
  admin: { icon: ScrollText, color: 'var(--cat-admin)' },
  housing: { icon: Home, color: 'var(--cat-housing)' },
  family: { icon: Users, color: 'var(--cat-family)' },
};
