import { useState } from 'react';
import type { Database } from '../data/database';
import { PButton } from '../design-system/components';
import { ProfileForm } from '../features/profile/ProfileForm';
import type { Profile } from '../features/profile/profile';

/** Onboarding : étape 1 (bienvenue) puis étape 2 (profil local, sans compte en ligne). */
export function Welcome({ db, onDone }: { db: Database; onDone: (p: Profile) => void }) {
  const [step, setStep] = useState<'hello' | 'profile'>('hello');

  if (step === 'hello') {
    return (
      <main className="p-welcome">
        <img className="p-welcome__mark" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="72" height="72" />
        <h1 className="p-welcome__title">PISTIS</h1>
        <p className="p-signature">Organise ta vie. Développe ton potentiel. Construis ton avenir.</p>
        <p className="p-subtle">
          Bienvenue sur PISTIS. Un espace pour organiser ta vie, suivre tes progrès et construire ton avenir. Tout reste sur ton appareil :
          pas de compte, pas d’e-mail, pas de cloud.
        </p>
        <div>
          <PButton onClick={() => setStep('profile')}>Commencer</PButton>
        </div>
      </main>
    );
  }

  return (
    <main className="p-page">
      <div>
        <p className="p-logo">PISTIS</p>
        <h1 className="p-greeting">Crée ton profil</h1>
        <p className="p-subtle">Quelques informations pour personnaliser ton espace. Tu pourras tout modifier plus tard.</p>
      </div>
      <ProfileForm
        db={db}
        profile={null}
        currentAvatar={null}
        submitLabel="Créer mon espace"
        onSaved={onDone}
        onCancel={() => setStep('hello')}
      />
    </main>
  );
}
