import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { PButton } from '../design-system/components';
import { useI18n } from '../i18n';

/**
 * Mises à jour de PISTIS : la nouvelle version est téléchargée en arrière-plan, puis on DEMANDE
 * avant de l'activer. Un rechargement automatique pourrait faire perdre un formulaire en cours.
 */
export function UpdateBanner({ inApp }: { inApp: boolean }) {
  const { t } = useI18n();
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

  // Pendant l'accueil, l'information « hors ligne » masquerait les boutons : seule une mise à jour est signalée.
  if (!needRefresh && (!offlineReady || !inApp)) return null;
  return (
    <div className={inApp ? 'p-banner p-banner--above-nav' : 'p-banner'} role="status">
      <p>{needRefresh ? t('update.ready') : t('update.offlineReady')}</p>
      <div className="p-actions">
        {needRefresh && <PButton onClick={() => void updateServiceWorker(true)}>{t('update.apply')}</PButton>}
        <PButton
          variant="ghost"
          onClick={() => {
            setNeedRefresh(false);
            setOfflineReady(false);
          }}
        >
          {needRefresh ? t('update.later') : t('update.ok')}
        </PButton>
      </div>
    </div>
  );
}
