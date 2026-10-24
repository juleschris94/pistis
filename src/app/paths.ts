/**
 * Plan de l'application. Routage par « # » (ex. …/#/profil) : fonctionne sur n'importe quel
 * hébergement statique, hors ligne, sans configuration serveur.
 */
export const ROUTES = {
  home: '/',
  projects: '/projets',
  projectNew: '/projets/nouveau',
  templates: '/projets/modeles',
  template: '/projets/modeles/:id',
  wizard: '/projets/creer',
  project: '/projets/:id',
  projectEdit: '/projets/:id/modifier',
  planning: '/planning',
  tracking: '/suivis',
  finance: '/finances',
  notifications: '/notifications',
  settings: '/profil',
  profileEdit: '/profil/modifier',
  categories: '/profil/categories',
  appearance: '/profil/apparence',
  language: '/profil/langue',
  backup: '/profil/sauvegardes',
  privacy: '/profil/confidentialite',
} as const;

export const projectPath = (id: string) => `/projets/${encodeURIComponent(id)}`;
export const projectEditPath = (id: string) => `/projets/${encodeURIComponent(id)}/modifier`;
export const templatePath = (id: string) => `/projets/modeles/${encodeURIComponent(id)}`;
export const wizardPath = (opts: { template?: string; idea?: string } = {}) => {
  const q = new URLSearchParams();
  if (opts.template) q.set('modele', opts.template);
  if (opts.idea) q.set('idee', opts.idea);
  const query = q.toString();
  return query ? `/projets/creer?${query}` : '/projets/creer';
};
