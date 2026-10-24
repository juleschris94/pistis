/**
 * Vérifie, avant tout démarrage, que le navigateur peut faire tourner PISTIS correctement.
 * Fonction pure (les capacités sont passées en paramètre) : testable sans navigateur.
 */
export interface Capabilities {
  secureContext: boolean;
  worker: boolean;
  webAssembly: boolean;
  subtleCrypto: boolean;
  hostname: string;
}

export type EnvironmentProblem = { title: string; detail: string };

export function checkEnvironment(c: Capabilities): EnvironmentProblem | null {
  if (!c.secureContext) {
    return {
      title: 'Adresse non sécurisée',
      detail:
        `PISTIS a besoin d’une adresse sécurisée (https) pour stocker tes données et fonctionner hors ligne. ` +
        `L’adresse actuelle (${c.hostname}) ne l’est pas. Ouvre la version en ligne en https, ou PISTIS sur « localhost » depuis ton ordinateur.`,
    };
  }
  if (!c.worker || !c.webAssembly || !c.subtleCrypto) {
    return {
      title: 'Navigateur trop ancien',
      detail: 'Ce navigateur ne propose pas les fonctions dont PISTIS a besoin. Mets à jour Chrome, Edge, Firefox ou Safari.',
    };
  }
  return null;
}

export function readCapabilities(): Capabilities {
  return {
    secureContext: window.isSecureContext,
    worker: typeof Worker === 'function',
    webAssembly: typeof WebAssembly === 'object',
    subtleCrypto: Boolean(globalThis.crypto?.subtle),
    hostname: location.hostname,
  };
}
