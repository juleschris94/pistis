import { useState } from 'react';

/** La démonstration n'installe pas de service worker : rien à mettre à jour. */
export function useRegisterSW(_options?: unknown) {
  return {
    needRefresh: useState(false),
    offlineReady: useState(false),
    updateServiceWorker: async (_reload?: boolean) => {},
  };
}
