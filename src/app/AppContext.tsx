import { createContext, useContext } from 'react';
import type { Database } from '../data/database';
import type { Profile } from '../features/profile/profile';
import type { Settings } from '../features/settings/settings';

/** Données partagées par tous les écrans une fois l'espace ouvert. */
export interface AppData {
  db: Database;
  profile: Profile;
  avatar: Uint8Array | null;
  avatarMime: string;
  settings: Settings;
  /** Recharge le profil et les réglages après une modification. */
  reload: () => void;
  /** Augmente à chaque rechargement : les écrans s'en servent pour relire leurs données. */
  version: number;
  /** Moment d'ouverture de l'application (pour savoir si le profil a survécu à un redémarrage). */
  sessionStart: number;
}

export const AppContext = createContext<AppData | null>(null);

export function useApp(): AppData {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp() utilisé hors de l’espace ouvert.');
  return value;
}
