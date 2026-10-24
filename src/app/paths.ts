/**
 * Plan de l'application. Routage par « # » (ex. …/#/profil) : fonctionne sur n'importe quel
 * hébergement statique, hors ligne, sans configuration serveur.
 */
export const ROUTES = {
  home: '/',
  projects: '/projets',
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
