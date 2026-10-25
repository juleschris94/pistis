/**
 * Réglages de publication (pas des secrets : ils apparaissent de toute façon dans les adresses de connexion).
 *
 * GOOGLE_CLIENT_ID : identifiant de l'application « PISTIS » créée dans Google Cloud (type « Application Web »),
 * autorisée pour l'adresse de publication. Vide = synchronisation Google Agenda indisponible (affiché comme tel).
 * Peut être remplacé à la construction par la variable d'environnement VITE_GOOGLE_CLIENT_ID.
 */
const GOOGLE_CLIENT_ID_DEFAULT = '';

export const GOOGLE_CLIENT_ID: string = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? GOOGLE_CLIENT_ID_DEFAULT).trim();
