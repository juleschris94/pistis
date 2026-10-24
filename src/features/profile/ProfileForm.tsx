import { Camera } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Database, Statement } from '../../data/database';
import { PAvatar, PButton, PField, PFileButton, PMessage } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { processImage, type ProcessedImage } from '../media/imagePipeline';
import {
  PROFILE_LIMITS,
  saveProfile,
  validateProfile,
  type PhotoChange,
  type Profile,
  type ProfileField,
  type ProfileFieldError,
} from './profile';

interface Props {
  db: Database;
  profile: Profile | null;
  currentAvatar: Uint8Array | null;
  currentAvatarMime?: string;
  submitLabel: string;
  onSaved: (profile: Profile) => void;
  onCancel?: () => void;
  /** Écritures à faire dans la même transaction (ex. catégories choisies pendant l'accueil). */
  extraStatements?: Statement[];
}

const FIELD_IDS: Record<ProfileField, string> = { firstName: 'first', lastName: 'last', nickname: 'nick', phrase: 'phrase' };

/** Formulaire du profil local : utilisé à l'accueil et pour la modification. */
export function ProfileForm({ db, profile, currentAvatar, currentAvatarMime, submitLabel, onSaved, onCancel, extraStatements }: Props) {
  const { t, formatError, formatBytes } = useI18n();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [phrase, setPhrase] = useState(profile?.phrase ?? '');
  const [photo, setPhoto] = useState<ProcessedImage | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileField, ProfileFieldError>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = photo?.thumb ?? (removePhoto ? null : currentAvatar);
  const fieldError = (f: ProfileField) => {
    const e = fieldErrors[f];
    if (!e) return undefined;
    return e.code === 'required' ? t('profile.error.required') : t('profile.error.tooLong', { max: e.max });
  };

  async function onPickPhoto(file: File) {
    setError(null);
    setProcessing(true);
    try {
      setPhoto(await processImage(file));
      setRemovePhoto(false);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setProcessing(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || processing) return;
    const input = { firstName, lastName, nickname, phrase };
    const errors = validateProfile(input);
    setFieldErrors(errors);
    const first = (Object.keys(errors) as ProfileField[])[0];
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const change: PhotoChange = photo
        ? { mime: photo.mime, width: photo.width, height: photo.height, data: photo.data, thumb: photo.thumb }
        : removePhoto
          ? null
          : undefined;
      onSaved(await saveProfile(db, input, change, undefined, extraStatements));
    } catch (e) {
      setError(t('profile.saveFailed', { reason: formatError(e) }));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-card" noValidate aria-label={t('profile.form.label')}>
      <div className="p-row">
        <PAvatar image={preview} mime={photo ? 'image/jpeg' : currentAvatarMime} name={nickname || firstName} large />
        <div className="p-actions">
          <PFileButton
            id="photo"
            icon={Camera}
            label={processing ? t('profile.photo.processing') : preview ? t('profile.photo.change') : t('profile.photo.add')}
            accept="image/jpeg,image/png,image/webp"
            onFile={onPickPhoto}
          />
          {preview && (
            <PButton
              variant="ghost"
              onClick={() => {
                setPhoto(null);
                setRemovePhoto(true);
              }}
            >
              {t('profile.photo.remove')}
            </PButton>
          )}
        </div>
      </div>
      {photo && (
        <p className="p-subtle">
          {t('profile.photo.ready', {
            before: formatBytes(photo.originalBytes),
            after: formatBytes(photo.data.length),
            width: photo.width,
            height: photo.height,
          })}
        </p>
      )}
      <div className="p-grid-2 p-grid-2--fields">
        <PField
          id={FIELD_IDS.firstName}
          label={t('profile.firstName')}
          value={firstName}
          error={fieldError('firstName')}
          maxLength={PROFILE_LIMITS.name}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
        />
        <PField
          id={FIELD_IDS.lastName}
          label={t('profile.lastName')}
          value={lastName}
          error={fieldError('lastName')}
          maxLength={PROFILE_LIMITS.name}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
        />
      </div>
      <PField
        id={FIELD_IDS.nickname}
        label={t('profile.nickname')}
        hint={t('profile.nickname.hint', { max: PROFILE_LIMITS.nickname })}
        value={nickname}
        error={fieldError('nickname')}
        maxLength={PROFILE_LIMITS.nickname}
        required
        autoComplete="nickname"
        onChange={(e) => setNickname(e.target.value)}
      />
      <PField
        id={FIELD_IDS.phrase}
        label={t('profile.phrase')}
        hint={t('profile.phrase.hint')}
        value={phrase}
        error={fieldError('phrase')}
        maxLength={PROFILE_LIMITS.phrase}
        onChange={(e) => setPhrase(e.target.value)}
      />
      {error && <PMessage tone="error">{error}</PMessage>}
      <div className="p-actions">
        <PButton type="submit" disabled={busy || processing}>
          {busy ? t('common.saving') : submitLabel}
        </PButton>
        {onCancel && (
          <PButton variant="ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </PButton>
        )}
      </div>
    </form>
  );
}
