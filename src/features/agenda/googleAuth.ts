import { GOOGLE_CLIENT_ID } from '../../config';

/**
 * Connexion à Google Agenda depuis le navigateur, sans serveur PISTIS (OAuth 2.0, « client-side web app »).
 *
 * - Lecture seule (`calendar.readonly`) : PISTIS ne peut ni créer, ni modifier, ni supprimer d'événement.
 * - L'autorisation (« jeton ») vit une heure, dans la mémoire de l'onglet (sessionStorage) : jamais dans la base,
 *   jamais dans une sauvegarde. Ensuite, un aller-retour éclair chez Google la renouvelle.
 * - Ce mode est maintenu par Google pour les applications web sans serveur ; la version multi-utilisateurs
 *   passera par le relais PISTIS (voir docs/connecteurs.md).
 */

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_KEY = 'pistis-google-token';
const PENDING_KEY = 'pistis-google-pending';
const RESULT_KEY = 'pistis-google-result';

export interface GoogleToken {
  accessToken: string;
  expiresAt: number;
}

export type GoogleAuthResult = { ok: true } | { ok: false; error: string };

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function googleAvailable(): boolean {
  return Boolean(GOOGLE_CLIENT_ID) && import.meta.env.MODE !== 'hosted';
}

/** Adresse de retour : l'adresse exacte de l'application (ex. https://juleschris94.github.io/pistis/). */
export function redirectUri(loc: Pick<Location, 'origin' | 'pathname'> = location): string {
  return `${loc.origin}${loc.pathname}`;
}

export function authUrl(opts: { state: string; silent: boolean; redirect: string; clientId?: string }): string {
  const q = new URLSearchParams({
    client_id: opts.clientId ?? GOOGLE_CLIENT_ID,
    redirect_uri: opts.redirect,
    response_type: 'token',
    scope: GOOGLE_SCOPE,
    include_granted_scopes: 'true',
    state: opts.state,
  });
  if (opts.silent) q.set('prompt', 'none');
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

/** Part chez Google ; on revient sur l'écran d'où l'on est parti. */
export function startGoogleAuth(silent = false): void {
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  storage()?.setItem(PENDING_KEY, JSON.stringify({ state, returnTo: location.hash.startsWith('#/') ? location.hash : '#/planning' }));
  location.assign(authUrl({ state, silent, redirect: redirectUri() }));
}

/**
 * Lecture du retour de Google (« #access_token=…&state=… » ou « #error=… »), AVANT le démarrage du routeur.
 * Le jeton est retiré de l'adresse immédiatement. Fonction testable : elle reçoit l'adresse et le stockage.
 */
export function consumeOAuthRedirect(
  hash: string,
  store: Storage | null = storage(),
  now = Date.now(),
): { handled: boolean; returnTo?: string } {
  if (!hash || hash.startsWith('#/') || !/(access_token|error)=/.test(hash)) return { handled: false };
  const params = new URLSearchParams(hash.slice(1));
  const pending = readPending(store);
  store?.removeItem(PENDING_KEY);
  const returnTo = pending?.returnTo ?? '#/planning';
  let result: GoogleAuthResult;
  if (!pending || params.get('state') !== pending.state) result = { ok: false, error: 'state' };
  else if (params.get('error')) result = { ok: false, error: params.get('error') ?? 'unknown' };
  else if (!params.get('access_token') || !(params.get('scope') ?? GOOGLE_SCOPE).includes(GOOGLE_SCOPE))
    result = { ok: false, error: 'scope' };
  else {
    const token: GoogleToken = {
      accessToken: params.get('access_token')!,
      expiresAt: now + Math.max(60, Number(params.get('expires_in') ?? 3600)) * 1000,
    };
    store?.setItem(TOKEN_KEY, JSON.stringify(token));
    result = { ok: true };
  }
  store?.setItem(RESULT_KEY, JSON.stringify(result));
  return { handled: true, returnTo };
}

function readPending(store: Storage | null): { state: string; returnTo: string } | null {
  try {
    return JSON.parse(store?.getItem(PENDING_KEY) ?? 'null') as { state: string; returnTo: string } | null;
  } catch {
    return null;
  }
}

/** À appeler au démarrage : nettoie l'adresse si l'on revient de Google. */
export function handleOAuthRedirect(): void {
  const { handled, returnTo } = consumeOAuthRedirect(location.hash);
  if (handled) history.replaceState(null, '', `${location.pathname}${location.search}${returnTo}`);
}

/** Jeton encore valable (avec une minute de marge), sinon `null`. */
export function currentGoogleToken(store: Storage | null = storage(), now = Date.now()): GoogleToken | null {
  try {
    const token = JSON.parse(store?.getItem(TOKEN_KEY) ?? 'null') as GoogleToken | null;
    return token && token.expiresAt - 60_000 > now ? token : null;
  } catch {
    return null;
  }
}

/** Résultat du dernier retour de Google, lu une seule fois (pour afficher un message). */
export function takeGoogleAuthResult(store: Storage | null = storage()): GoogleAuthResult | null {
  const raw = store?.getItem(RESULT_KEY);
  store?.removeItem(RESULT_KEY);
  try {
    return raw ? (JSON.parse(raw) as GoogleAuthResult) : null;
  } catch {
    return null;
  }
}

export function forgetGoogleToken(store: Storage | null = storage()): void {
  store?.removeItem(TOKEN_KEY);
}
