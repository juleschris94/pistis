import { handleOAuthRedirect } from '../features/agenda/googleAuth';

/**
 * Module importé EN PREMIER par main.tsx : au retour de Google, l'adresse contient l'autorisation
 * (« #access_token=… »). On la lit et on nettoie l'adresse avant que le routeur ne la lise.
 */
handleOAuthRedirect();
