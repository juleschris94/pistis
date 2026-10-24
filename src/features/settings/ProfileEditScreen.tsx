import { useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { ProfileForm } from '../profile/ProfileForm';

export function ProfileEditScreen() {
  const { t } = useI18n();
  const { db, profile, avatar, avatarMime, reload } = useApp();
  const navigate = useNavigate();
  const close = () => navigate(ROUTES.settings);
  return (
    <>
      <PTopBar title={t('settings.editProfile')} back={ROUTES.settings} backLabel={t('common.back')} />
      <ProfileForm
        db={db}
        profile={profile}
        currentAvatar={avatar}
        currentAvatarMime={avatarMime}
        submitLabel={t('common.save')}
        onCancel={close}
        onSaved={() => {
          reload();
          close();
        }}
      />
    </>
  );
}
