import { Bell, Coins, DatabaseBackup, Languages, LayoutGrid, Palette, Pencil, ShieldCheck } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { APP_VERSION } from '../../app/services';
import { PAvatar, PBadge, PButtonLink, PCard, PList, PListRow, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { freshnessText, useBackupFreshness } from '../backup/useBackupFreshness';

/** Profil et paramètres : point d'entrée depuis l'avatar. */
export function SettingsScreen() {
  const i18n = useI18n();
  const { t, tn } = i18n;
  const { profile, avatar, avatarMime, settings } = useApp();
  const freshness = useBackupFreshness();
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');

  return (
    <>
      <PTopBar title={t('settings.title')} back={ROUTES.home} backLabel={t('common.back')} />

      <PCard>
        <div className="p-row">
          <PAvatar image={avatar} mime={avatarMime} name={profile.nickname} large />
          <div className="p-stack p-stack--tight p-grow">
            <h2 className="p-heading">{profile.nickname}</h2>
            {fullName && <p className="p-subtle">{fullName}</p>}
            {profile.phrase && <p className="p-quote">« {profile.phrase} »</p>}
            <p className="p-caption">{t('settings.localProfile')}</p>
          </div>
        </div>
        <PButtonLink to={ROUTES.profileEdit} variant="secondary">
          <Pencil aria-hidden="true" />
          {t('settings.editProfile')}
        </PButtonLink>
      </PCard>

      <PList label={t('settings.title')}>
        <PListRow
          icon={LayoutGrid}
          color="var(--cat-projects)"
          title={t('settings.categories')}
          subtitle={tn('settings.categories.count', settings.categories.length)}
          to={ROUTES.categories}
        />
        <PListRow
          icon={Palette}
          color="var(--cat-admin)"
          title={t('settings.appearance')}
          subtitle={t(`theme.${settings.theme}`)}
          to={ROUTES.appearance}
        />
        <PListRow
          icon={Languages}
          color="var(--cat-habits)"
          title={t('settings.language')}
          subtitle={t(`language.${settings.language}`)}
          to={ROUTES.language}
        />
        <PListRow icon={Coins} color="var(--cat-finance)" title={t('settings.currency')} subtitle={t('settings.currency.eur')} />
        <PListRow
          icon={Bell}
          color="var(--cat-housing)"
          title={t('settings.notifications')}
          subtitle={t('settings.notifications.soon')}
          trailing={<PBadge>{t('common.soon')}</PBadge>}
        />
        <PListRow
          icon={DatabaseBackup}
          color="var(--cat-finance)"
          title={t('settings.backup')}
          subtitle={freshness ? freshnessText(i18n, freshness) : '…'}
          trailing={freshness && freshness.kind !== 'recent' ? <PBadge tone="attention">{t('common.toDo')}</PBadge> : undefined}
          to={ROUTES.backup}
        />
        <PListRow
          icon={ShieldCheck}
          color="var(--cat-family)"
          title={t('settings.privacy')}
          subtitle={t('settings.privacy.subtitle')}
          to={ROUTES.privacy}
        />
      </PList>

      <p className="p-footer">{t('settings.footer', { version: APP_VERSION })}</p>
    </>
  );
}
