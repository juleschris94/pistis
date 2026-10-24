/**
 * Copie de la base de démonstration dans IndexedDB (une seule entrée).
 * Toute erreur (navigation privée, stockage bloqué) est absorbée : la démo fonctionne alors en mémoire.
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

export async function loadDemoBytes(): Promise<{ available: boolean; bytes: Uint8Array | null }> {
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

export async function saveDemoBytes(bytes: Uint8Array): Promise<boolean> {
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

/** Efface la démonstration (base et thème mémorisé) pour repartir de zéro. */
export async function resetDemo(): Promise<void> {
  try {
    localStorage.removeItem('pistis-theme');
  } catch {
    // sans conséquence
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
