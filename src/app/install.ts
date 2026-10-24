import { useSyncExternalStore } from 'react';

/**
 * Installation de PISTIS comme application (écran d'accueil du téléphone, menu Démarrer).
 * Chrome et Edge proposent un événement `beforeinstallprompt` que l'on garde pour l'utiliser au bon moment,
 * depuis un bouton de PISTIS plutôt que depuis le menu du navigateur.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = 'installed' | 'available' | 'unavailable';

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** À appeler une fois au démarrage. */
export function watchInstallPrompt(): void {
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function snapshot(): InstallState {
  if (installed) return 'installed';
  return deferred ? 'available' : 'unavailable';
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    () => 'unavailable',
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome === 'accepted';
}
