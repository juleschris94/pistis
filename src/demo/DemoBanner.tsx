import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n';
import { resetDemo } from './demoStore';

/** Bandeau toujours visible dans la version d'essai : on sait où l'on est et comment repartir de zéro. */
export function DemoBanner() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <aside className="p-demo" aria-label={t('demo.label')}>
      <div className="p-demo__row">
        <FlaskConical aria-hidden="true" />
        <strong>{t('demo.label')}</strong>
        <button type="button" className="p-demo__link" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? t('demo.less') : t('demo.more')}
        </button>
      </div>
      {open && (
        <div className="p-demo__body">
          <p>{t('demo.body')}</p>
          {confirming ? (
            <div className="p-demo__row">
              <span>{t('demo.reset.confirm')}</span>
              <button
                type="button"
                className="p-demo__link p-demo__link--danger"
                onClick={() => void resetDemo().then(() => location.reload())}
              >
                {t('demo.reset.yes')}
              </button>
              <button type="button" className="p-demo__link" onClick={() => setConfirming(false)}>
                {t('demo.reset.no')}
              </button>
            </div>
          ) : (
            <button type="button" className="p-demo__link p-demo__link--danger" onClick={() => setConfirming(true)}>
              {t('demo.reset')}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
