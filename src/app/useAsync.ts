import { useEffect, useState } from 'react';

/**
 * Charge une valeur asynchrone (lecture en base…) et la recharge quand les dépendances changent.
 * Ignore les réponses arrivées après la fermeture de l'écran. `undefined` = pas encore chargé.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    load().then((result) => {
      if (alive) setValue(result);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
