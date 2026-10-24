import { BellOff } from 'lucide-react';
import { useState } from 'react';
import { ROUTES } from '../../app/paths';
import { PCard, PEmpty, PSegmented, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';

/**
 * Centre de notifications. La boîte de réception et ses règles arrivent au jalon M6 ;
 * l'écran existe déjà pour que la cloche mène quelque part d'honnête.
 */
export function NotificationsScreen() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  return (
    <>
      <PTopBar title={t('notifications.title')} back={ROUTES.home} backLabel={t('common.back')} />
      <PSegmented
        label={t('notifications.filter')}
        options={[
          { value: 'all', label: t('notifications.all') },
          { value: 'unread', label: t('notifications.unread') },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <PCard>
        <PEmpty icon={BellOff} title={t('notifications.empty.title')}>
          <p className="p-subtle">{t('notifications.empty.body')}</p>
        </PEmpty>
      </PCard>
    </>
  );
}
