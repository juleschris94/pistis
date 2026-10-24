import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { PButton } from '../design-system/components';

/**
 * Mises à jour de PISTIS : la nouvelle version est téléchargée en arrière-plan, puis on DEMANDE
 * avant de l'activer. Un rechargement automatique pourrait faire perdre un formulaire en cours.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  // Le message « fonctionne hors ligne » est une simple information : il disparaît seul.
  useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const timer = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(timer);
  }, [offlineReady, needRefresh, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="p-banner" role="status">
      <p>{needRefresh ? 'Une nouvelle version de PISTIS est prête.' : 'PISTIS fonctionne maintenant sans Internet sur cet appareil.'}</p>
      <div className="p-actions">
        {needRefresh && <PButton onClick={() => void updateServiceWorker(true)}>Mettre à jour</PButton>}
        <PButton
          variant="ghost"
          onClick={() => {
            setNeedRefresh(false);
            setOfflineReady(false);
          }}
        >
          {needRefresh ? 'Plus tard' : 'OK'}
        </PButton>
      </div>
    </div>
  );
}
