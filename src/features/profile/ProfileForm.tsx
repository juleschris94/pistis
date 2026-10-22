import { useState, type FormEvent } from 'react';
import type { Database } from '../../data/database';
import { PAvatar, PButton, PField, PMessage } from '../../design-system/components';
import { formatBytes } from '../storage/storageStatus';
import { processImage, type ProcessedImage } from '../media/imagePipeline';
import { deleteMediaIfUnused, insertMedia } from '../media/mediaRepository';
import { saveProfile, validateProfile, type Profile } from './profile';

interface Props {
  db: Database;
  profile: Profile | null;
  currentAvatar: Uint8Array | null;
  submitLabel: string;
  onSaved: (profile: Profile) => void;
}

/** Formulaire du profil local : utilisé à l'onboarding et pour la modification. */
export function ProfileForm({ db, profile, currentAvatar, submitLabel, onSaved }: Props) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [phrase, setPhrase] = useState(profile?.phrase ?? '');
  const [photo, setPhoto] = useState<ProcessedImage | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoInfo, setPhotoInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = photo?.thumb ?? (removePhoto ? null : currentAvatar);

  async function onPickPhoto(file: File | undefined) {
    setError(null);
    if (!file) return;
    try {
      const processed = await processImage(file);
      setPhoto(processed);
      setRemovePhoto(false);
      setPhotoInfo(
        `${formatBytes(processed.originalBytes)} → ${formatBytes(processed.data.length)}, ${processed.width}×${processed.height} px, métadonnées supprimées.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const input = { firstName, lastName, nickname, phrase };
    const errors = validateProfile(input);
    if (errors.length) return setError(errors.join(' '));
    setBusy(true);
    try {
      let avatarMediaId = profile?.avatar_media_id ?? null;
      const previous = avatarMediaId;
      if (photo) {
        avatarMediaId = await insertMedia(db, { mime: photo.mime, width: photo.width, height: photo.height, data: photo.data, thumb: photo.thumb });
      } else if (removePhoto) {
        avatarMediaId = null;
      }
      const saved = await saveProfile(db, { ...input, avatarMediaId });
      if (previous && previous !== avatarMediaId) await deleteMediaIfUnused(db, previous);
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-card" noValidate>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <PAvatar image={preview} name={nickname || firstName} large />
        <div className="p-actions">
          <label className="p-button p-button--secondary" style={{ display: 'inline-grid', placeItems: 'center' }}>
            {preview ? 'Changer la photo' : 'Ajouter une photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="p-visually-hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
          </label>
          {preview && (
            <PButton
              variant="secondary"
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
        <PField id="first" label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        <PField id="last" label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
      </div>
      <PField
        id="nick"
        label="Pseudo"
        hint="Utilisé pour te saluer. Obligatoire, 30 caractères maximum."
        value={nickname}
        maxLength={30}
        onChange={(e) => setNickname(e.target.value)}
      />
      <PField id="phrase" label="Phrase personnelle (facultatif)" value={phrase} maxLength={140} onChange={(e) => setPhrase(e.target.value)} />
      {error && <PMessage tone="error">{error}</PMessage>}
      <div className="p-actions">
        <PButton type="submit" disabled={busy}>
          {busy ? 'Enregistrement…' : submitLabel}
        </PButton>
      </div>
    </form>
  );
}
