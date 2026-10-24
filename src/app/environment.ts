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

export type EnvironmentProblem = { code: 'insecure'; hostname: string } | { code: 'outdated' };

export function checkEnvironment(c: Capabilities): EnvironmentProblem | null {
  if (!c.secureContext) return { code: 'insecure', hostname: c.hostname };
  if (!c.worker || !c.webAssembly || !c.subtleCrypto) return { code: 'outdated' };
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
