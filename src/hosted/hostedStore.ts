/**
 * Copie de la base de la version web hébergée dans IndexedDB (une seule entrée).
 * Toute erreur (navigation privée, stockage bloqué) est absorbée : la page fonctionne alors en mémoire.
 * Nom historique conservé : ce qui a été saisi dans la version d'essai, à la même adresse, est gardé.
 */
const DB_NAME = 'pistis-demo';
const STORE = 'files';
const KEY = 'database';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadHostedBytes(): Promise<{ available: boolean; bytes: Uint8Array | null }> {
  try {
    const idb = await open();
    const bytes = await new Promise<Uint8Array | null>((resolve, reject) => {
      const req = idb.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    idb.close();
    return { available: true, bytes };
  } catch {
    return { available: false, bytes: null };
  }
}

export async function saveHostedBytes(bytes: Uint8Array): Promise<boolean> {
  try {
    const idb = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(bytes, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    idb.close();
    return true;
  } catch {
    return false;
  }
}
