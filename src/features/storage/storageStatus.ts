/**
 * Stockage persistant du navigateur.
 * Sans cette autorisation, le navigateur peut effacer les données s'il manque d'espace.
 * Chrome l'accorde souvent automatiquement à une PWA installée ou très utilisée.
 */
export interface BrowserStorageStatus {
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
}

export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export async function readStorageStatus(): Promise<BrowserStorageStatus> {
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : undefined;
  return { persisted, usageBytes: estimate?.usage ?? null, quotaBytes: estimate?.quota ?? null };
}

export function formatBytes(n: number | null): string {
  if (n === null) return 'inconnu';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(1)} Go`;
}
