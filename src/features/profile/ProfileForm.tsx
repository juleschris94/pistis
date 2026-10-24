import { useState, type FormEvent } from 'react';
import type { Database } from '../../data/database';
import { PAvatar, PButton, PField, PFileButton, PMessage } from '../../design-system/components';
import { processImage, type ProcessedImage } from '../media/imagePipeline';
import { formatBytes } from '../storage/storageStatus';
import { PROFILE_LIMITS, saveProfile, validateProfile, type PhotoChange, type Profile, type ProfileField } from './profile';

interface Props {
  db: Database;
  profile: Profile | null;
  currentAvatar: Uint8Array | null;
  submitLabel: string;
  onSaved: (profile: Profile) => void;
  onCancel?: () => void;
}

const FIELD_IDS: Record<ProfileField, string> = { firstName: 'first', lastName: 'last', nickname: 'nick', phrase: 'phrase' };

/** Formulaire du profil local : utilisé à l'onboarding et pour la modification. */
export function ProfileForm({ db, profile, currentAvatar, submitLabel, onSaved, onCancel }: Props) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [phrase, setPhrase] = useState(profile?.phrase ?? '');
  const [photo, setPhoto] = useState<ProcessedImage | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoInfo, setPhotoInfo] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = photo?.thumb ?? (removePhoto ? null : currentAvatar);

  async function onPickPhoto(file: File) {
    setError(null);
    setProcessing(true);
    try {
      const processed = await processImage(file);
      setPhoto(processed);
      setRemovePhoto(false);
      setPhotoInfo(
        `Photo prête : ${formatBytes(processed.originalBytes)} → ${formatBytes(processed.data.length)}, ${processed.width}×${processed.height} px, métadonnées supprimées.`,
      );
    } catch (e) {
      setError((e as Error).message);
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
      onSaved(await saveProfile(db, input, change));
    } catch (e) {
      setError(`L’enregistrement a échoué, rien n’a été modifié. ${(e as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-card" noValidate aria-label="Profil">
      <div className="p-row">
        <PAvatar image={preview} name={nickname || firstName} large />
        <div className="p-actions">
          <PFileButton
            id="photo"
            label={processing ? 'Préparation…' : preview ? 'Changer la photo' : 'Ajouter une photo'}
            accept="image/jpeg,image/png,image/webp"
            onFile={onPickPhoto}
          />
          {preview && (
            <PButton
              variant="ghost"
              onClick={() => {
                setPhoto(null);
                setRemovePhoto(true);
                setPhotoInfo(null);
              }}
            >
              Retirer
            </PButton>
          )}
        </div>
      </div>
      {photoInfo && <p className="p-subtle">{photoInfo}</p>}
      <div className="p-grid-2">
        <PField
          id={FIELD_IDS.firstName}
          label="Prénom"
          value={firstName}
          error={fieldErrors.firstName}
          maxLength={PROFILE_LIMITS.name}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
        />
        <PField
          id={FIELD_IDS.lastName}
          label="Nom"
          value={lastName}
          error={fieldErrors.lastName}
          maxLength={PROFILE_LIMITS.name}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
        />
      </div>
      <PField
        id={FIELD_IDS.nickname}
        label="Pseudo"
        hint={`Utilisé pour te saluer. Obligatoire, ${PROFILE_LIMITS.nickname} caractères maximum.`}
        value={nickname}
        error={fieldErrors.nickname}
        maxLength={PROFILE_LIMITS.nickname}
        required
        autoComplete="nickname"
        onChange={(e) => setNickname(e.target.value)}
      />
      <PField
        id={FIELD_IDS.phrase}
        label="Phrase personnelle (facultatif)"
        hint="Une phrase qui te motive, affichée sous ton prénom."
        value={phrase}
        error={fieldErrors.phrase}
        maxLength={PROFILE_LIMITS.phrase}
        onChange={(e) => setPhrase(e.target.value)}
      />
      {error && <PMessage tone="error">{error}</PMessage>}
      <div className="p-actions">
        <PButton type="submit" disabled={busy || processing}>
          {busy ? 'Enregistrement…' : submitLabel}
        </PButton>
        {onCancel && (
          <PButton variant="ghost" onClick={onCancel} disabled={busy}>
            Annuler
          </PButton>
        )}
      </div>
    </form>
  );
}
