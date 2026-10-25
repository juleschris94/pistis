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
  financeImport: '/finances/importer',
  transactions: '/finances/operations',
  account: '/finances/comptes/:id',
  notifications: '/notifications',
  settings: '/profil',
  profileEdit: '/profil/modifier',
  categories: '/profil/categories',
  appearance: '/profil/apparence',
  language: '/profil/langue',
  backup: '/profil/sauvegardes',
  privacy: '/profil/confidentialite',
  connectors: '/profil/connecteurs',
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
export const accountPath = (id: string) => `/finances/comptes/${encodeURIComponent(id)}`;
export const transactionsPath = (accountId?: string) =>
  accountId ? `/finances/operations?compte=${encodeURIComponent(accountId)}` : '/finances/operations';
